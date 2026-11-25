import { useCallback, useState } from 'react';
import type { DeckSortOption } from '../types';

const DECK_SORT_OPTIONS: readonly DeckSortOption[] = [
  'name-asc',
  'name-desc',
  'date-desc',
  'date-asc',
];

const DEFAULT_DECK_SORT: DeckSortOption = 'date-desc';

const isDeckSortOption = (value: string | null): value is DeckSortOption =>
  value !== null && DECK_SORT_OPTIONS.some((option) => option === value);

const readDeckSortPreference = (storageKey: string): DeckSortOption => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (isDeckSortOption(saved)) {
      return saved;
    }
  } catch {
    // ignore storage error
  }
  return DEFAULT_DECK_SORT;
};

/** Manages persisted deck sort option state for a view-specific localStorage key. */
export function useDeckSortPreference(storageKey: string) {
  const [sortBy, setSortBy] = useState<DeckSortOption>(() => readDeckSortPreference(storageKey));

  const setDeckSort = useCallback(
    (newSort: DeckSortOption) => {
      setSortBy(newSort);
      try {
        localStorage.setItem(storageKey, newSort);
      } catch {
        // Keep the selected sort active in memory when storage writes fail.
      }
    },
    [storageKey]
  );

  return [sortBy, setDeckSort] as const;
}
