import type { Card } from '../types';
import type { AccountData } from './types';

interface CardIndex { byId: Map<string, Card>; bySet: Map<string, Card[]> }
const cache = new WeakMap<Card[], CardIndex>();
let previous: CardIndex | undefined;
const emptyCards: Card[] = [];

export function indexCards(cards: Card[]): CardIndex {
  const cached = cache.get(cards);
  if (cached) return cached;
  const byId = new Map<string, Card>();
  const bySet = new Map<string, Card[]>();
  for (const card of cards) {
    byId.set(card.id, card);
    const group = bySet.get(card.setId);
    if (group) group.push(card); else bySet.set(card.setId, [card]);
  }
  for (const [id, group] of bySet) {
    group.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.id.localeCompare(b.id);
    });
    const old = previous?.bySet.get(id);
    if (old && old.length === group.length && old.every((card, i) => card === group[i])) bySet.set(id, old);
  }
  const index = { byId, bySet };
  cache.set(cards, index);
  previous = index;
  return index;
}

export const selectSetCards = (state: Pick<AccountData, 'cards'>, setId: string) =>
  indexCards(state.cards).bySet.get(setId) || emptyCards;

export function selectFolderCards(state: Pick<AccountData, 'cards' | 'sets'>, folderId: string): Card[] {
  const setIds = new Set(state.sets.filter(set => set.folderId === folderId).map(set => set.id));
  return state.cards.filter(card => setIds.has(card.setId));
}
