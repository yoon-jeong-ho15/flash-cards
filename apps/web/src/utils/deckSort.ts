import type { Deck, DeckSortOption } from '../types';

const compareTitles = (a: string, b: string) => a.localeCompare(b, 'ko', { numeric: true });

export function sortDecks(decks: readonly Deck[], sortBy: DeckSortOption): Deck[] {
  return [...decks].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt || 0;
    const timeB = b.updatedAt || b.createdAt || 0;

    switch (sortBy) {
      case 'name-asc':
        return compareTitles(a.title, b.title) || timeB - timeA;
      case 'name-desc':
        return compareTitles(b.title, a.title) || timeB - timeA;
      case 'date-asc':
        return timeA === timeB ? compareTitles(a.title, b.title) : timeA - timeB;
      case 'date-desc':
        return timeA === timeB ? compareTitles(a.title, b.title) : timeB - timeA;
      default:
        return 0;
    }
  });
}
