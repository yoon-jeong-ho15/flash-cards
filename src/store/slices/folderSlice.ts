import { StateCreator } from 'zustand';
import { FlashcardStoreState, FolderSlice } from '../types';
import { Folder } from '../../types';
import { flashcardService } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';

export const createFolderSlice: StateCreator<
  FlashcardStoreState,
  [],
  [],
  FolderSlice
> = (set, get) => ({
  folders: [],

  addFolder: (title, description) => {
    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const { user } = get();
    const newFolder: Folder = {
      id,
      userId: user?.uid,
      title: title.trim(),
      description: description?.trim(),
      createdAt: Date.now(),
    };

    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => ({
      folders: [newFolder, ...state.folders],
      syncStatus: isOnline ? 'syncing' : 'offline',
      pendingSync: {
        ...state.pendingSync,
        folderIds: isOnline ? state.pendingSync.folderIds : [...state.pendingSync.folderIds, id],
      },
    }));

    if (isOnline && user) {
      flashcardService.upsertFolder(newFolder, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: { ...s.pendingSync, folderIds: [...s.pendingSync.folderIds, id] },
          }));
        });
    }

    return id;
  },

  updateFolder: (id, updates) => {
    let updatedFolder: Folder | undefined;
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const folders = state.folders.map((folder) => {
        if (folder.id === id) {
          updatedFolder = { ...folder, ...updates, userId: folder.userId || user?.uid };
          return updatedFolder;
        }
        return folder;
      });
      return {
        folders,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          folderIds: isOnline
            ? state.pendingSync.folderIds
            : Array.from(new Set([...state.pendingSync.folderIds, id])),
        },
      };
    });

    if (isOnline && updatedFolder && user) {
      flashcardService.upsertFolder(updatedFolder, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: {
              ...s.pendingSync,
              folderIds: Array.from(new Set([...s.pendingSync.folderIds, id])),
            },
          }));
        });
    }
  },

  deleteFolder: (id, deleteContainedDecks = false) => {
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const newDeletedFolderIds = Array.from(new Set([...state.pendingSync.deletedFolderIds, id]));
      const newFolderIds = state.pendingSync.folderIds.filter((fid) => fid !== id);

      if (deleteContainedDecks) {
        const decksToDelete = state.decks.filter((d) => d.folderId === id).map((d) => d.id);
        const cardsToDelete = state.cards.filter((c) => decksToDelete.includes(c.deckId)).map((c) => c.id);

        return {
          folders: state.folders.filter((f) => f.id !== id),
          decks: state.decks.filter((d) => d.folderId !== id),
          cards: state.cards.filter((c) => !decksToDelete.includes(c.deckId)),
          syncStatus: isOnline ? 'syncing' : 'offline',
          pendingSync: {
            ...state.pendingSync,
            folderIds: newFolderIds,
            deletedFolderIds: newDeletedFolderIds,
            deletedDeckIds: Array.from(new Set([...state.pendingSync.deletedDeckIds, ...decksToDelete])),
            deletedCardIds: Array.from(new Set([...state.pendingSync.deletedCardIds, ...cardsToDelete])),
          },
        };
      } else {
        return {
          folders: state.folders.filter((f) => f.id !== id),
          decks: state.decks.map((d) =>
            d.folderId === id ? { ...d, folderId: null, updatedAt: Date.now() } : d
          ),
          syncStatus: isOnline ? 'syncing' : 'offline',
          pendingSync: {
            ...state.pendingSync,
            folderIds: newFolderIds,
            deletedFolderIds: newDeletedFolderIds,
          },
        };
      }
    });

    if (isOnline) {
      flashcardService.deleteFolder(id)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },
});
