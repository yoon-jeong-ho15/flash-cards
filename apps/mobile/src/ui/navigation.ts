import type { ViewMode } from "@flashcards/types";
export type Route =
  | Exclude<ViewMode, { type: "edit-deck" }>
  | (Extract<ViewMode, { type: "edit-deck" }> & { appendCard?: boolean })
  | { type: "folder-study"; folderId: string; shuffle?: boolean }
  | { type: "study-folder"; folderId: string }
  | { type: "study-options"; deckId: string }
  | { type: "study-library" }
  | { type: "search" }
  | { type: "account" };
export interface Navigation {
  go(route: Route): void;
  back(): void;
}
