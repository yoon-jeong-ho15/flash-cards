import type { RecordSyncWrites } from '@flashcards/types';
import { uploadDataImage } from '../../services/storageService';
import { cardDataImages, replaceCardImage } from '../../services/imageSync';
import { StateCreator } from 'zustand';
import { FlashcardStoreState, SyncSlice, EMPTY_PENDING_SYNC } from '../types';
import { flashcardService, sortCardsByOrder } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { applyWriteResults, collections, enqueueChanges, hasPending, markCreationsAttempted, omitDeferredDeletes } from '../syncQueue';
import { AccountSnapshot, readAccount, transactAccount, withAccountLock } from '../accountStorage';

const conflictMessage = '다른 탭 또는 기기에서 저장한 카드가 반영되었습니다. 충돌한 편집은 이 브라우저에 보관했습니다.';
const deleteRetryInterval = 5_000;
const maxDeleteRetryInterval = 300_000;

export const createSyncSlice: StateCreator<FlashcardStoreState, [], [], SyncSlice> = (set, get) => {
  let running: Promise<void> | null = null;
  let pullRequested = false;
  let rerunRequested = false;
  let deleteRetry: ReturnType<typeof setTimeout> | undefined;
  let deleteRetryDelay = deleteRetryInterval;
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
      sets: reuse(current.sets, saved.sets), cards: reuse(current.cards, saved.cards), storageError: null });
  };
  const sessionContext = () => {
    const { user, sessionVersion } = get();
    return { uid: user?.uid, active: () => get().sessionVersion === sessionVersion && get().user?.uid === user?.uid };
  };

  const run = (pull: boolean): Promise<void> => {
    pullRequested ||= pull;
    if (running) { rerunRequested = true; return running; }
    clearTimeout(deleteRetry);
    deleteRetry = undefined;
    if (!online()) { set({ syncStatus: 'offline', isInitialSyncComplete: true }); return Promise.resolve(); }
    const { uid, active } = sessionContext();
    // An absent document can still arrive from another runtime's old create.
    // Keep its deletion durable and set it aside only for this pass.
    const deferredDeletes = new Map<string, number | undefined>();
    running = Promise.resolve().then(async () => {
      if (!active()) return;
      let didSync = false;
      let hadConflict = false;
      let pulling = false;
      try {
        // The account lock covers this browser sync pass, including the bounded wait.
        // A timeout or tab closure can release it before Firestore settles.
        await withAccountLock(uid, 'sync', async () => {
          // Read the queue only after late acknowledgements have reached storage.
          await flashcardService.waitForWrites?.();
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
            const awaitingImageRefresh = new Set(snapshot.pendingSync.refreshImageCardIds);
            if (awaitingImageRefresh.size) pullRequested = true;
            const refreshCards = new Set<string>();
            const images = new Set<string>();
            for (const card of snapshot.cards) {
              if (awaitingImageRefresh.has(card.id)) continue;
              const sources = cardDataImages(card);
              if (learnedOnly.has(card.id)) {
                if (sources.length) refreshCards.add(card.id);
              } else {
                for (const source of sources) images.add(source);
              }
            }
            let pendingSync = omitDeferredDeletes(snapshot.pendingSync, snapshot.pendingVersions, deferredDeletes);
            const pending = hasPending(pendingSync);
            if (!images.size && !pending && !pullRequested) break;
            if (get().syncStatus !== 'syncing') set({ syncStatus: 'syncing', syncError: null });
            if (images.size) {
              for (const original of images) {
                if (!active()) return;
                const url = await uploadDataImage(original, uid!, active);
                await transactAccount(uid, latest => {
                  const progress = new Set([...(latest.pendingSync.learnedOnlyCardIds ?? []), ...(latest.pendingSync.refreshImageCardIds ?? [])]);
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
            if (pending) {
              const attempted = markCreationsAttempted(snapshot.pendingSync);
              if (attempted !== snapshot.pendingSync) {
                let prepared = false;
                await transactAccount(uid, latest => {
                  if (!online() || latest.mutationRevision !== snapshot.mutationRevision) return null;
                  prepared = true;
                  return { ...latest, pendingSync: markCreationsAttempted(latest.pendingSync) };
                }, publish, active);
                if (!prepared) continue;
                pendingSync = markCreationsAttempted(pendingSync);
              }
              const sent = { ...snapshot, pendingSync };
              let recorded = false;
              const sameAccount = () => get().user?.uid === uid;
              const record: RecordSyncWrites = async results => {
                recorded = true;
                await transactAccount(uid, latest => {
                  const next = applyWriteResults(latest, snapshot, results, refreshCards, deferredDeletes);
                  if (active()) hadConflict ||= next.cardConflicts !== latest.cardConflicts;
                  return next;
                }, next => {
                  if (sameAccount()) publish(next);
                });
                if (hadConflict && active() && get().syncStatus === 'error') set({ syncError: conflictMessage });
              };
              const missing = await flashcardService.commitChanges(sent, uid!, active, record);
              if (!recorded) {
                const absent = new Set(missing ?? []);
                await record(collections.flatMap(([kind, upserts, deletes]) =>
                  [...pendingSync[upserts], ...pendingSync[deletes]].map(id => {
                    const key = `${kind}:${id}`;
                    return { key, outcome: absent.has(key) ? 'missing' as const : 'written' as const };
                  })));
              }
              if (!active()) return;
              didSync = true;
              continue;
            }
            pullRequested = false;
            pulling = true;
            const cloud = await flashcardService.fetchAllData(uid!);
            if (!active()) return;
            await transactAccount(uid, latest => {
              // If a late create appeared in this pull, send its deletion before publishing the data.
              if (deferredDeletes.size) {
                for (const [kind] of collections) {
                  for (const item of cloud[kind]) deferredDeletes.delete(`${kind}:${item.id}`);
                }
              }
              // Other tabs can edit while this pull is in flight. Never overwrite
              // their data or outbox with a stale server response.
              if (!online() || snapshot.mutationRevision !== latest.mutationRevision ||
                  hasPending(omitDeferredDeletes(latest.pendingSync, latest.pendingVersions, deferredDeletes))) {
                pullRequested = true;
                return null;
              }
              return { ...latest, ...cloud, pendingSync: { ...latest.pendingSync, refreshImageCardIds: [] }, cards: sortCardsByOrder(cloud.cards),
                mutationRevision: latest.mutationRevision + 1 };
            }, saved => {
              publish(saved);
              didSync = true;
            }, active);
            pulling = false;
          }
        });
        if (active()) {
          if (!online()) set({ isInitialSyncComplete: true, syncStatus: 'offline' });
          else if (hadConflict) set({ isInitialSyncComplete: true, syncStatus: 'error', syncError: conflictMessage });
          else if (deferredDeletes.size) set({ isInitialSyncComplete: true, syncStatus: 'pending' });
          else if (didSync) set({ isInitialSyncComplete: true, syncStatus: 'synced', lastSyncedAt: Date.now() });
          else set({ isInitialSyncComplete: true });
        }
      } catch (error) {
        if (active()) {
          pullRequested ||= pulling;
          set({ isInitialSyncComplete: true, syncStatus: online() ? 'error' : 'offline', syncError: message(error) });
        }
      }
    }).finally(() => {
      running = null;
      const repeat = rerunRequested;
      rerunRequested = false;
      if (!active()) {
        deleteRetryDelay = deleteRetryInterval;
        void run(true);
      } else if (online() && get().syncStatus !== 'error') {
        if (repeat) return run(false);
        if (deferredDeletes.size) {
          // After bounded retries, keep the delete durable for the next normal sync.
          if (deleteRetryDelay <= maxDeleteRetryInterval) {
            deleteRetry = setTimeout(() => { if (active()) void run(false); }, deleteRetryDelay);
            deleteRetryDelay *= 2;
          }
        } else deleteRetryDelay = deleteRetryInterval;
      }
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
