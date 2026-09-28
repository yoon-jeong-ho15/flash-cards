import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FlashcardStoreState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createFolderSlice } from './slices/folderSlice';
import { createDeckSlice } from './slices/deckSlice';
import { createCardSlice } from './slices/cardSlice';

// 기존 타입 export 호환성 유지
export type { SyncStatus, PendingSync, FlashcardStoreState } from './types';
export { EMPTY_PENDING_SYNC } from './types';

export const useFlashcardStore = create<FlashcardStoreState>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSyncSlice(...args),
      ...createFolderSlice(...args),
      ...createDeckSlice(...args),
      ...createCardSlice(...args),
    }),
    {
      name: 'quizlet_flashcards_v1',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (!version || version < 3) {
          const sampleDeckIds = new Set([
            'deck-react',
            'deck-async-js',
            'deck-network',
            'deck-quick-git',
            'deck-korean-history',
            'deck-society-culture',
            'deck-biology-life',
            'deck-earth-science',
            'deck-sat-english',
          ]);
          const sampleFolderIds = new Set([
            'folder-frontend',
            'folder-cs',
            'folder-social-studies',
            'folder-science',
          ]);
          const sampleCardPrefixes = [
            'card-react-',
            'card-async-',
            'card-net-',
            'card-git-',
            'card-hist-',
            'card-soc-',
            'card-bio-',
            'card-earth-',
            'card-voca-',
          ];

          const state = persistedState || {};
          const userFolders = (state.folders || []).filter(
            (f: any) => !sampleFolderIds.has(f.id)
          );
          const userDecks = (state.decks || []).filter(
            (d: any) => !sampleDeckIds.has(d.id)
          );
          const userCards = (state.cards || []).filter(
            (c: any) =>
              !sampleDeckIds.has(c.deckId) &&
              !sampleCardPrefixes.some((prefix) => c.id?.startsWith(prefix))
          );

          return {
            ...state,
            folders: userFolders,
            decks: userDecks,
            cards: userCards,
          } as FlashcardStoreState;
        }
        return persistedState as FlashcardStoreState;
      },
    }
  )
);
