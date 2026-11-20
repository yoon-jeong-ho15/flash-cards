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
            if (hasPending(snapshot.pendingSync)) {
              await flashcardService.commitChanges(snapshot, uid!, active);
              if (!active()) return;
              await transactAccount(uid, latest => ({ ...latest,
                ...acknowledge(latest.pendingSync, latest.pendingVersions, snapshot.pendingSync, snapshot.pendingVersions),
              }), publish, active);
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
    applyChanges: async change => {
      const { uid, active } = sessionContext();
      try {
        await transactAccount(uid, latest => {
          const before = { ...get(), ...latest };
          const after = { ...latest, ...change(before) };
          const mutationRevision = latest.mutationRevision + 1;
          return { ...after, mutationRevision,
            ...enqueueChanges(latest, after, latest.pendingSync, latest.pendingVersions, mutationRevision) };
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
