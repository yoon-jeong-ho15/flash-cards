import { StateCreator } from 'zustand';
import { FlashcardStoreState, FolderSlice } from '../types';

export const createFolderSlice: StateCreator<FlashcardStoreState, [], [], FolderSlice> = (_set, get) => ({
  folders: [],
  addFolder: (title, description) => {
    const id = `folder-${crypto.randomUUID()}`;
    get().applyChanges(state => ({ folders: [...state.folders, { id, title: title.trim(),
      description: description?.trim(), createdAt: Date.now(), userId: state.user?.uid }] }));
    return id;
  },
  updateFolder: (id, updates) => get().applyChanges(state => ({
    folders: state.folders.map(folder => folder.id === id ? { ...folder, ...updates } : folder),
  })),
  deleteFolder: (id, deleteContainedDecks = false) => get().applyChanges(state => {
    const deckIds = new Set(state.decks.filter(deck => deck.folderId === id).map(deck => deck.id));
    return {
      folders: state.folders.filter(folder => folder.id !== id),
      decks: deleteContainedDecks ? state.decks.filter(deck => !deckIds.has(deck.id)) :
        state.decks.map(deck => deckIds.has(deck.id) ? { ...deck, folderId: null, updatedAt: Date.now() } : deck),
      cards: deleteContainedDecks ? state.cards.filter(card => !deckIds.has(card.deckId)) : state.cards,
    };
  }),
});
