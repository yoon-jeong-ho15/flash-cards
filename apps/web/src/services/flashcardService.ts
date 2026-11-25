import type { RecordSyncWrites, SyncWriteResult } from '@flashcards/types';
import {
  collection,
  type DocumentData,
  doc,
  documentId,
  getDocsFromServer,
  setDoc,
  updateDoc,
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
import { bounded, cardDataImages, validateDocument } from './imageSync';

// Wait for acknowledgements in this runtime. The timeout does not cancel a submitted
// Firestore write. Card content also requires a server-checked base version.
let outstandingCommit: Promise<void> = Promise.resolve();
async function commitWrite(write: () => Promise<void>, active: () => boolean): Promise<void> {
  await bounded(outstandingCommit);
  if (!active()) throw new Error('Authentication session changed');
  const work = write();
  outstandingCommit = work.catch(() => {});
  await bounded(work);
}

function commitBatch(batch: WriteBatch, active: () => boolean = () => true) {
  return commitWrite(() => batch.commit(), active);
}

async function writeExisting(name: string, id: string, userId: string, active: () => boolean, write: () => Promise<void>) {
  try {
    await write();
    return true;
  } catch (error) {
    if (!active()) throw new Error('Authentication session changed');
    const code = (error as { code?: string }).code;
    if (code === 'not-found') return false;
    if (code !== 'permission-denied') throw error;

    // Missing documents can also be denied by the ownership rule. Confirm on the server.
    const owned = await getDocsFromServer(query(collection(db!, name), where('userId', '==', userId), where(documentId(), '==', id)));
    if (!active()) throw new Error('Authentication session changed');
    if (!owned.empty) throw error;
    return false;
  }
}

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
    await commitBatch(batch);
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

function readCard(id: string, data: DocumentData, userId: string): Card {
  return {
    id: data.id || id,
    userId: data.userId || userId,
    deckId: data.deckId || '',
    order: data.order !== undefined ? Number(data.order) : undefined,
    termRichText: data.termRichText || '',
    definitionRichText: data.definitionRichText || '',
    frontImageUrl: data.frontImageUrl || undefined,
    backImageUrl: data.backImageUrl || data.imageUrl || undefined,
    imageUrl: data.imageUrl || data.backImageUrl || undefined,
    learned: Boolean(data.learned),
    ...(typeof data.contentVersion === 'string' && { contentVersion: data.contentVersion }),
  };
}

export const flashcardService = {
  waitForWrites: () => bounded(outstandingCommit),
  async commitChanges(snapshot: AccountData & { pendingSync: PendingSync }, userId: string,
    isActive: () => boolean, record?: RecordSyncWrites): Promise<string[]> {
    if (!db || !isFirebaseConfigured) throw new Error('Firebase is unavailable');
    const operations: Array<{
      key: string;
      apply: (batch: WriteBatch) => void;
      card?: { id: string; base: string | null; version: string };
    }> = [];
    const learnedOnlyIds = new Set(snapshot.pendingSync.learnedOnlyCardIds);
    const individualWrites: Array<() => Promise<SyncWriteResult>> = [];
    const missingDeletes: string[] = [];
    const active = () => isActive() && auth?.currentUser?.uid === userId;
    const names = { folders: 'flashcard_folders', decks: 'flashcard_decks', cards: 'flashcard_cards' };
    const notSent = new Set(collections.flatMap(([kind, upserts]) =>
      snapshot.pendingSync[upserts].map(id => `${kind}:${id}`)));
    try {
      for (const [kind, upserts, deletes] of collections) {
        for (const id of snapshot.pendingSync[deletes]) {
          // A missing delete must not reject a batch of unrelated upserts.
          individualWrites.push(async () => {
            const deleted = await writeExisting(names[kind], id, userId, active,
              () => deleteDoc(doc(db!, names[kind], id)));
            if (!deleted) missingDeletes.push(`${kind}:${id}`);
            return { key: `${kind}:${id}`, outcome: deleted ? 'written' : 'missing' };
          });
        }
        const ids = new Set(snapshot.pendingSync[upserts]);
        for (const item of snapshot[kind]) {
          if (!ids.has(item.id)) continue;
          if (kind === 'cards' && learnedOnlyIds.has(item.id)) {
            individualWrites.push(async () => {
              const exists = await writeExisting(names.cards, item.id, userId, active,
                () => updateDoc(doc(db!, names.cards, item.id), { learned: Boolean((item as Card).learned) }));
              return { key: `cards:${item.id}`, outcome: exists ? 'written' : 'missing' };
            });
            continue;
          }
          if (kind === 'cards' && cardDataImages(item as Card).length) {
            throw new Error('이미지 업로드가 완료되지 않았습니다. 연결을 확인한 후 다시 동기화해 주세요. 원본은 보관됩니다.');
          }
          const data: Record<string, unknown> = { ...item, userId };
          // Explicit nulls clear optional fields in merge writes.
          for (const key of kind === 'cards' ? ['frontImageUrl', 'backImageUrl', 'imageUrl'] : ['description']) {
            data[key] ??= null;
          }
          for (const key of Object.keys(data)) if (data[key] === undefined) data[key] = null;
          const card = kind === 'cards' ? {
            id: item.id, base: (item as Card).contentVersion ?? null, version: crypto.randomUUID(),
          } : undefined;
          if (card) {
            data.baseContentVersion = card.base;
            data.contentVersion = card.version;
          }
          validateDocument(data);
          operations.push({ key: `${kind}:${item.id}`, card,
            apply: batch => batch.set(doc(db!, names[kind], item.id), data, { merge: true }) });
        }
      }
      for (let i = 0; i < operations.length; i += 400) {
        if (!active()) throw new Error('Authentication session changed');
        const batch = writeBatch(db);
        const chunk = operations.slice(i, i + 400);
        chunk.forEach(operation => operation.apply(batch));
        const keys = chunk.map(operation => operation.key);
        let reconciled = false;
        await commitWrite(async () => {
          for (const key of keys) notSent.delete(key);
          try {
            await batch.commit();
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (code === 'permission-denied' || code === 'invalid-argument' || code === 'failed-precondition') {
              const results = await Promise.all(chunk.map(async ({ key, card }): Promise<SyncWriteResult> => {
                if (code === 'permission-denied' && card && active()) {
                  const owned = await getDocsFromServer(query(collection(db!, names.cards),
                    where('userId', '==', userId), where(documentId(), '==', card.id)));
                  const remote = owned.docs[0];
                  if (remote) {
                    const serverCard = readCard(remote.id, remote.data(), userId);
                    if ((serverCard.contentVersion ?? null) !== card.base) {
                      return { key, outcome: 'conflict', serverCard };
                    }
                  } else if (card.base !== null) return { key, outcome: 'missing' };
                }
                return { key, outcome: 'not-sent' };
              }));
              await record?.(results);
              // The rejected batch was atomic. Let the sync loop reload the outbox
              // before sending any unaffected operations.
              reconciled = Boolean(record && results.some(result => result.outcome !== 'not-sent'));
              if (reconciled) return;
            }
            throw error;
          }
          await record?.(chunk.map(({ key, card }) => ({ key, outcome: 'written', contentVersion: card?.version })));
        }, active);
        if (reconciled) {
          if (notSent.size) await record?.(Array.from(notSent, key => ({ key, outcome: 'not-sent' })));
          return missingDeletes;
        }
      }
    } catch (error) {
      if (notSent.size) await record?.(Array.from(notSent, key => ({ key, outcome: 'not-sent' })));
      throw error;
    }
    for (let i = 0; i < individualWrites.length; i += 25) {
      const chunk = individualWrites.slice(i, i + 25);
      await commitWrite(async () => {
        const results = await Promise.allSettled(chunk.map(async write => {
          const result = await write();
          await record?.([result]);
        }));
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
      }, active);
    }
    return missingDeletes;
  },

  /**
   * Firebase Firestore로부터 현재 사용자의 모든 폴더, 덱, 카드 데이터를 조회합니다.
   */
  async fetchAllData(userId: string): Promise<AccountData> {
    if (!db || !isFirebaseConfigured || !userId) throw new Error('Firebase is unavailable');

    try {
      const [foldersSnap, decksSnap, cardsSnap] = await bounded(Promise.all([
        getDocsFromServer(query(collection(db, 'flashcard_folders'), where('userId', '==', userId))),
        getDocsFromServer(query(collection(db, 'flashcard_decks'), where('userId', '==', userId))),
        getDocsFromServer(query(collection(db, 'flashcard_cards'), where('userId', '==', userId))),
      ]));

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

      const rawCards = cardsSnap.docs.map(d => readCard(d.id, d.data(), userId));

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
