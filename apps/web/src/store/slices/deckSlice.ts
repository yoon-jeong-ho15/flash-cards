import { StateCreator } from 'zustand';
import { FlashcardStoreState, DeckSlice } from '../types';

export const createDeckSlice: StateCreator<FlashcardStoreState, [], [], DeckSlice> = (_set, get) => ({
  decks: [],
  addDeck: (data, cards = []) => get().saveDeckWithCards(null, data, cards),
  updateDeck: (id, updates) => get().applyChanges(state => {
    if (!state.decks.some(deck => deck.id === id)) throw new Error('덱이 다른 탭에서 삭제되었습니다.');
    if (updates.folderId && !state.folders.some(folder => folder.id === updates.folderId)) throw new Error('폴더가 삭제되었습니다.');
    return { decks: state.decks.map(deck => deck.id === id ? { ...deck, ...updates, updatedAt: Date.now() } : deck) };
  }),
  moveDeck: (id, folderId) => get().updateDeck(id, { folderId }),
  deleteDeck: async id => {
    await get().applyChanges(state => ({
      decks: state.decks.filter(deck => deck.id !== id),
      cards: state.cards.filter(card => card.deckId !== id),
    }));
  },
});
