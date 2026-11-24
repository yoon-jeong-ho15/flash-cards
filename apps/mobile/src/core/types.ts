import type { Card, Deck, Folder, UserProfile, DeckSortOption } from '@flashcards/types';
export type { Card, Deck, Folder, UserProfile, DeckSortOption };

export interface Data { folders: Folder[]; decks: Deck[]; cards: Card[] }
export type Kind = keyof Data;
export interface Operation { kind: Kind; id: string; revision: number; deleted: boolean; learnedOnly?: true }
export interface Preferences {
  collectionLayout?: 'grid' | 'list';
  mockDataVersion?: number;
  lastStudiedDeckId?: string;
  deckSort?: DeckSortOption;
  folderDeckSort?: DeckSortOption;
  folderSort?: DeckSortOption;
}
export interface Snapshot extends Data {
  /** Account-local offline originals, keyed by their canonical remote URL. Never sent to Firestore. */
  imageCache?: Record<string, string>;
  revision: number;
  outbox: Record<string, Operation>;
  preferences: Preferences;
}
export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';
export interface State extends Snapshot {
  user: UserProfile | null;
  ready: boolean;
  online: boolean;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  session: number;
}
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface ImageUpload { cardId: string; original: string; url: string }
export interface Transport {
  available: boolean;
  push(uid: string, snapshot: Snapshot, active: () => boolean, onImage?: (image: ImageUpload) => Promise<void>): Promise<void>;
  pull(uid: string): Promise<Data>;
}
export type CardInput = Omit<Card, 'id' | 'deckId' | 'userId' | 'order' | 'learned'> & { id?: string; learned?: boolean };
export interface DeckInput { title: string; description?: string; folderId?: string | null }
export interface Draft { title: string; description: string; folderId: string | null; cards: CardInput[]; savedAt: number }
export const emptySnapshot = (): Snapshot => ({ folders: [], decks: [], cards: [], imageCache: {}, revision: 0, outbox: {}, preferences: {} });
export const accountKey = (uid?: string) => `flashcards_mobile_v2:${uid ? `user:${uid}` : 'guest'}`;
