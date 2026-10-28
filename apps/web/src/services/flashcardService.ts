import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  WriteBatch,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { Card, Deck, Folder } from '../types';
import { AccountData, PendingSync } from '../store/types';
import { collections } from '../store/syncQueue';

/**
 * Firestore의 WriteBatch 500개 제한을 안전하게 처리하기 위한 청크 커밋 헬퍼
 */
async function commitInBatches(
  operations: Array<(batch: WriteBatch) => void>
): Promise<void> {
  if (!db || operations.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

/**
 * 카드를 order 속성(오름차순)으로 정렬하고, 없는 경우 ID(생성시간) 오름차순으로 정렬합니다.
 */
export function sortCardsByOrder(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
}

export const flashcardService = {
  async commitChanges(snapshot: AccountData & { pendingSync: PendingSync }, userId: string,
    isActive: () => boolean): Promise<void> {
    if (!db || !isFirebaseConfigured) throw new Error('Firebase is unavailable');
    const operations: Array<(batch: WriteBatch) => void> = [];
    const names = { folders: 'flashcard_folders', decks: 'flashcard_decks', cards: 'flashcard_cards' };
    for (const [kind, upserts, deletes] of collections) {
      for (const id of snapshot.pendingSync[deletes]) {
        operations.push(batch => batch.delete(doc(db!, names[kind], id)));
      }
      const ids = new Set(snapshot.pendingSync[upserts]);
      for (const item of snapshot[kind]) {
        if (!ids.has(item.id)) continue;
        const data: Record<string, unknown> = { ...item, userId };
        // Explicit nulls clear optional fields in merge writes.
        for (const key of kind === 'cards' ? ['frontImageUrl', 'backImageUrl', 'imageUrl'] : ['description']) {
          data[key] ??= null;
        }
        for (const key of Object.keys(data)) if (data[key] === undefined) data[key] = null;
        operations.push(batch => batch.set(doc(db!, names[kind], item.id), data, { merge: true }));
      }
    }
    for (let i = 0; i < operations.length; i += 400) {
      if (!isActive() || auth?.currentUser?.uid !== userId) throw new Error('Authentication session changed');
      const batch = writeBatch(db);
      operations.slice(i, i + 400).forEach(operation => operation(batch));
      await batch.commit();
    }
  },

  /**
   * Firebase Firestore로부터 현재 사용자의 모든 폴더, 덱, 카드 데이터를 조회합니다.
   */
  async fetchAllData(userId: string): Promise<{ folders: Folder[]; decks: Deck[]; cards: Card[] } | null> {
    if (!db || !isFirebaseConfigured || !userId) return null;

    try {
      const [foldersSnap, decksSnap, cardsSnap] = await Promise.all([
        getDocs(query(collection(db, 'flashcard_folders'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'flashcard_decks'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'flashcard_cards'), where('userId', '==', userId))),
      ]);

      const folders: Folder[] = foldersSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            userId: data.userId || userId,
            title: data.title || '',
            description: data.description || undefined,
            createdAt: Number(data.createdAt || 0),
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      const decks: Deck[] = decksSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            userId: data.userId || userId,
            folderId: data.folderId || null,
            title: data.title || '',
            description: data.description || undefined,
            createdAt: Number(data.createdAt || 0),
            updatedAt: Number(data.updatedAt || 0),
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);

      const rawCards: Card[] = cardsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          userId: data.userId || userId,
          deckId: data.deckId || '',
          order: data.order !== undefined ? Number(data.order) : undefined,
          termRichText: data.termRichText || '',
          definitionRichText: data.definitionRichText || '',
          frontImageUrl: data.frontImageUrl || undefined,
          backImageUrl: data.backImageUrl || data.imageUrl || undefined,
          imageUrl: data.imageUrl || data.backImageUrl || undefined,
          learned: Boolean(data.learned),
        };
      });

      // 1. 현재 존재하는 유효 덱 ID 목록 확인
      const validDeckIds = new Set(decks.map((d) => d.id));
      const validRawCards: Card[] = [];
      const orphanCardIds: string[] = [];

      rawCards.forEach((c) => {
        if (validDeckIds.has(c.deckId)) {
          validRawCards.push(c);
        } else {
          orphanCardIds.push(c.id);
        }
      });

      // 3. 유효 덱의 카드들만 덱별로 묶어서 정렬하고, order가 없는 카드는 index를 부여
      const cardsByDeck = new Map<string, Card[]>();
      validRawCards.forEach((c) => {
        const list = cardsByDeck.get(c.deckId) || [];
        list.push(c);
        cardsByDeck.set(c.deckId, list);
      });

      const cards: Card[] = [];
      const cardsToMigrate: Card[] = [];

      cardsByDeck.forEach((deckCardsList) => {
        const sorted = sortCardsByOrder(deckCardsList);
        sorted.forEach((card, index) => {
          if (card.order === undefined) {
            const updatedCard = { ...card, order: index };
            cards.push(updatedCard);
            cardsToMigrate.push(updatedCard);
          } else {
            cards.push(card);
          }
        });
      });

      return { folders, decks, cards };
    } catch (err) {
      console.error('Firebase Firestore 데이터 조회 실패:', err);
      throw err;
    }
  },

  /**
   * 단건 폴더 저장
   */
  async upsertFolder(folder: Folder, userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId) return;
    const docRef = doc(db, 'flashcard_folders', folder.id);
    await setDoc(
      docRef,
      {
        id: folder.id,
        userId,
        title: folder.title,
        description: folder.description || null,
        createdAt: folder.createdAt,
      },
      { merge: true }
    );
  },

  /**
   * 복수 폴더 일괄 저장
   */
  async batchUpsertFolders(folders: Folder[], userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId || folders.length === 0) return;
    const ops = folders.map((f) => (batch: WriteBatch) => {
      const docRef = doc(db!, 'flashcard_folders', f.id);
      batch.set(
        docRef,
        {
          id: f.id,
          userId,
          title: f.title,
          description: f.description || null,
          createdAt: f.createdAt,
        },
        { merge: true }
      );
    });
    await commitInBatches(ops);
  },

  /**
   * 폴더 단건 삭제
   */
  async deleteFolder(folderId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) return;
    await deleteDoc(doc(db, 'flashcard_folders', folderId));
  },

  /**
   * 복수 폴더 일괄 삭제
   */
  async batchDeleteFolders(folderIds: string[]): Promise<void> {
    if (!db || !isFirebaseConfigured || folderIds.length === 0) return;
    const ops = folderIds.map((id) => (batch: WriteBatch) => {
      batch.delete(doc(db!, 'flashcard_folders', id));
    });
    await commitInBatches(ops);
  },

  /**
   * 단건 덱 저장
   */
  async upsertDeck(deck: Deck, userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId) return;
    const docRef = doc(db, 'flashcard_decks', deck.id);
    await setDoc(
      docRef,
      {
        id: deck.id,
        userId,
        folderId: deck.folderId || null,
        title: deck.title,
        description: deck.description || null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
      { merge: true }
    );
  },

  /**
   * 복수 덱 일괄 저장
   */
  async batchUpsertDecks(decks: Deck[], userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId || decks.length === 0) return;
    const ops = decks.map((d) => (batch: WriteBatch) => {
      const docRef = doc(db!, 'flashcard_decks', d.id);
      batch.set(
        docRef,
        {
          id: d.id,
          userId,
          folderId: d.folderId || null,
          title: d.title,
          description: d.description || null,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        },
        { merge: true }
      );
    });
    await commitInBatches(ops);
  },

  /**
   * 덱 단건 삭제
   */
  async deleteDeck(deckId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) return;
    await deleteDoc(doc(db, 'flashcard_decks', deckId));
  },

  /**
   * 복수 덱 일괄 삭제
   */
  async batchDeleteDecks(deckIds: string[]): Promise<void> {
    if (!db || !isFirebaseConfigured || deckIds.length === 0) return;
    const ops = deckIds.map((id) => (batch: WriteBatch) => {
      batch.delete(doc(db!, 'flashcard_decks', id));
    });
    await commitInBatches(ops);
  },

  /**
   * 카드 단건 저장
   */
  async upsertCard(card: Card, userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId) return;
    const docRef = doc(db, 'flashcard_cards', card.id);
    await setDoc(
      docRef,
      {
        id: card.id,
        userId,
        deckId: card.deckId,
        order: card.order !== undefined ? card.order : 0,
        termRichText: card.termRichText,
        definitionRichText: card.definitionRichText,
        frontImageUrl: card.frontImageUrl || null,
        backImageUrl: card.backImageUrl || card.imageUrl || null,
        imageUrl: card.imageUrl || card.backImageUrl || null,
        learned: card.learned,
      },
      { merge: true }
    );
  },

  /**
   * 복수 카드 일괄 저장
   */
  async batchUpsertCards(cards: Card[], userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId || cards.length === 0) return;
    const ops = cards.map((c, index) => (batch: WriteBatch) => {
      const docRef = doc(db!, 'flashcard_cards', c.id);
      batch.set(
        docRef,
        {
          id: c.id,
          userId,
          deckId: c.deckId,
          order: c.order !== undefined ? c.order : index,
          termRichText: c.termRichText,
          definitionRichText: c.definitionRichText,
          frontImageUrl: c.frontImageUrl || null,
          backImageUrl: c.backImageUrl || c.imageUrl || null,
          imageUrl: c.imageUrl || c.backImageUrl || null,
          learned: c.learned,
        },
        { merge: true }
      );
    });
    await commitInBatches(ops);
  },

  /**
   * 특정 덱의 카드 일괄 동기화 (기존 덱 카드와 비교하여 삭제 및 upsert)
   */
  async syncDeckCards(deckId: string, cards: Card[], userId: string): Promise<void> {
    if (!db || !isFirebaseConfigured || !userId) return;

    try {
      const cardsRef = collection(db, 'flashcard_cards');
      const q = query(cardsRef, where('deckId', '==', deckId), where('userId', '==', userId));
      const existingSnap = await getDocs(q);

      const targetCardIds = new Set(cards.map((c) => c.id));
      const ops: Array<(batch: WriteBatch) => void> = [];

      // 1. 기존 카드 중 대상 목록에 없는 카드 삭제
      existingSnap.docs.forEach((docSnap) => {
        if (!targetCardIds.has(docSnap.id)) {
          ops.push((batch: WriteBatch) => batch.delete(docSnap.ref));
        }
      });

      // 2. 전달된 카드들 저장
      cards.forEach((c, index) => {
        ops.push((batch: WriteBatch) => {
          const docRef = doc(db!, 'flashcard_cards', c.id);
          batch.set(
            docRef,
            {
              id: c.id,
              userId,
              deckId: deckId,
              order: c.order !== undefined ? c.order : index,
              termRichText: c.termRichText,
              definitionRichText: c.definitionRichText,
              frontImageUrl: c.frontImageUrl || null,
              backImageUrl: c.backImageUrl || c.imageUrl || null,
              imageUrl: c.imageUrl || c.backImageUrl || null,
              learned: c.learned,
            },
            { merge: true }
          );
        });
      });

      await commitInBatches(ops);
    } catch (err) {
      console.error('덱 카드 일괄 동기화 실패:', err);
      throw err;
    }
  },

  /**
   * 카드 단건 삭제
   */
  async deleteCard(cardId: string): Promise<void> {
    if (!db || !isFirebaseConfigured) return;
    await deleteDoc(doc(db, 'flashcard_cards', cardId));
  },

  /**
   * 복수 카드 일괄 삭제
   */
  async batchDeleteCards(cardIds: string[]): Promise<void> {
    if (!db || !isFirebaseConfigured || cardIds.length === 0) return;
    const ops = cardIds.map((id) => (batch: WriteBatch) => {
      batch.delete(doc(db!, 'flashcard_cards', id));
    });
    await commitInBatches(ops);
  },
};
