import type { ViewMode } from '@flashcards/types';
export type Route = Exclude<ViewMode, { type: 'edit-deck' }> | (Extract<ViewMode, { type: 'edit-deck' }> & { appendCard?: boolean }) | { type: 'folder-study'; folderId: string } | { type: 'study-library' } | { type: 'search' } | { type: 'account' };
export interface Navigation { go(route: Route): void; back(): void }
