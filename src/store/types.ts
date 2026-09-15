import { Card, Deck, Folder, UserProfile } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface PendingSync {
  folderIds: string[];
  deckIds: string[];
  cardIds: string[];
  deletedFolderIds: string[];
  deletedDeckIds: string[];
  deletedCardIds: string[];
}

export const EMPTY_PENDING_SYNC: PendingSync = {
  folderIds: [],
  deckIds: [],
  cardIds: [],
  deletedFolderIds: [],
  deletedDeckIds: [],
  deletedCardIds: [],
};

export interface AuthSlice {
  user: UserProfile | null;
  isAuthInitialized: boolean;
  authError: string | null;
  setUser: (user: UserProfile | null) => void;
  setAuthError: (error: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetUserData: () => void;
}

export interface SyncSlice {
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  syncError: string | null;
  pendingSync: PendingSync;
  initCloudSync: () => Promise<void>;
  flushPendingSync: () => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
}

export interface FolderSlice {
  folders: Folder[];
  addFolder: (title: string, description?: string) => string;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'title' | 'description'>>) => void;
  deleteFolder: (id: string, deleteContainedDecks?: boolean) => void;
}

export interface DeckSlice {
  decks: Deck[];
  addDeck: (
    deckData: { title: string; description?: string; folderId?: string | null },
    initialCards?: Array<{ termRichText: string; definitionRichText: string; imageUrl?: string }>
  ) => string;
  updateDeck: (id: string, updates: Partial<Pick<Deck, 'title' | 'description' | 'folderId'>>) => void;
  deleteDeck: (id: string) => void;
  moveDeck: (deckId: string, folderId: string | null) => void;
}

export interface CardSlice {
  cards: Card[];
  addCard: (cardData: Omit<Card, 'id'>) => string;
  updateCard: (id: string, updates: Partial<Omit<Card, 'id' | 'deckId'>>) => void;
  deleteCard: (id: string) => void;
  saveDeckWithCards: (
    deckId: string | null,
    deckData: { title: string; description?: string; folderId?: string | null },
    cardsData: Array<{ id?: string; termRichText: string; definitionRichText: string; imageUrl?: string; learned?: boolean }>
  ) => string;
  setCardLearned: (id: string, learned: boolean) => void;
  resetDeckProgress: (deckId: string) => void;
}

export type FlashcardStoreState = AuthSlice & SyncSlice & FolderSlice & DeckSlice & CardSlice;
