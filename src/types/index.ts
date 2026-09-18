// 사용자 프로필 모델
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// 카드 모델
export interface Card {
  id: string;
  deckId: string;
  userId?: string;
  termRichText: string;       // 앞면 (Tiptap HTML)
  definitionRichText: string; // 뒷면 (Tiptap HTML)
  frontImageUrl?: string;     // 앞면 첨부 이미지 (URL 또는 Base64)
  backImageUrl?: string;      // 뒷면 첨부 이미지 (URL 또는 Base64)
  imageUrl?: string;          // 기존 첨부 이미지 (하위 호환용 뒷면 이미지)
  learned: boolean;           // 학습 완료 여부
}

// 카드 덱 모델
export interface Deck {
  id: string;
  folderId?: string | null;   // 속한 폴더 ID (없으면 루트)
  userId?: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// 폴더 모델 (덱의 모음)
export interface Folder {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  createdAt: number;
}

// UI 뷰 모드
export type ViewMode =
  | { type: 'dashboard' }
  | { type: 'all-folders' }
  | { type: 'all-decks' }
  | { type: 'folder'; folderId: string }
  | { type: 'deck'; deckId: string }
  | { type: 'edit-deck'; deckId?: string; folderId?: string; focusCardId?: string } // deckId가 없으면 신규 생성
  | { type: 'study'; deckId: string; onlyDifficult?: boolean };

// 덱 정렬 옵션
export type DeckSortOption = 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

// 학습 통계 결과 모델
export interface StudyResultStats {
  deckTitle: string;
  totalCards: number;
  roundCount: number;
  difficultCardsCount: number;
  masteredCount: number;
}
