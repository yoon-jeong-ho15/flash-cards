import { StateCreator } from 'zustand';
import { FlashcardStoreState, SyncSlice, EMPTY_PENDING_SYNC, SyncStatus } from '../types';
import { flashcardService } from '../../services/flashcardService';
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
        if (cloudData.decks.length > 0 || cloudData.folders.length > 0) {
          // 스마트 병합: 로컬 상태와 클라우드 상태를 안전하게 합침
          const currentFolders = get().folders;
          const currentDecks = get().decks;
          const currentCards = get().cards;

          // 클라우드 데이터를 우선하되, 방금 로컬에 추가된 신규 ID가 빠지지 않도록 병합
          const mergedFoldersMap = new Map<string, Folder>();
          cloudData.folders.forEach((f) => mergedFoldersMap.set(f.id, f));
          currentFolders.forEach((f) => {
            if (!mergedFoldersMap.has(f.id)) mergedFoldersMap.set(f.id, f);
          });

          const mergedDecksMap = new Map<string, Deck>();
          cloudData.decks.forEach((d) => mergedDecksMap.set(d.id, d));
          currentDecks.forEach((d) => {
            if (!mergedDecksMap.has(d.id)) mergedDecksMap.set(d.id, d);
          });

          const mergedCardsMap = new Map<string, Card>();
          cloudData.cards.forEach((c) => mergedCardsMap.set(c.id, c));
          currentCards.forEach((c) => {
            if (!mergedCardsMap.has(c.id)) mergedCardsMap.set(c.id, c);
          });

          set({
            folders: Array.from(mergedFoldersMap.values()),
            decks: Array.from(mergedDecksMap.values()),
            cards: Array.from(mergedCardsMap.values()),
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          });
        } else {
          // 클라우드가 비어있는 경우 기존 로컬 데이터를 자동 시딩하지 않고 동기화 상태만 완료
          set({
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          });
        }
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
