import { StateCreator } from 'zustand';
import { FlashcardStoreState, CardSlice } from '../types';
import { Card, Deck } from '../../types';
import { flashcardService } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';

export const createCardSlice: StateCreator<
  FlashcardStoreState,
  [],
  [],
  CardSlice
> = (set, get) => ({
  cards: [],

  addCard: (cardData) => {
    const id = `card-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const { user } = get();
    const newCard: Card = {
      ...cardData,
      id,
      userId: user?.uid,
    };

    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => ({
      cards: [...state.cards, newCard],
      decks: state.decks.map((d) =>
        d.id === cardData.deckId ? { ...d, updatedAt: Date.now() } : d
      ),
      syncStatus: isOnline ? 'syncing' : 'offline',
      pendingSync: {
        ...state.pendingSync,
        cardIds: isOnline ? state.pendingSync.cardIds : [...state.pendingSync.cardIds, id],
      },
    }));

    if (isOnline && user) {
      flashcardService.upsertCard(newCard, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: { ...s.pendingSync, cardIds: [...s.pendingSync.cardIds, id] },
          }));
        });
    }

    return id;
  },

  updateCard: (id, updates) => {
    let targetCard: Card | undefined;
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      let deckId: string | undefined;
      const updatedCards = state.cards.map((card) => {
        if (card.id === id) {
          deckId = card.deckId;
          targetCard = { ...card, ...updates, userId: card.userId || user?.uid };
          return targetCard;
        }
        return card;
      });

      return {
        cards: updatedCards,
        decks: deckId
          ? state.decks.map((d) => (d.id === deckId ? { ...d, updatedAt: Date.now() } : d))
          : state.decks,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          cardIds: isOnline
            ? state.pendingSync.cardIds
            : Array.from(new Set([...state.pendingSync.cardIds, id])),
        },
      };
    });

    if (isOnline && targetCard && user) {
      flashcardService.upsertCard(targetCard, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },

  deleteCard: (id) => {
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const cardToDelete = state.cards.find((c) => c.id === id);
      const remainingCards = state.cards.filter((c) => c.id !== id);
      return {
        cards: remainingCards,
        decks: cardToDelete
          ? state.decks.map((d) =>
              d.id === cardToDelete.deckId ? { ...d, updatedAt: Date.now() } : d
            )
          : state.decks,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          cardIds: state.pendingSync.cardIds.filter((cid) => cid !== id),
          deletedCardIds: Array.from(new Set([...state.pendingSync.deletedCardIds, id])),
        },
      };
    });

    if (isOnline) {
      flashcardService.deleteCard(id)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },

  saveDeckWithCards: (deckId, deckData, cardsData) => {
    const now = Date.now();
    const targetDeckId = deckId || `deck-${now}-${Math.random().toString(36).substr(2, 6)}`;
    const { user } = get();
    let savedDeck: Deck;

    const synchronizedCards: Card[] = cardsData.map((item, index) => ({
      id: item.id || `card-${now}-${index}-${Math.random().toString(36).substr(2, 6)}`,
      deckId: targetDeckId,
      userId: user?.uid,
      termRichText: item.termRichText,
      definitionRichText: item.definitionRichText,
      imageUrl: item.imageUrl,
      learned: item.learned ?? false,
    }));

    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      let updatedDecks = [...state.decks];
      if (deckId) {
        updatedDecks = updatedDecks.map((d) => {
          if (d.id === deckId) {
            savedDeck = {
              ...d,
              userId: d.userId || user?.uid,
              title: deckData.title.trim(),
              description: deckData.description?.trim(),
              folderId: deckData.folderId || null,
              updatedAt: now,
            };
            return savedDeck;
          }
          return d;
        });
      } else {
        savedDeck = {
          id: targetDeckId,
          userId: user?.uid,
          title: deckData.title.trim(),
          description: deckData.description?.trim(),
          folderId: deckData.folderId || null,
          createdAt: now,
          updatedAt: now,
        };
        updatedDecks = [savedDeck, ...updatedDecks];
      }

      const otherCards = state.cards.filter((c) => c.deckId !== targetDeckId);

      return {
        decks: updatedDecks,
        cards: [...otherCards, ...synchronizedCards],
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          deckIds: isOnline
            ? state.pendingSync.deckIds
            : Array.from(new Set([...state.pendingSync.deckIds, targetDeckId])),
          cardIds: isOnline
            ? state.pendingSync.cardIds
            : Array.from(new Set([...state.pendingSync.cardIds, ...synchronizedCards.map((c) => c.id)])),
        },
      };
    });

    const deckToSync =
      savedDeck! || {
        id: targetDeckId,
        userId: user?.uid,
        title: deckData.title.trim(),
        description: deckData.description?.trim(),
        folderId: deckData.folderId || null,
        createdAt: now,
        updatedAt: now,
      };

    if (isOnline && user) {
      Promise.all([
        flashcardService.upsertDeck(deckToSync, user.uid),
        flashcardService.syncDeckCards(targetDeckId, synchronizedCards, user.uid),
      ])
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: {
              ...s.pendingSync,
              deckIds: Array.from(new Set([...s.pendingSync.deckIds, targetDeckId])),
              cardIds: Array.from(new Set([...s.pendingSync.cardIds, ...synchronizedCards.map((c) => c.id)])),
            },
          }));
        });
    }

    return targetDeckId;
  },

  setCardLearned: (id, learned) => {
    let cardToUpdate: Card | undefined;
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const cards = state.cards.map((c) => {
        if (c.id === id) {
          cardToUpdate = { ...c, learned, userId: c.userId || user?.uid };
          return cardToUpdate;
        }
        return c;
      });
      return {
        cards,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          cardIds: isOnline
            ? state.pendingSync.cardIds
            : Array.from(new Set([...state.pendingSync.cardIds, id])),
        },
      };
    });

    if (isOnline && cardToUpdate && user) {
      flashcardService.upsertCard(cardToUpdate, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },

  resetDeckProgress: (deckId) => {
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => ({
      cards: state.cards.map((c) => (c.deckId === deckId ? { ...c, learned: false } : c)),
      syncStatus: isOnline ? 'syncing' : 'offline',
    }));

    const currentDeckCards = get().cards.filter((c) => c.deckId === deckId);
    if (isOnline && user) {
      flashcardService.syncDeckCards(deckId, currentDeckCards, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },
});
