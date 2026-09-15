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
import { db, isFirebaseConfigured } from '../lib/firebase';
import { Card, Deck, Folder } from '../types';

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

export const flashcardService = {
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

      const cards: Card[] = cardsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          userId: data.userId || userId,
          deckId: data.deckId || '',
          termRichText: data.termRichText || '',
          definitionRichText: data.definitionRichText || '',
          imageUrl: data.imageUrl || undefined,
          learned: Boolean(data.learned),
        };
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
        termRichText: card.termRichText,
        definitionRichText: card.definitionRichText,
        imageUrl: card.imageUrl || null,
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
    const ops = cards.map((c) => (batch: WriteBatch) => {
      const docRef = doc(db!, 'flashcard_cards', c.id);
      batch.set(
        docRef,
        {
          id: c.id,
          userId,
          deckId: c.deckId,
          termRichText: c.termRichText,
          definitionRichText: c.definitionRichText,
          imageUrl: c.imageUrl || null,
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
      cards.forEach((c) => {
        ops.push((batch: WriteBatch) => {
          const docRef = doc(db!, 'flashcard_cards', c.id);
          batch.set(
            docRef,
            {
              id: c.id,
              userId,
              deckId: deckId,
              termRichText: c.termRichText,
              definitionRichText: c.definitionRichText,
              imageUrl: c.imageUrl || null,
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
