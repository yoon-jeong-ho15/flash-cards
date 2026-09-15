import { StateCreator } from 'zustand';
import { FlashcardStoreState, DeckSlice } from '../types';
import { Deck, Card } from '../../types';
import { flashcardService } from '../../services/flashcardService';
import { isFirebaseConfigured } from '../../lib/firebase';

export const createDeckSlice: StateCreator<
  FlashcardStoreState,
  [],
  [],
  DeckSlice
> = (set, get) => ({
  decks: [],

  addDeck: (deckData, initialCards = []) => {
    const deckId = `deck-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    const { user } = get();
    const newDeck: Deck = {
      id: deckId,
      userId: user?.uid,
      title: deckData.title.trim(),
      description: deckData.description?.trim(),
      folderId: deckData.folderId || null,
      createdAt: now,
      updatedAt: now,
    };

    const newCards: Card[] = initialCards.map((c, index) => ({
      id: `card-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
      deckId,
      userId: user?.uid,
      termRichText: c.termRichText,
      definitionRichText: c.definitionRichText,
      imageUrl: c.imageUrl,
      learned: false,
    }));

    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => ({
      decks: [newDeck, ...state.decks],
      cards: [...state.cards, ...newCards],
      syncStatus: isOnline ? 'syncing' : 'offline',
      pendingSync: {
        ...state.pendingSync,
        deckIds: isOnline ? state.pendingSync.deckIds : [...state.pendingSync.deckIds, deckId],
        cardIds: isOnline
          ? state.pendingSync.cardIds
          : [...state.pendingSync.cardIds, ...newCards.map((c) => c.id)],
      },
    }));

    if (isOnline && user) {
      Promise.all([
        flashcardService.upsertDeck(newDeck, user.uid),
        flashcardService.syncDeckCards(deckId, newCards, user.uid),
      ])
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: {
              ...s.pendingSync,
              deckIds: Array.from(new Set([...s.pendingSync.deckIds, deckId])),
              cardIds: Array.from(new Set([...s.pendingSync.cardIds, ...newCards.map((c) => c.id)])),
            },
          }));
        });
    }

    return deckId;
  },

  updateDeck: (id, updates) => {
    let updatedDeck: Deck | undefined;
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const decks = state.decks.map((deck) => {
        if (deck.id === id) {
          updatedDeck = { ...deck, ...updates, updatedAt: Date.now(), userId: deck.userId || user?.uid };
          return updatedDeck;
        }
        return deck;
      });
      return {
        decks,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          deckIds: isOnline
            ? state.pendingSync.deckIds
            : Array.from(new Set([...state.pendingSync.deckIds, id])),
        },
      };
    });

    if (isOnline && updatedDeck && user) {
      flashcardService.upsertDeck(updatedDeck, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => {
          set((s) => ({
            syncStatus: 'offline',
            pendingSync: {
              ...s.pendingSync,
              deckIds: Array.from(new Set([...s.pendingSync.deckIds, id])),
            },
          }));
        });
    }
  },

  deleteDeck: (id) => {
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => ({
      decks: state.decks.filter((d) => d.id !== id),
      cards: state.cards.filter((c) => c.deckId !== id),
      syncStatus: isOnline ? 'syncing' : 'offline',
      pendingSync: {
        ...state.pendingSync,
        deckIds: state.pendingSync.deckIds.filter((did) => did !== id),
        deletedDeckIds: Array.from(new Set([...state.pendingSync.deletedDeckIds, id])),
      },
    }));

    if (isOnline) {
      flashcardService.deleteDeck(id)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },

  moveDeck: (deckId, folderId) => {
    let targetDeck: Deck | undefined;
    const { user } = get();
    const isOnline = isFirebaseConfigured && navigator.onLine && Boolean(user);

    set((state) => {
      const decks = state.decks.map((d) => {
        if (d.id === deckId) {
          targetDeck = { ...d, folderId: folderId || null, updatedAt: Date.now(), userId: d.userId || user?.uid };
          return targetDeck;
        }
        return d;
      });
      return {
        decks,
        syncStatus: isOnline ? 'syncing' : 'offline',
        pendingSync: {
          ...state.pendingSync,
          deckIds: isOnline
            ? state.pendingSync.deckIds
            : Array.from(new Set([...state.pendingSync.deckIds, deckId])),
        },
      };
    });

    if (isOnline && targetDeck && user) {
      flashcardService.upsertDeck(targetDeck, user.uid)
        .then(() => set({ syncStatus: 'synced', lastSyncedAt: Date.now() }))
        .catch(() => set({ syncStatus: 'offline' }));
    }
  },
});
