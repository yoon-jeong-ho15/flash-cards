import { StateCreator } from 'zustand';
import { FlashcardStoreState, SyncSlice, EMPTY_PENDING_SYNC } from '../types';
import { flashcardService, sortCardsByOrder } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { acknowledge, enqueueChanges, hasPending } from '../syncQueue';

export const createSyncSlice: StateCreator<FlashcardStoreState, [], [], SyncSlice> = (set, get) => {
  let running: Promise<void> | null = null;
  let pullRequested = false;
  const online = () => isFirebaseConfigured && navigator.onLine && Boolean(get().user);

  const run = (pull: boolean): Promise<void> => {
    pullRequested ||= pull;
    if (running) return running;
    if (!online()) { set({ syncStatus: 'offline' }); return Promise.resolve(); }
    const session = get().sessionVersion;
    const uid = get().user!.uid;
    const active = () => get().sessionVersion === session && get().user?.uid === uid;
    // Defer execution until `running` is assigned, including when there are no queued writes.
    running = Promise.resolve().then(async () => {
      set({ syncStatus: 'syncing', syncError: null });
      try {
        while (active() && online()) {
          if (hasPending(get().pendingSync)) {
            const snapshot = get();
            await flashcardService.commitChanges(snapshot, uid, active);
            if (!active()) return;
            set(acknowledge(get().pendingSync, get().pendingVersions, snapshot.pendingSync, snapshot.pendingVersions));
            continue;
          }
          if (!pullRequested) break;
          pullRequested = false;
          const revision = get().mutationRevision;
          const cloud = await flashcardService.fetchAllData(uid);
          if (!active()) return;
          // A newer local edit (including a deletion) invalidates this read. Push it and read again.
          if (revision !== get().mutationRevision) { pullRequested = true; continue; }
          if (cloud) set({ ...cloud, cards: sortCardsByOrder(cloud.cards) });
        }
        if (active()) set({ syncStatus: online() ? 'synced' : 'offline', lastSyncedAt: Date.now() });
      } catch (error) {
        if (active()) set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : '동기화 실패' });
      }
    }).finally(() => {
      running = null;
      // A new account may have requested a sync while an old request was settling.
      if (!active() && online()) void run(true);
    });
    return running;
  };

  return {
    sessionVersion: 0, mutationRevision: 0, pendingVersions: {},
    pendingSync: { ...EMPTY_PENDING_SYNC }, syncStatus: 'offline', lastSyncedAt: null, syncError: null,
    setSyncStatus: status => set({ syncStatus: status }),
    applyChanges: change => {
      const before = get();
      const after = { ...before, ...change(before) };
      const mutationRevision = before.mutationRevision + 1;
      set({ folders: after.folders, decks: after.decks, cards: after.cards, mutationRevision,
        ...enqueueChanges(before, after, before.pendingSync, before.pendingVersions, mutationRevision),
        syncStatus: online() ? 'syncing' : 'offline', syncError: null });
      void run(false);
    },
    flushPendingSync: () => run(false),
    initCloudSync: () => run(true),
  };
};
