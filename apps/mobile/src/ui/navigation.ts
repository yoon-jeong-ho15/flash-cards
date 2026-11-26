import type { ViewMode } from "@flashcards/types";
export type Route =
  | Exclude<ViewMode, { type: "edit-set" }>
  | (Extract<ViewMode, { type: "edit-set" }> & { appendCard?: boolean })
  | { type: "folder-study"; folderId: string; shuffle?: boolean }
  | { type: "study-folder"; folderId: string }
  | { type: "study-options"; setId: string }
  | { type: "study-library" }
  | { type: "search" }
  | { type: "account" };
export interface Navigation {
  go(route: Route): void;
  back(): void;
}
