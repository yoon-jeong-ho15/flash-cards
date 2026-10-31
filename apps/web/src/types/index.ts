// Re-export shared types from @flashcards/types package
export * from '@flashcards/types';
import type { ViewMode as SharedViewMode } from '@flashcards/types';

export type ViewMode = SharedViewMode | { type: 'folder-study'; folderId: string };
