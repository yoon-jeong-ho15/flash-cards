import { Parser } from 'htmlparser2';
import type { Card, CardInput, Deck, DeckSortOption } from './types';

/** Decode entities and search visible text without indexing markup or image URLs. */
export function plainText(html: string): string {
  let text = '';
  let hidden = 0;
  const parser = new Parser({
    onopentag(name) { if (['script', 'style'].includes(name)) hidden++; if (['p', 'br', 'li'].includes(name)) text += ' '; },
    onclosetag(name) { if (['script', 'style'].includes(name)) hidden = Math.max(0, hidden - 1); },
    ontext(value) { if (!hidden) text += value; },
  }, { decodeEntities: true });
  parser.end(html);
  return text.replace(/[\s\u200b\ufeff]+/g, ' ').trim();
}
export function hasContent(card: CardInput): boolean {
  return Boolean(plainText(card.termRichText + card.definitionRichText) ||
    /<img\b/i.test(card.termRichText + card.definitionRichText) ||
    card.frontImageUrl || card.backImageUrl || card.imageUrl);
}
export const matches = (text: string, query: string) => text.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR'));
export const cardMatches = (card: Card, query: string) => matches(plainText(`${card.termRichText} ${card.definitionRichText}`), query);
export const orderedCards = (cards: Card[], deckId: string) => cards.filter(c => c.deckId === deckId).sort((a, b) =>
  (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id));
export function folderCards(cards: Card[], decks: Deck[], folderId: string): Card[] {
  const deckIds = new Set(decks.filter(deck => deck.folderId === folderId).map(deck => deck.id));
  return cards.filter(card => deckIds.has(card.deckId));
}
export function sortDecks<T extends Pick<Deck, 'title' | 'createdAt'> & { updatedAt?: number }>(items: T[], sort: DeckSortOption): T[] {
  return [...items].sort((a, b) => {
    const name = a.title.localeCompare(b.title, 'ko', { numeric: true });
    const time = (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    if (sort === 'name-asc') return name || time;
    if (sort === 'name-desc') return -name || time;
    return (sort === 'date-asc' ? -time : time) || name;
  });
}
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
