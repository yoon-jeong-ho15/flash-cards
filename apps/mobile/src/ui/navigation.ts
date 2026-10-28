import type { ViewMode } from '@flashcards/types';
export type Route = ViewMode | { type: 'search' } | { type: 'account' };
export interface Navigation { go(route: Route): void; back(): void }
