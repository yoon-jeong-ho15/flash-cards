import { create } from 'zustand';
import { FlashcardStoreState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createFolderSlice } from './slices/folderSlice';
import { createSetSlice } from './slices/setSlice';
import { createCardSlice } from './slices/cardSlice';
import { loadAccountView } from './accountStorage';

export type { SyncStatus, PendingSync, FlashcardStoreState } from './types';
export { EMPTY_PENDING_SYNC } from './types';

export const useFlashcardStore = create<FlashcardStoreState>()((set, get, api) => {
  return {
    ...createAuthSlice(set, get, api),
    ...createSyncSlice(set, get, api),
    ...createFolderSlice(set, get, api),
    ...createSetSlice(set, get, api),
    ...createCardSlice(set, get, api),
    ...loadAccountView(),
  };
});
