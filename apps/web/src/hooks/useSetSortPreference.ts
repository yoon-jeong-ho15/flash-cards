import { useCallback, useState } from 'react';
import type { SetSortOption } from '../types';

const SET_SORT_OPTIONS: readonly SetSortOption[] = [
  'name-asc',
  'name-desc',
  'date-desc',
  'date-asc',
];

const DEFAULT_SET_SORT: SetSortOption = 'date-desc';

const isSetSortOption = (value: string | null): value is SetSortOption =>
  value !== null && SET_SORT_OPTIONS.some((option) => option === value);

const readSetSortPreference = (storageKey: string): SetSortOption => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (isSetSortOption(saved)) {
      return saved;
    }
  } catch {
    // ignore storage error
  }
  return DEFAULT_SET_SORT;
};

/** Manages persisted set sort option state for a view-specific localStorage key. */
export function useSetSortPreference(storageKey: string) {
  const [sortBy, setSortBy] = useState<SetSortOption>(() => readSetSortPreference(storageKey));

  const setSortOption = useCallback(
    (newSort: SetSortOption) => {
      setSortBy(newSort);
      try {
        localStorage.setItem(storageKey, newSort);
      } catch {
        // Keep the selected sort active in memory when storage writes fail.
      }
    },
    [storageKey]
  );

  return [sortBy, setSortOption] as const;
}
