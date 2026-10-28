import type { Card } from '../types';
import type { AccountData } from './types';

interface CardIndex { byId: Map<string, Card>; byDeck: Map<string, Card[]> }
const cache = new WeakMap<Card[], CardIndex>();
let previous: CardIndex | undefined;
const emptyCards: Card[] = [];

export function indexCards(cards: Card[]): CardIndex {
  const cached = cache.get(cards);
  if (cached) return cached;
  const byId = new Map<string, Card>();
  const byDeck = new Map<string, Card[]>();
  for (const card of cards) {
    byId.set(card.id, card);
    const group = byDeck.get(card.deckId);
    if (group) group.push(card); else byDeck.set(card.deckId, [card]);
  }
  for (const [id, group] of byDeck) {
    group.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.id.localeCompare(b.id);
    });
    const old = previous?.byDeck.get(id);
    if (old && old.length === group.length && old.every((card, i) => card === group[i])) byDeck.set(id, old);
  }
  const index = { byId, byDeck };
  cache.set(cards, index);
  previous = index;
  return index;
}

export const selectDeckCards = (state: Pick<AccountData, 'cards'>, deckId: string) =>
  indexCards(state.cards).byDeck.get(deckId) || emptyCards;
