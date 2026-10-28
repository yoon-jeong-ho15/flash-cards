import { accountKey, emptySnapshot, type CardInput, type Data, type DeckInput, type Draft, type Kind,
  type Preferences, type Snapshot, type State, type Storage, type Transport, type UserProfile } from './types';
import { hasContent } from './content';

const kinds: Kind[] = ['folders', 'decks', 'cards'];
const message = (error: unknown) => error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
const snapshotOf = (s: State): Snapshot => ({ folders: s.folders, decks: s.decks, cards: s.cards,
  outbox: s.outbox, revision: s.revision, preferences: s.preferences });

/** Serialized durable mutations. No UI or network write is acknowledged before local persistence. */
export class FlashcardStore {
  private state: State = { ...emptySnapshot(), user: null, ready: false, online: true,
    status: 'offline', error: null, lastSyncedAt: null, session: 0 };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private running: Promise<void> | null = null;
  private pullRequested = false;
  constructor(private storage: Storage, private transport: Transport, private uuid: () => string) {}
  getState = () => this.state;
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
          revision: saved.revision, outbox: saved.outbox, preferences: saved.preferences || {}, ready: true });
      } catch (error) { this.publish({ error: message(error) }); throw error; }
    }).then(() => { void this.sync(); });
  };
  setOnline = (online: boolean) => {
    this.publish({ online, ...(!online ? { status: 'offline' as const } : {}) });
    if (online) void this.sync();
  };
  private canSync() { return this.state.ready && this.state.online && this.transport.available && Boolean(this.state.user); }
  private mutate<T>(change: (s: State) => { data: Data; result: T }): Promise<T> {
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
        for (const item of data[kind]) if (old.get(item.id) !== item) outbox[`${kind}:${item.id}`] = { kind, id: item.id, revision, deleted: false };
        for (const id of old.keys()) if (!ids.has(id)) outbox[`${kind}:${id}`] = { kind, id, revision, deleted: true };
      }
      const next: Snapshot = { folders: data.folders, decks: data.decks, cards: data.cards,
        revision, outbox, preferences: before.preferences };
      try { await this.persist(next, before.user?.uid); }
      catch (error) { this.publish({ error: '기기 저장에 실패했습니다. 저장 공간을 확인해 주세요.' }); throw error; }
      this.publish({ ...next, error: null, status: this.canSync() ? 'syncing' : 'offline' });
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
  updateCard = (id: string, input: Partial<CardInput>) => this.mutate(s => {
    const card = s.cards.find(c => c.id === id);
    if (!card) throw new Error('카드를 찾을 수 없습니다.');
    const { id: _ignored, ...updates } = input;
    const next = { ...card, ...updates };
    if (!hasContent(next)) throw new Error('앞면 또는 뒷면에 내용을 입력해 주세요.');
    return { data: { ...s, cards: s.cards.map(c => c.id === id ? next : c),
      decks: s.decks.map(d => d.id === card.deckId ? { ...d, updatedAt: Date.now() } : d) }, result: undefined };
  });
  deleteCard = (id: string) => this.mutate(s => {
    const card = s.cards.find(c => c.id === id);
    return { data: { ...s, cards: s.cards.filter(c => c.id !== id),
      decks: s.decks.map(d => d.id === card?.deckId ? { ...d, updatedAt: Date.now() } : d) }, result: undefined };
  });
  setLearned = (id: string, learned: boolean) => this.mutate(s => ({ data: { ...s, cards: s.cards.map(c => c.id === id ? { ...c, learned } : c) }, result: undefined }));
  resetProgress = (id: string) => this.mutate(s => ({ data: { ...s, cards: s.cards.map(c => c.deckId === id ? { ...c, learned: false } : c) }, result: undefined }));
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
    if (!this.canSync()) { if (this.state.status !== 'error') this.publish({ status: 'offline' }); return Promise.resolve(); }
    const { session, user } = this.state;
    const uid = user!.uid;
    const active = () => session === this.state.session && uid === this.state.user?.uid;
    this.running = Promise.resolve().then(async () => {
      this.publish({ status: 'syncing', error: null });
      try {
        while (active() && this.canSync()) {
          const sent = snapshotOf(this.state);
          if (Object.keys(sent.outbox).length) {
            await this.transport.push(uid, sent, active);
            await this.serial(async () => {
              if (!active()) return;
              const next = snapshotOf(this.state);
              const outbox = { ...next.outbox };
              for (const [key, operation] of Object.entries(sent.outbox)) if (outbox[key]?.revision === operation.revision) delete outbox[key];
              await this.persist({ ...next, outbox }, uid);
              if (active()) this.publish({ outbox });
            });
            continue;
          }
          if (!this.pullRequested) break;
          this.pullRequested = false;
          const cloud = await this.transport.pull(uid);
          await this.serial(async () => {
            if (!active()) return;
            if (this.state.revision !== sent.revision) { this.pullRequested = true; return; }
            const next = { ...snapshotOf(this.state), ...cloud };
            await this.persist(next, uid);
            if (active()) this.publish(cloud);
          });
        }
        if (active()) this.publish({ status: this.canSync() ? 'synced' : 'offline', lastSyncedAt: Date.now() });
      } catch (error) { if (active()) this.publish({ status: this.state.online ? 'error' : 'offline', error: message(error) }); }
    }).finally(() => {
      this.running = null;
      if (this.canSync() && (!active() || (this.state.status !== 'error' &&
        (this.pullRequested || Object.keys(this.state.outbox).length > 0)))) void this.sync(!active());
    });
    return this.running;
  };
}
