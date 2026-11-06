import { useSyncExternalStore } from 'react';

export type CollectionLayout = 'grid' | 'list';
const storageKey = 'flashcard_library_layout';
const listeners = new Set<() => void>();
const readLayout = (): CollectionLayout => {
  try {
    return localStorage.getItem(storageKey) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
};
let layout = readLayout();
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    layout = readLayout();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
function setLayout(value: CollectionLayout) {
  layout = value;
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // Keep the selection usable when browser storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}
export function useCollectionLayout() {
  const value = useSyncExternalStore(subscribe, () => layout, () => 'grid' as const);
  return {
    layout: value,
    setLayout,
    collectionClassName: value === 'grid'
      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3'
      : 'flex flex-col gap-3',
  };
}
