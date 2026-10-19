import { StateCreator } from 'zustand';
import { FlashcardStoreState, SyncSlice, EMPTY_PENDING_SYNC, SyncStatus } from '../types';
import { flashcardService, sortCardsByOrder } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { Folder, Deck, Card } from '../../types';

export const createSyncSlice: StateCreator<
  FlashcardStoreState,
  [],
  [],
  SyncSlice
> = (set, get) => ({
  syncStatus: (isFirebaseConfigured && navigator.onLine ? 'syncing' : 'offline') as SyncStatus,
  lastSyncedAt: null,
  syncError: null,
  pendingSync: EMPTY_PENDING_SYNC,

  setSyncStatus: (status) => set({ syncStatus: status }),

  /**
   * 오프라인 중 누적된 로컬 변경사항(생성/수정/삭제)을 Firebase로 일괄 업로드(Push)합니다.
   * 로그인된 사용자의 UID가 필요합니다.
   */
  flushPendingSync: async () => {
    const { user } = get();
    if (!isFirebaseConfigured || !navigator.onLine || !user) {
      set({ syncStatus: 'offline' });
      return;
    }

    const { pendingSync, folders, decks, cards } = get();

    const hasPending =
      pendingSync.folderIds.length > 0 ||
      pendingSync.deckIds.length > 0 ||
      pendingSync.cardIds.length > 0 ||
      pendingSync.deletedFolderIds.length > 0 ||
      pendingSync.deletedDeckIds.length > 0 ||
      pendingSync.deletedCardIds.length > 0;

    if (!hasPending) return;

    set({ syncStatus: 'syncing' });

    try {
      // 1. 오프라인 중 삭제된 항목 먼저 Firebase에서 삭제
      if (pendingSync.deletedCardIds.length > 0) {
        await flashcardService.batchDeleteCards(pendingSync.deletedCardIds);
      }
      if (pendingSync.deletedDeckIds.length > 0) {
        await flashcardService.batchDeleteDecks(pendingSync.deletedDeckIds);
      }
      if (pendingSync.deletedFolderIds.length > 0) {
        await flashcardService.batchDeleteFolders(pendingSync.deletedFolderIds);
      }

      // 2. 오프라인 중 생성/수정된 항목 Firebase로 업로드
      if (pendingSync.folderIds.length > 0) {
        const foldersToPush = folders.filter((f) => pendingSync.folderIds.includes(f.id));
        if (foldersToPush.length > 0) {
          await flashcardService.batchUpsertFolders(foldersToPush, user.uid);
        }
      }

      if (pendingSync.deckIds.length > 0) {
        const decksToPush = decks.filter((d) => pendingSync.deckIds.includes(d.id));
        if (decksToPush.length > 0) {
          await flashcardService.batchUpsertDecks(decksToPush, user.uid);
        }
      }

      if (pendingSync.cardIds.length > 0) {
        const cardsToPush = cards.filter((c) => pendingSync.cardIds.includes(c.id));
        if (cardsToPush.length > 0) {
          await flashcardService.batchUpsertCards(cardsToPush, user.uid);
        }
      }

      // 3. 대기 큐 초기화
      set({
        pendingSync: EMPTY_PENDING_SYNC,
        syncStatus: 'synced',
        lastSyncedAt: Date.now(),
      });
    } catch (err: any) {
      console.error('오프라인 대기 변경사항 푸시 실패:', err);
      set({ syncStatus: 'error', syncError: err?.message || '동기화 실패' });
      throw err;
    }
  },

  /**
   * 온라인 연결 시: 1) 오프라인 변경사항 Push -> 2) 사용자별 클라우드 최신 데이터 Pull & Smart Merge
   */
  initCloudSync: async () => {
    const { user } = get();
    if (!isFirebaseConfigured || !navigator.onLine || !user) {
      set({ syncStatus: 'offline' });
      return;
    }

    set({ syncStatus: 'syncing', syncError: null });

    try {
      // 1단계: 로컬에서 작성된 변경사항이 있다면 먼저 Firebase로 Push
      await get().flushPendingSync();

      // 2단계: 현재 사용자의 Firebase 클라우드 최신 데이터 가져오기 (Pull)
      const cloudData = await flashcardService.fetchAllData(user.uid);

      if (cloudData) {
        // 서버(Firestore) 데이터를 신뢰할 수 있는 최신 기준(Source of Truth)으로 설정
        const finalFolders: Folder[] = [...cloudData.folders];
        const finalDecks: Deck[] = [...cloudData.decks];
        const finalCards: Card[] = [...cloudData.cards];

        // 예외 보존: 오프라인 상태에서 현재 브라우저에 새로 작성되어 아직 서버로 전송되지 못한 대기 항목(pendingSync)만 병합
        const currentPending = get().pendingSync;

        if (currentPending.folderIds.length > 0) {
          const pendingFolderIds = new Set(currentPending.folderIds);
          const unsyncedFolders = get().folders.filter(
            (f) => pendingFolderIds.has(f.id) && !finalFolders.some((sf) => sf.id === f.id)
          );
          finalFolders.push(...unsyncedFolders);
        }

        if (currentPending.deckIds.length > 0) {
          const pendingDeckIds = new Set(currentPending.deckIds);
          const unsyncedDecks = get().decks.filter(
            (d) => pendingDeckIds.has(d.id) && !finalDecks.some((sd) => sd.id === d.id)
          );
          finalDecks.push(...unsyncedDecks);
        }

        if (currentPending.cardIds.length > 0) {
          const pendingCardIds = new Set(currentPending.cardIds);
          const unsyncedCards = get().cards.filter(
            (c) => pendingCardIds.has(c.id) && !finalCards.some((sc) => sc.id === c.id)
          );
          finalCards.push(...unsyncedCards);
        }

        const validDeckIdSet = new Set(finalDecks.map((d) => d.id));
        const activeFinalCards = finalCards.filter((c) => validDeckIdSet.has(c.deckId));

        set({
          folders: finalFolders,
          decks: finalDecks,
          cards: sortCardsByOrder(activeFinalCards),
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        });
      }
    } catch (err: any) {
      console.error('클라우드 동기화 실패:', err);
      set({
        syncStatus: 'error',
        syncError: err?.message || '클라우드 동기화 실패',
      });
    }
  },
});
