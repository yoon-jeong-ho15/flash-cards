import { Card, Deck, Folder, UserProfile } from '../types';

export type SyncStatus = 'pending' | 'synced' | 'syncing' | 'offline' | 'error';
export type WriteState = 'unsent' | 'attempted' | 'existing';

export interface PendingSync {
  folderIds: string[];
  deckIds: string[];
  cardIds: string[];
  /** Subset of cardIds. Older snapshots omit this and retain full writes. */
  learnedOnlyCardIds?: string[];
  /** Revision of the latest non-learned edit for cards queued as full writes. */
  cardContentVersions?: Record<string, number>;
  /** Keyed by collection:id. An absent entry in a legacy queue is unknown. */
  /** Progress was committed; refresh cached inline images before migrating them. */
  refreshImageCardIds?: string[];
  writeStates?: Record<string, WriteState>;
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

export type AccountData = Pick<FlashcardStoreState, 'folders' | 'decks' | 'cards'>;
export interface SyncSlice {
  isInitialSyncComplete: boolean;
  sessionVersion: number;
  mutationRevision: number;
  pendingVersions: Record<string, number>;
  applyChanges: (change: (state: FlashcardStoreState) => Partial<AccountData>, cardChange?: 'learned') => Promise<void>;
  refreshAccount: () => Promise<void>;
  storageError: string | null;
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
  addFolder: (title: string, description?: string) => Promise<string>;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'title' | 'description'>>) => Promise<void>;
  deleteFolder: (id: string, deleteContainedDecks?: boolean) => Promise<void>;
}

export interface DeckSlice {
  decks: Deck[];
  addDeck: (
    deckData: { title: string; description?: string; folderId?: string | null },
    initialCards?: Array<{
      termRichText: string;
      definitionRichText: string;
      frontImageUrl?: string;
      backImageUrl?: string;
      imageUrl?: string;
    }>
  ) => Promise<string>;
  updateDeck: (id: string, updates: Partial<Pick<Deck, 'title' | 'description' | 'folderId'>>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  moveDeck: (deckId: string, folderId: string | null) => Promise<void>;
}

export interface DeckEditBase {
  deck?: Deck;
  cards: Card[];
}

export interface CardSlice {
  cards: Card[];
  addCard: (cardData: Omit<Card, 'id' | 'contentVersion'>) => Promise<string>;
  updateCard: (id: string, updates: Partial<Omit<Card, 'id' | 'deckId' | 'contentVersion'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  saveDeckWithCards: (
    deckId: string | null,
    deckData: { title: string; description?: string; folderId?: string | null },
    cardsData: Array<{
      id?: string;
      order?: number;
      termRichText: string;
      definitionRichText: string;
      frontImageUrl?: string;
      backImageUrl?: string;
      imageUrl?: string;
      learned?: boolean;
    }>,
    base?: DeckEditBase
  ) => Promise<string>;
  setCardLearned: (id: string, learned: boolean) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
}

export type FlashcardStoreState = AuthSlice & SyncSlice & FolderSlice & DeckSlice & CardSlice;
