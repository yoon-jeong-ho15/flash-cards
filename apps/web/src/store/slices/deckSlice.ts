import { StateCreator } from 'zustand';
import { FlashcardStoreState, DeckSlice } from '../types';
import { extractAllFirebaseImageUrlsFromCard, deleteImagesByUrls } from '../../services/storageService';

export const createDeckSlice: StateCreator<FlashcardStoreState, [], [], DeckSlice> = (_set, get) => ({
  decks: [],
  addDeck: (data, cards = []) => get().saveDeckWithCards(null, data, cards),
  updateDeck: (id, updates) => get().applyChanges(state => ({
    decks: state.decks.map(deck => deck.id === id ? { ...deck, ...updates, updatedAt: Date.now() } : deck),
  })),
  moveDeck: (id, folderId) => get().updateDeck(id, { folderId }),
  deleteDeck: id => {
    const urls = get().cards.filter(card => card.deckId === id).flatMap(extractAllFirebaseImageUrlsFromCard);
    void deleteImagesByUrls(urls);
    get().applyChanges(state => ({
      decks: state.decks.filter(deck => deck.id !== id),
      cards: state.cards.filter(card => card.deckId !== id),
    }));
  },
});
