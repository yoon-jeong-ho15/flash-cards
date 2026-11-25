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
  order?: number;             // 정렬 순서 (0부터 시작하는 인덱스)
  termRichText: string;       // 앞면 (Tiptap HTML 또는 텍스트)
  definitionRichText: string; // 뒷면 (Tiptap HTML 또는 텍스트)
  frontImageUrl?: string;     // 앞면 첨부 이미지 (URL 또는 Base64)
  backImageUrl?: string;      // 뒷면 첨부 이미지 (URL 또는 Base64)
  imageUrl?: string;          // 기존 첨부 이미지 (하위 호환용 뒷면 이미지)
  learned: boolean;           // 학습 완료 여부
  /** Opaque version of the last confirmed cloud content. Legacy cards omit it. */
  contentVersion?: string;
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
  | { type: 'study'; deckId: string; onlyDifficult?: boolean; shuffle?: boolean };

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

/** Result of a single Firestore operation within a larger sync pass. */
export type SyncWriteResult =
  | { key: string; outcome: 'written'; contentVersion?: string }
  | { key: string; outcome: 'missing' | 'not-sent' }
  | { key: string; outcome: 'conflict'; serverCard: Card };
export type RecordSyncWrites = (results: SyncWriteResult[]) => Promise<void>;

export interface MissingCardSyncInput {
  sameRevision: boolean;
  currentLearnedOnly: boolean;
}

export type MissingCardSyncDecision = 'remove' | 'preserve-copy';

/** Decides whether a remotely missing card should be removed locally or preserved as a new unsent copy. */
export function decideMissingCardSync({
  sameRevision,
  currentLearnedOnly,
}: MissingCardSyncInput): MissingCardSyncDecision {
  return sameRevision || currentLearnedOnly ? 'remove' : 'preserve-copy';
}

export interface CardLearnedFollowUpInput {
  sameRevision: boolean;
  sentLearnedOnly: boolean;
  currentLearnedOnly: boolean;
  sentRevision?: number;
  sentContentRevision?: number;
  currentRevision?: number;
  currentContentRevision?: number;
}

/** Decides whether a card edited during a confirmed body write only needs a learned-state follow-up. */
export function shouldPromoteCardToLearnedOnly({
  sameRevision,
  sentLearnedOnly,
  currentLearnedOnly,
  sentRevision,
  sentContentRevision,
  currentRevision,
  currentContentRevision,
}: CardLearnedFollowUpInput): boolean {
  if (sameRevision || sentLearnedOnly || currentLearnedOnly) return false;
  const sentContent = sentContentRevision ?? sentRevision;
  const currentContent = currentContentRevision ?? currentRevision;
  return sentContent !== undefined && currentContent === sentContent;
}
