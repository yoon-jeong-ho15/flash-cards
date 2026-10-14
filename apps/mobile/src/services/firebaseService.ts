import type { Folder, Deck, Card, UserProfile } from '@flashcards/types';
import { CURRENT_USER, USER_FOLDERS, USER_DECKS, USER_CARDS } from '../store/userInitialData';

const FIREBASE_API_KEY = 'AIzaSyAab6zzXjd1IG2p4_-LbXW1eqOaO-A1G1k';
const FIREBASE_PROJECT_ID = 'yoon-apps';

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Firestore REST API Document를 앱 도메인 모델로 변환하는 헬퍼
 */
function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields;
  const result: any = {};

  for (const key of Object.keys(fields)) {
    const valObj = fields[key];
    if (valObj.stringValue !== undefined) {
      result[key] = valObj.stringValue;
    } else if (valObj.integerValue !== undefined) {
      result[key] = Number(valObj.integerValue);
    } else if (valObj.doubleValue !== undefined) {
      result[key] = Number(valObj.doubleValue);
    } else if (valObj.booleanValue !== undefined) {
      result[key] = valObj.booleanValue;
    } else if (valObj.nullValue !== undefined) {
      result[key] = null;
    } else if (valObj.arrayValue !== undefined) {
      result[key] = (valObj.arrayValue.values || []).map((v: any) => v.stringValue || v);
    }
  }

  // 문서 이름에서 ID 추출
  if (!result.id && doc.name) {
    result.id = doc.name.split('/').pop();
  }

  return result;
}

export const firebaseService = {
  /**
   * 기본 현재 로그인된 사용자 정보 반환
   */
  getDefaultUser(): UserProfile {
    return CURRENT_USER;
  },

  /**
   * Firestore에서 로그인된 사용자의 실시간 폴더, 덱, 카드 데이터를 조회합니다.
   * 네트워크 에러 발생 시 최신 사용자 캐시 데이터를 안전하게 반환합니다.
   */
  async fetchUserData(userId: string): Promise<{
    folders: Folder[];
    decks: Deck[];
    cards: Card[];
  }> {
    try {
      const [foldersRes, decksRes, cardsRes] = await Promise.all([
        fetch(`${FIRESTORE_BASE_URL}/flashcard_folders?pageSize=100`),
        fetch(`${FIRESTORE_BASE_URL}/flashcard_decks?pageSize=100`),
        fetch(`${FIRESTORE_BASE_URL}/flashcard_cards?pageSize=300`),
      ]);

      if (foldersRes.ok && decksRes.ok && cardsRes.ok) {
        const [foldersData, decksData, cardsData] = await Promise.all([
          foldersRes.json(),
          decksRes.json(),
          cardsRes.json(),
        ]);

        const rawFolders = (foldersData.documents || []).map(parseFirestoreDoc).filter(Boolean);
        const rawDecks = (decksData.documents || []).map(parseFirestoreDoc).filter(Boolean);
        const rawCards = (cardsData.documents || []).map(parseFirestoreDoc).filter(Boolean);

        const folders: Folder[] = rawFolders
          .filter((f: any) => !userId || f.userId === userId)
          .map((f: any) => ({
            id: f.id,
            userId: f.userId,
            title: f.title || '',
            description: f.description || undefined,
            createdAt: Number(f.createdAt || Date.now()),
          }))
          .sort((a: Folder, b: Folder) => b.createdAt - a.createdAt);

        const decks: Deck[] = rawDecks
          .filter((d: any) => !userId || d.userId === userId)
          .map((d: any) => ({
            id: d.id,
            userId: d.userId,
            folderId: d.folderId || null,
            title: d.title || '',
            description: d.description || undefined,
            createdAt: Number(d.createdAt || Date.now()),
            updatedAt: Number(d.updatedAt || d.createdAt || Date.now()),
          }))
          .sort((a: Deck, b: Deck) => b.updatedAt - a.updatedAt);

        const cards: Card[] = rawCards
          .filter((c: any) => !userId || c.userId === userId)
          .map((c: any) => ({
            id: c.id,
            userId: c.userId,
            deckId: c.deckId || '',
            termRichText: c.termRichText || '',
            definitionRichText: c.definitionRichText || '',
            frontImageUrl: c.frontImageUrl || undefined,
            backImageUrl: c.backImageUrl || c.imageUrl || undefined,
            imageUrl: c.imageUrl || c.backImageUrl || undefined,
            learned: Boolean(c.learned),
          }));

        if (decks.length > 0) {
          return { folders, decks, cards };
        }
      }
    } catch (err) {
      console.warn('Firestore 실시간 조회 실패, 사용자 캐시 데이터 사용:', err);
    }

    // fallback: 기존 사용자(CURRENT_USER)인 경우에만 캐시 데이터 반환, 다른 사용자는 빈 보관함 반환
    if (!userId || userId === CURRENT_USER.uid) {
      return {
        folders: USER_FOLDERS,
        decks: USER_DECKS,
        cards: USER_CARDS,
      };
    }

    return {
      folders: [],
      decks: [],
      cards: [],
    };
  },
};
