import { StateCreator } from 'zustand';
import { FlashcardStoreState, CardSlice } from '../types';
import { Card, Deck } from '../../types';
import { extractAllFirebaseImageUrlsFromCard, deleteImagesByUrls } from '../../services/storageService';

const touchDeck = (decks: Deck[], id: string) => decks.map(deck =>
  deck.id === id ? { ...deck, updatedAt: Date.now() } : deck);

export const createCardSlice: StateCreator<FlashcardStoreState, [], [], CardSlice> = (_set, get) => ({
  cards: [],
  addCard: data => {
    const id = `card-${crypto.randomUUID()}`;
    get().applyChanges(state => ({
      cards: [...state.cards, { ...data, id, userId: state.user?.uid,
        order: data.order ?? Math.max(-1, ...state.cards.filter(c => c.deckId === data.deckId).map(c => c.order ?? -1)) + 1 }],
      decks: touchDeck(state.decks, data.deckId),
    }));
    return id;
  },
  updateCard: (id, updates) => get().applyChanges(state => {
    const card = state.cards.find(c => c.id === id);
    return { cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c),
      decks: card ? touchDeck(state.decks, card.deckId) : state.decks };
  }),
  deleteCard: id => {
    const card = get().cards.find(c => c.id === id);
    if (card) void deleteImagesByUrls(extractAllFirebaseImageUrlsFromCard(card));
    get().applyChanges(state => ({ cards: state.cards.filter(c => c.id !== id),
      decks: card ? touchDeck(state.decks, card.deckId) : state.decks }));
  },
  saveDeckWithCards: (deckId, data, items) => {
    const id = deckId || `deck-${crypto.randomUUID()}`;
    if (deckId && !get().decks.some(deck => deck.id === deckId)) throw new Error('덱을 찾을 수 없습니다.');
    get().applyChanges(state => {
      const now = Date.now();
      const previous = state.decks.find(deck => deck.id === id);
      const deck: Deck = { ...previous, id, userId: state.user?.uid, title: data.title.trim(),
        description: data.description?.trim(), folderId: data.folderId || null,
        createdAt: previous?.createdAt ?? now, updatedAt: now };
      const cards: Card[] = items.map((item, index) => ({ ...item, id: item.id || `card-${crypto.randomUUID()}`,
        deckId: id, userId: state.user?.uid, order: index, learned: item.learned ?? false,
        backImageUrl: item.backImageUrl || item.imageUrl, imageUrl: item.backImageUrl || item.imageUrl }));
      return { decks: previous ? state.decks.map(d => d.id === id ? deck : d) : [deck, ...state.decks],
        cards: [...state.cards.filter(c => c.deckId !== id), ...cards] };
    });
    return id;
  },
  setCardLearned: (id, learned) => get().applyChanges(state => ({
    cards: state.cards.map(card => card.id === id ? { ...card, learned } : card),
  })),
  resetDeckProgress: deckId => get().applyChanges(state => ({
    cards: state.cards.map(card => card.deckId === deckId ? { ...card, learned: false } : card),
  })),
});
