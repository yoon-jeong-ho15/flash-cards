import { create } from 'zustand';
import { FlashcardStoreState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createFolderSlice } from './slices/folderSlice';
import { createDeckSlice } from './slices/deckSlice';
import { createCardSlice } from './slices/cardSlice';
import { readAccount, writeAccount } from './accountStorage';

export type { SyncStatus, PendingSync, FlashcardStoreState } from './types';
export { EMPTY_PENDING_SYNC } from './types';

export const useFlashcardStore = create<FlashcardStoreState>()((set, get, api) => {
  // Commit durable data before publishing it to the UI or starting network operations.
  const durableSet: typeof set = (update) => {
    const previous = get();
    const patch = typeof update === 'function' ? update(previous) : update;
    const next = { ...previous, ...patch };
    // Switching accounts only loads an existing snapshot. It must also work when
    // storage is full, so logout never depends on writing another account's cache.
    const sameAccount = next.user?.uid === previous.user?.uid;
    if (sameAccount && (next.folders !== previous.folders || next.decks !== previous.decks ||
      next.cards !== previous.cards || next.pendingSync !== previous.pendingSync)) {
      writeAccount(next);
    }
    set(patch);
  };
  return {
    ...createAuthSlice(durableSet, get, api),
    ...createSyncSlice(durableSet, get, api),
    ...createFolderSlice(durableSet, get, api),
    ...createDeckSlice(durableSet, get, api),
    ...createCardSlice(durableSet, get, api),
    ...readAccount(),
  };
});
