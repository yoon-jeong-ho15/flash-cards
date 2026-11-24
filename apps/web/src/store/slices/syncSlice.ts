import { uploadDataImage } from '../../services/storageService';
import { cardDataImages, replaceCardImage } from '../../services/imageSync';
import { StateCreator } from 'zustand';
import { FlashcardStoreState, SyncSlice, EMPTY_PENDING_SYNC } from '../types';
import { flashcardService, sortCardsByOrder } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { acknowledge, enqueueChanges, hasPending } from '../syncQueue';
import { AccountSnapshot, readAccount, transactAccount, withAccountLock } from '../accountStorage';

export const createSyncSlice: StateCreator<FlashcardStoreState, [], [], SyncSlice> = (set, get) => {
  let running: Promise<void> | null = null;
  let pullRequested = false;
  let rerunRequested = false;
  const online = () => isFirebaseConfigured && navigator.onLine && Boolean(get().user);
  const message = (error: unknown) => error instanceof Error ? error.message : String(error);
  // Preserve references for unchanged entities. Editors keep their own input buffers and
  // still receive actual external content changes through their existing conflict detector.
  const publish = (saved: AccountSnapshot) => {
    const current = get();
    const reuse = <T extends { id: string }>(old: T[], next: T[]): T[] => {
      if (old === next) return old;
      const byId = new Map(old.map(item => [item.id, item]));
      const items = next.map(item => {
        const previous = byId.get(item.id);
        return previous && (previous === item || JSON.stringify(previous) === JSON.stringify(item)) ? previous : item;
      });
      return items.length === old.length && items.every((item, i) => item === old[i]) ? old : items;
    };
    set({ ...saved, folders: reuse(current.folders, saved.folders),
      decks: reuse(current.decks, saved.decks), cards: reuse(current.cards, saved.cards), storageError: null });
  };
  const sessionContext = () => {
    const { user, sessionVersion } = get();
    return { uid: user?.uid, active: () => get().sessionVersion === sessionVersion && get().user?.uid === user?.uid };
  };

  const run = (pull: boolean): Promise<void> => {
    pullRequested ||= pull;
    if (running) { rerunRequested = true; return running; }
    if (!online()) { set({ syncStatus: 'offline', isInitialSyncComplete: true }); return Promise.resolve(); }
    const { uid, active } = sessionContext();
    running = Promise.resolve().then(async () => {
      if (!active()) return;
      set({ syncStatus: 'syncing', syncError: null });
      try {
        // Hold the sync lock across network requests, but allow local durable edits
        // under the separate data lock. Closing a tab releases both browser locks.
        await withAccountLock(uid, 'sync', async () => {
          while (active() && online()) {
            const snapshot = await withAccountLock(uid, 'data', () => {
              const latest = readAccount(uid);
              if (active()) publish(latest);
              return latest;
            });
            if (!active()) return;
            // Also migrate unqueued legacy images, but never promote a progress-only
            // write into a full card write based on its cached images.
            const learnedOnly = new Set(snapshot.pendingSync.learnedOnlyCardIds);
            const refreshCards = new Set<string>();
            const images = new Set<string>();
            for (const card of snapshot.cards) {
              const sources = cardDataImages(card);
              if (learnedOnly.has(card.id)) {
                if (sources.length) refreshCards.add(card.id);
              } else {
                for (const source of sources) images.add(source);
              }
            }
            if (images.size) {
              for (const original of images) {
                if (!active()) return;
                const url = await uploadDataImage(original, uid!, active);
                await transactAccount(uid, latest => {
                  const progress = new Set(latest.pendingSync.learnedOnlyCardIds);
                  const cards = latest.cards.map(card => progress.has(card.id) ? card : replaceCardImage(card, original, url));
                  if (cards.every((card, i) => card === latest.cards[i])) return null;
                  const after = { ...latest, cards };
                  const mutationRevision = latest.mutationRevision + 1;
                  return { ...after, mutationRevision,
                    ...enqueueChanges(latest, after, latest.pendingSync, latest.pendingVersions, mutationRevision) };
                }, publish, active);
              }
              // Reload durable versions, including edits/deletes made during upload.
              continue;
            }
            if (hasPending(snapshot.pendingSync)) {
              await flashcardService.commitChanges(snapshot, uid!, active);
              if (!active()) return;
              // Refresh stale images before acknowledgement, otherwise the next
              // pass would treat them as unqueued legacy images and push the old card.
              const cloud = refreshCards.size ? await flashcardService.fetchAllData(uid!, true) : null;
              if (!active()) return;
              if (refreshCards.size && !cloud) throw new Error('최신 카드 내용을 확인할 수 없습니다. 다시 동기화해 주세요.');
              const remoteCards = cloud && new Map(cloud.cards.map(card => [card.id, card]));
              await transactAccount(uid, latest => {
                const cards = remoteCards ? latest.cards.flatMap(card => {
                  const token = `cards:${card.id}`;
                  if (!refreshCards.has(card.id) || latest.pendingVersions[token] !== snapshot.pendingVersions[token]) return [card];
                  const remote = remoteCards.get(card.id);
                  return remote ? [remote] : [];
                }) : latest.cards;
                return { ...latest, cards,
                  ...acknowledge(latest.pendingSync, latest.pendingVersions, snapshot.pendingSync, snapshot.pendingVersions),
                };
              }, publish, active);
              continue;
            }
            if (!pullRequested) break;
            pullRequested = false;
            const cloud = await flashcardService.fetchAllData(uid!);
            if (!active()) return;
            if (cloud) await transactAccount(uid, latest => {
              // Other tabs can edit while this pull is in flight. Never overwrite
              // their data or outbox with a stale server response.
              if (snapshot.mutationRevision !== latest.mutationRevision || hasPending(latest.pendingSync)) {
                pullRequested = true;
                return null;
              }
              return { ...latest, ...cloud, cards: sortCardsByOrder(cloud.cards),
                mutationRevision: latest.mutationRevision + 1 };
            }, publish, active);
          }
        });
        if (active()) set({ isInitialSyncComplete: true, syncStatus: online() ? 'synced' : 'offline', lastSyncedAt: Date.now() });
      } catch (error) {
        if (active()) set({ isInitialSyncComplete: true, syncStatus: 'error', syncError: message(error) });
      }
    }).finally(() => {
      running = null;
      const repeat = rerunRequested;
      rerunRequested = false;
      if (!active()) void run(true);
      else if (repeat && online() && get().syncStatus !== 'error') return run(false);
    });
    return running;
  };

  return {
    isInitialSyncComplete: false,
    sessionVersion: 0, mutationRevision: 0, pendingVersions: {},
    pendingSync: { ...EMPTY_PENDING_SYNC }, syncStatus: 'offline', lastSyncedAt: null, syncError: null,
    storageError: null,
    setSyncStatus: status => set({ syncStatus: status }),
    refreshAccount: async () => {
      const { uid, active } = sessionContext();
      try {
        await withAccountLock(uid, 'data', () => { if (active()) publish(readAccount(uid)); });
        if (active()) void run(false);
      } catch (error) { if (active()) set({ storageError: message(error) }); }
    },
    applyChanges: async (change, cardChange) => {
      const { uid, active } = sessionContext();
      try {
        await transactAccount(uid, latest => {
          const before = { ...get(), ...latest };
          const after = { ...latest, ...change(before) };
          const mutationRevision = latest.mutationRevision + 1;
          return { ...after, mutationRevision,
            ...enqueueChanges(latest, after, latest.pendingSync, latest.pendingVersions, mutationRevision, cardChange) };
        }, publish, active);
        if (!active()) throw new Error('계정이 변경되었습니다.');
        set({ syncStatus: online() ? 'syncing' : 'offline', syncError: null });
        void run(false);
      } catch (error) {
        if (active()) set({ storageError: message(error) });
        throw error;
      }
    },
    flushPendingSync: () => run(false),
    initCloudSync: () => run(true),
  };
};
