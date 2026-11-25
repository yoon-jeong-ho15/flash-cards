import type { RecordSyncWrites } from '@flashcards/types';
import { accountKey, emptySnapshot, type Card, type CardInput, type Data, type DeckInput, type Draft, type Kind,
  type Operation, type Preferences, type Snapshot, type State, type Storage, type Transport, type UserProfile } from './types';
import { mergeCardImage, mapSources } from './imageSync';
import { hasContent } from './content';

const kinds: Kind[] = ['folders', 'decks', 'cards'];
const conflictMessage = '다른 탭 또는 기기에서 저장한 카드가 반영되었습니다. 충돌한 편집은 이 기기에 보관했습니다.';
const deleteRetryInterval = 5_000;
const maxDeleteRetryInterval = 300_000;
const message = (error: unknown) => error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
const snapshotOf = (s: State): Snapshot => ({ folders: s.folders, decks: s.decks, cards: s.cards,
  imageCache: s.imageCache, cardConflicts: s.cardConflicts, outbox: s.outbox, revision: s.revision, preferences: s.preferences });

/** Serialized durable mutations. No UI or network write is acknowledged before local persistence. */
export class FlashcardStore {
  private state: State = { ...emptySnapshot(), user: null, ready: false, online: true,
    status: 'offline', error: null, lastSyncedAt: null, session: 0 };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private running: Promise<void> | null = null;
  private pullRequested = false;
  private deleteRetry: ReturnType<typeof setTimeout> | undefined;
  private deleteRetryDelay = deleteRetryInterval;
  constructor(private storage: Storage, private transport: Transport, private uuid: () => string) {}
  getState = () => this.state;
  resolveImage = (url: string) => this.state.imageCache?.[url] || url;
  displayHTML = (html: string) => mapSources(html, this.resolveImage);
  canonicalHTML = (html: string) => {
    const urls = new Map(Object.entries(this.state.imageCache || {}).map(([url, data]) => [data, url]));
    return mapSources(html, value => urls.get(value) || value);
  };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(update: Partial<State>) { this.state = { ...this.state, ...update }; this.listeners.forEach(fn => fn()); }
  private serial<T>(job: () => Promise<T>): Promise<T> {
    const result = this.queue.then(job);
    this.queue = result.catch(() => {});
    return result;
  }
  private async persist(snapshot: Snapshot, uid?: string) { await this.storage.setItem(accountKey(uid), JSON.stringify(snapshot)); }
  switchUser = (user: UserProfile | null): Promise<void> => {
    this.publish({ ready: false });
    return this.serial(async () => {
      const session = this.state.session + 1;
      this.publish({ ...emptySnapshot(), user, session, ready: false, error: null, status: 'offline', lastSyncedAt: null });
      try {
        const raw = await this.storage.getItem(accountKey(user?.uid));
        const saved: Snapshot = raw ? JSON.parse(raw) : emptySnapshot();
        if (!kinds.every(k => Array.isArray(saved[k])) || !saved.outbox || !Number.isFinite(saved.revision)) {
          throw new Error('기기에 저장된 데이터를 읽을 수 없습니다. 저장소를 확인한 뒤 다시 시도해 주세요.');
        }
        this.publish({ folders: saved.folders, decks: saved.decks, cards: saved.cards,
          imageCache: saved.imageCache || {}, cardConflicts: saved.cardConflicts || {}, revision: saved.revision, outbox: saved.outbox, preferences: saved.preferences || {}, ready: true });
      } catch (error) { this.publish({ error: message(error) }); throw error; }
    }).then(() => { void this.sync(); });
  };
  setOnline = (online: boolean) => {
    this.publish({ online, ...(!online ? { status: 'offline' as const } : {}) });
    if (online) void this.sync();
    else clearTimeout(this.deleteRetry);
  };
  private canSync() { return this.state.ready && this.state.online && this.transport.available && Boolean(this.state.user); }
  private mutate<T>(change: (s: State) => { data: Data; result: T }, cardChange?: 'learned'): Promise<T> {
    const session = this.state.session;
    return this.serial(async () => {
      const before = this.state;
      if (!before.ready || session !== before.session) throw new Error('계정이 변경되었습니다. 다시 시도해 주세요.');
      const { data, result } = change(before);
      const revision = before.revision + 1;
      const outbox = { ...before.outbox };
      for (const kind of kinds) {
        if (data[kind] === before[kind]) continue;
        const old = new Map<string, unknown>(before[kind].map(item => [item.id, item]));
        const ids = new Set(data[kind].map(item => item.id));
        for (const item of data[kind]) {
          const previous = old.get(item.id);
          if (previous === item) continue;
          const key = `${kind}:${item.id}`;
          const queued = outbox[key];
          const operation: Operation = { kind, id: item.id, revision, deleted: false,
            writeState: queued ? queued.writeState : previous ? 'existing' : 'unsent' };
          if (kind === 'cards' && previous) {
            const oldCard = previous as Card;
            const card = item as Card;
            const sameContent = (Object.keys({ ...oldCard, ...card }) as (keyof Card)[])
              .every(key => key === 'learned' || Object.is(oldCard[key], card[key]));
            if (sameContent && oldCard.learned === card.learned && cardChange !== 'learned') continue;
            if (sameContent && (!queued || queued.learnedOnly)) operation.learnedOnly = true;
          }
          outbox[key] = operation;
        }
        for (const id of old.keys()) {
          if (ids.has(id)) continue;
          const key = `${kind}:${id}`;
          const queued = outbox[key];
          if (queued?.writeState === 'unsent') delete outbox[key];
          else outbox[key] = { kind, id, revision, deleted: true,
            writeState: queued && queued.writeState !== 'existing' ? 'attempted' : 'existing' };
        }
      }
      const next: Snapshot = { folders: data.folders, decks: data.decks, cards: data.cards,
        imageCache: before.imageCache, cardConflicts: before.cardConflicts, revision, outbox, preferences: before.preferences };
      try { await this.persist(next, before.user?.uid); }
      catch (error) { this.publish({ error: '기기 저장에 실패했습니다. 저장 공간을 확인해 주세요.' }); throw error; }
      this.publish({ ...next, error: null });
      return result;
    }).then(result => { void this.sync(false); return result; });
  }
  saveFolder = (id: string | undefined, title: string, description: string) => this.mutate(s => {
    if (!title.trim()) throw new Error('폴더 제목을 입력해 주세요.');
    if (id && !s.folders.some(f => f.id === id)) throw new Error('폴더를 찾을 수 없습니다.');
    const folderId = id || `folder-${this.uuid()}`;
    return { data: { ...s, folders: id ? s.folders.map(f => f.id === id ? { ...f, title: title.trim(), description: description.trim() } : f) :
      [...s.folders, { id: folderId, title: title.trim(), description: description.trim(), createdAt: Date.now(), userId: s.user?.uid }] }, result: folderId };
  });
  deleteFolder = (id: string, deleteContents = false) => this.mutate(s => {
    const ids = new Set(s.decks.filter(d => d.folderId === id).map(d => d.id));
    return { data: { ...s, folders: s.folders.filter(f => f.id !== id),
      decks: deleteContents ? s.decks.filter(d => !ids.has(d.id)) : s.decks.map(d => ids.has(d.id) ? { ...d, folderId: null, updatedAt: Date.now() } : d),
      cards: deleteContents ? s.cards.filter(c => !ids.has(c.deckId)) : s.cards }, result: undefined };
  });
  reorderCards = (deckId: string, ids: string[]) => this.mutate(s => {
    const own = s.cards.filter(card => card.deckId === deckId);
    const order = new Map(ids.map((id, index) => [id, index]));
    if (order.size !== ids.length || own.length !== ids.length || own.some(card => !order.has(card.id))) {
      throw new Error('카드 구성이 변경되었습니다. 순서 변경 화면을 다시 열어 주세요.');
    }
    return { data: { ...s,
      cards: s.cards.map(card => card.deckId === deckId ? { ...card, order: order.get(card.id)! } : card),
      decks: s.decks.map(deck => deck.id === deckId ? { ...deck, updatedAt: Date.now() } : deck),
    }, result: undefined };
  });
  saveDeck = (id: string | undefined, input: DeckInput, items: CardInput[]) => this.mutate(s => {
    if (!input.title.trim()) throw new Error('덱 제목을 입력해 주세요.');
    if (id && !s.decks.some(d => d.id === id)) throw new Error('덱을 찾을 수 없습니다. 다른 기기에서 삭제되었을 수 있습니다.');
    if (input.folderId && !s.folders.some(f => f.id === input.folderId)) throw new Error('선택한 폴더가 삭제되었습니다. 다른 폴더를 선택해 주세요.');
    const valid = items.filter(hasContent);
    if (!valid.length) throw new Error('내용이 있는 카드를 하나 이상 추가해 주세요.');
    const deckId = id || `deck-${this.uuid()}`;
    const now = Date.now();
    const previous = s.decks.find(d => d.id === deckId);
    const deck = { ...previous, ...input, id: deckId, title: input.title.trim(), description: input.description?.trim(),
      userId: s.user?.uid, folderId: input.folderId || null, createdAt: previous?.createdAt ?? now, updatedAt: now };
    const existing = new Map(s.cards.filter(c => c.deckId === deckId).map(c => [c.id, c]));
    const used = new Set<string>();
    const cards = valid.map((c, order) => {
      const cardId = c.id && !c.id.startsWith('temp-') && existing.has(c.id) ? c.id : `card-${this.uuid()}`;
      if (used.has(cardId)) throw new Error('중복된 카드가 있습니다. 편집기를 다시 열어 주세요.');
      used.add(cardId);
      return { ...c, id: cardId, deckId, userId: s.user?.uid, order,
        contentVersion: existing.get(cardId)?.contentVersion,
        learned: existing.get(cardId)?.learned ?? c.learned ?? false,
        backImageUrl: c.backImageUrl || c.imageUrl, imageUrl: c.backImageUrl || c.imageUrl };
    });
    return { data: { ...s, decks: previous ? s.decks.map(d => d.id === deckId ? deck : d) : [deck, ...s.decks],
      cards: [...s.cards.filter(c => c.deckId !== deckId), ...cards] }, result: deckId };
  });
  deleteDeck = (id: string) => this.mutate(s => ({ data: { ...s, decks: s.decks.filter(d => d.id !== id), cards: s.cards.filter(c => c.deckId !== id) }, result: undefined }));
  moveDeck = (id: string, folderId: string | null) => this.mutate(s => {
    if (folderId && !s.folders.some(f => f.id === folderId)) throw new Error('폴더를 찾을 수 없습니다.');
    return { data: { ...s, decks: s.decks.map(d => d.id === id ? { ...d, folderId, updatedAt: Date.now() } : d) }, result: undefined };
  });
  updateCard = (id: string, input: Partial<CardInput>, base?: Pick<Card, 'contentVersion'>) => this.mutate(s => {
    const card = s.cards.find(c => c.id === id);
    if (!card) throw new Error('카드를 찾을 수 없습니다.');
    if (base && base.contentVersion !== card.contentVersion) {
      throw new Error('카드가 다른 곳에서 변경되었습니다. 최신 카드를 다시 열어 주세요.');
    }
    const { id: _ignored, ...updates } = input;
    const next = { ...card, ...updates, contentVersion: card.contentVersion };
    if (!hasContent(next)) throw new Error('앞면 또는 뒷면에 내용을 입력해 주세요.');
    return { data: { ...s, cards: s.cards.map(c => c.id === id ? next : c),
      decks: s.decks.map(d => d.id === card.deckId ? { ...d, updatedAt: Date.now() } : d) }, result: undefined };
  }, Object.keys(input).length === 1 && typeof input.learned === 'boolean' ? 'learned' : undefined);
  deleteCard = (id: string) => this.mutate(s => {
    const card = s.cards.find(c => c.id === id);
    return { data: { ...s, cards: s.cards.filter(c => c.id !== id),
      decks: s.decks.map(d => d.id === card?.deckId ? { ...d, updatedAt: Date.now() } : d) }, result: undefined };
  });
  setLearned = (id: string, learned: boolean) => this.mutate(s => ({ data: { ...s, cards: s.cards.map(c => c.id === id ? { ...c, learned } : c) }, result: undefined }), 'learned');
  resetProgress = (id: string) => this.mutate(s => ({ data: { ...s, cards: s.cards.map(c => c.deckId === id ? { ...c, learned: false } : c) }, result: undefined }), 'learned');
  setPreferences = (update: Partial<Preferences>) => {
    const session = this.state.session;
    return this.serial(async () => {
      if (!this.state.ready || session !== this.state.session) return;
      const next = { ...snapshotOf(this.state), preferences: { ...this.state.preferences, ...update } };
      await this.persist(next, this.state.user?.uid);
      this.publish({ preferences: next.preferences });
    });
  };
  draftKey = (deckId?: string, folderId?: string) => `${accountKey(this.state.user?.uid)}:draft:${deckId || `new:${folderId || 'root'}`}`;
  readDraft = async (key: string): Promise<Draft | null> => { const raw = await this.storage.getItem(key); return raw ? JSON.parse(raw) : null; };
  writeDraft = (key: string, draft: Draft) => this.serial(() => this.storage.setItem(key, JSON.stringify(draft)));
  removeDraft = (key: string) => this.serial(() => this.storage.removeItem(key));

  sync = (pull = true): Promise<void> => {
    this.pullRequested ||= pull;
    if (this.running) return this.running;
    clearTimeout(this.deleteRetry);
    this.deleteRetry = undefined;
    if (!this.canSync()) { if (this.state.status !== 'error') this.publish({ status: 'offline' }); return Promise.resolve(); }
    const { session, user } = this.state;
    const uid = user!.uid;
    const active = () => session === this.state.session && uid === this.state.user?.uid;
    // Retry an absent, possibly created document on later syncs without blocking this one.
    const deferredDeletes = new Map<string, number>();
    const isDeferred = ([key, operation]: [string, Operation]) => deferredDeletes.get(key) === operation.revision;
    this.running = Promise.resolve().then(async () => {
      let didSync = false;
      let hadConflict = false;
      let pulling = false;
      try {
        // A previous timeout may still be recording its confirmed revisions.
        await this.transport.waitForWrites?.();
        while (active() && this.canSync()) {
          const snapshot = snapshotOf(this.state);
          let sent = deferredDeletes.size ? { ...snapshot,
            outbox: Object.fromEntries(Object.entries(snapshot.outbox).filter(entry => !isDeferred(entry))),
          } : snapshot;
          const pending = Object.keys(sent.outbox).length > 0;
          if (!pending && !this.pullRequested) break;
          if (this.state.status !== 'syncing') this.publish({ status: 'syncing', error: null });
          if (pending) {
            if (Object.values(sent.outbox).some(operation => operation.writeState === 'unsent')) {
              const prepared = await this.serial(async () => {
                if (!active() || !this.canSync() || snapshot.revision !== this.state.revision) return null;
                const latest = snapshotOf(this.state);
                const outbox = { ...latest.outbox };
                const sending = { ...sent.outbox };
                for (const [key, operation] of Object.entries(sent.outbox)) {
                  if (operation.writeState === 'unsent') {
                    sending[key] = outbox[key] = { ...operation, writeState: 'attempted' };
                  }
                }
                await this.persist({ ...latest, outbox }, uid);
                if (active()) this.publish({ outbox });
                return { ...sent, outbox: sending };
              });
              if (!prepared || !active()) continue;
              sent = prepared;
            }
            let recorded = false;
            const record: RecordSyncWrites = results => this.serial(async () => {
              recorded = true;
              const raw = await this.storage.getItem(accountKey(uid));
              const next: Snapshot = raw
                ? JSON.parse(raw)
                : (this.state.ready && this.state.user?.uid === uid ? snapshotOf(this.state) : emptySnapshot());
              if (!kinds.every(k => Array.isArray(next[k])) || !next.outbox || !Number.isFinite(next.revision)) {
                throw new Error('기기에 저장된 데이터를 읽을 수 없습니다. 저장소를 확인한 뒤 다시 시도해 주세요.');
              }
              const outbox = { ...next.outbox };
              let cards = next.cards;
              const baseConflicts = next.cardConflicts || {};
              let cardConflicts = baseConflicts;
              for (const result of results) {
                const { key, outcome } = result;
                const operation = sent.outbox[key];
                const current = outbox[key];
                if (!operation || !current) continue;
                if (outcome === 'not-sent') {
                  if (snapshot.outbox[key]?.writeState === 'unsent' && current.writeState === 'attempted') {
                    if (current.deleted) delete outbox[key];
                    else outbox[key] = { ...current, writeState: 'unsent' };
                  }
                  continue;
                }
                if (outcome === 'missing' && operation.deleted && operation.writeState !== 'existing') {
                  deferredDeletes.set(key, operation.revision);
                  continue;
                }
                if (operation.kind === 'cards' && !operation.deleted && !current.deleted) {
                  const card = cards.find(card => card.id === operation.id);
                  const base = sent.cards.find(card => card.id === operation.id)?.contentVersion;
                  if (card?.contentVersion !== base &&
                      (outcome === 'conflict' || outcome === 'missing' ||
                        (outcome === 'written' && result.contentVersion))) continue;
                  if (outcome === 'conflict') {
                    if (current.revision !== operation.revision || !card) continue;
                    cardConflicts = { ...cardConflicts, [card.id]: card };
                    cards = cards.map(item => item === card ? result.serverCard : item);
                  }
                  if (outcome === 'written' && result.contentVersion) {
                    cards = cards.map(item => item === card ? { ...item, contentVersion: result.contentVersion } : item);
                  }
                }
                if (outcome === 'missing' && !operation.deleted && !current.deleted && operation.kind === 'cards') {
                  if (current.revision === operation.revision || current.learnedOnly) {
                    cards = cards.filter(card => card.id !== operation.id);
                  } else {
                    const id = `card-${this.uuid()}`;
                    cards = cards.map(card => card.id === operation.id ? { ...card, id, contentVersion: undefined } : card);
                    outbox[`cards:${id}`] = { ...current, id, writeState: 'unsent' };
                  }
                  delete outbox[key];
                } else if (current.revision === operation.revision) delete outbox[key];
                else if (current.writeState === 'attempted' && !operation.deleted) {
                  outbox[key] = { ...current, writeState: 'existing' };
                }
              }
              await this.persist({ ...next, cards, outbox, cardConflicts }, uid);
              if (active()) hadConflict ||= cardConflicts !== baseConflicts;
              if (this.state.ready && this.state.user?.uid === uid) {
                this.publish({ cards, outbox, cardConflicts,
                  ...(active() && hadConflict && this.state.status === 'error' && { error: conflictMessage }) });
              }
            });
            const missing = await this.transport.push(uid, sent, active, image => this.serial(async () => {
              if (!active() || !this.state.ready) throw new Error('계정이 변경되었습니다.');
              const next = snapshotOf(this.state);
              const source = sent.cards.find(card => card.id === image.cardId);
              // Restrict replacement to fields present in the sent card. Merge into latest values.
              const cards = next.cards.map(card => {
                if (card.id !== image.cardId || !source) return card;
                return mergeCardImage(card, source, image.original, image.url);
              });
              const imageCache = { ...next.imageCache, [image.url]: image.original };
              await this.persist({ ...next, cards, imageCache }, uid);
              if (active()) this.publish({ cards, imageCache });
            }), record);
            if (!recorded) {
              const absent = new Set(missing ?? []);
              await record(Object.keys(sent.outbox).map(key => ({ key, outcome: absent.has(key) ? 'missing' : 'written' })));
            }
            if (!active()) break;
            didSync = true;
            continue;
          }
          this.pullRequested = false;
          pulling = true;
          const cloud = await this.transport.pull(uid);
          await this.serial(async () => {
            if (!active()) return;
            if (deferredDeletes.size) {
              for (const kind of kinds) {
                for (const item of cloud[kind]) deferredDeletes.delete(`${kind}:${item.id}`);
              }
            }
            if (!this.canSync() || this.state.revision !== sent.revision ||
                Object.entries(this.state.outbox).some(entry => !isDeferred(entry))) {
              this.pullRequested = true;
              return;
            }
            const next = { ...snapshotOf(this.state), ...cloud };
            await this.persist(next, uid);
            if (active()) {
              this.publish(cloud);
              didSync = true;
            }
          });
          pulling = false;
        }
        if (active()) {
          if (!this.canSync()) this.publish({ status: 'offline' });
          else if (hadConflict) this.publish({ status: 'error', error: conflictMessage });
          else if (deferredDeletes.size) this.publish({ status: 'pending' });
          else if (didSync) this.publish({ status: 'synced', lastSyncedAt: Date.now() });
        }
      } catch (error) {
        if (active()) {
          this.pullRequested ||= pulling;
          this.publish({ status: this.state.online ? 'error' : 'offline', error: message(error) });
        }
      }
    }).finally(() => {
      this.running = null;
      if (!active()) {
        this.deleteRetryDelay = deleteRetryInterval;
        if (this.canSync()) void this.sync();
      } else if (this.canSync() && this.state.status !== 'error') {
        if (this.pullRequested || Object.entries(this.state.outbox).some(entry => !isDeferred(entry))) {
          void this.sync(false);
        } else if (deferredDeletes.size) {
          // After bounded retries, keep the delete durable for the next normal sync.
          if (this.deleteRetryDelay <= maxDeleteRetryInterval) {
            this.deleteRetry = setTimeout(() => { if (active()) void this.sync(false); }, this.deleteRetryDelay);
            this.deleteRetryDelay *= 2;
          }
        } else this.deleteRetryDelay = deleteRetryInterval;
      }
    });
    return this.running;
  };
}
