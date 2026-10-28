import type { CardFormItem } from '../components/deck/DeckCardEditorItem';

export interface DeckDraftData {
  deckId?: string;
  title: string;
  description: string;
  selectedFolderId: string | null;
  cardItems: CardFormItem[];
  savedAt: number;
}
export const draftStorageKey = (uid?: string, deckId?: string) =>
  `flashcards_draft_v2:${uid ? `user:${uid}` : 'guest'}:${deckId || 'new'}`;

export function loadDeckDraft(uid?: string, deckId?: string): DeckDraftData | null {
  try {
    const key = draftStorageKey(uid, deckId);
    let raw = localStorage.getItem(key);
    // Legacy drafts lack ownership. Only migrate existing decks whose owner can be verified.
    if (!raw && uid && deckId) {
      const legacy = JSON.parse(localStorage.getItem('quizlet_flashcards_v1') || 'null')?.state;
      if (legacy?.user?.uid === uid && legacy.decks?.some((deck: { id: string }) => deck.id === deckId)) {
        raw = localStorage.getItem(`flashcards_deck_draft_${deckId}`);
        if (raw) localStorage.setItem(key, raw);
      }
    }
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.title !== 'string' || !Array.isArray(draft.cardItems)) return null;
    return draft;
  } catch (error) {
    console.error('Failed to load deck draft:', error);
    return null;
  }
}

export function saveDeckDraft(uid: string | undefined, draft: DeckDraftData): boolean {
  try {
    localStorage.setItem(draftStorageKey(uid, draft.deckId), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Failed to save deck draft:', error);
    return false;
  }
}

export function removeDeckDraft(uid?: string, deckId?: string): void {
  localStorage.removeItem(draftStorageKey(uid, deckId));
  // Mark this scope as migrated so an old draft cannot reappear after a save/discard.
  localStorage.setItem(draftStorageKey(uid, deckId), 'null');
}
