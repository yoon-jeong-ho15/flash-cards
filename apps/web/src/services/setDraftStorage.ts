import type { CardFormItem } from '../components/set/SetCardEditorItem';

export interface SetDraftData {
  setId?: string;
  title: string;
  description: string;
  selectedFolderId: string | null;
  cardItems: CardFormItem[];
  savedAt: number;
}
export const draftStorageKey = (uid?: string, setId?: string) =>
  `flashcards_draft_v2:${uid ? `user:${uid}` : 'guest'}:${setId || 'new'}`;

export function loadSetDraft(uid?: string, setId?: string): SetDraftData | null {
  try {
    const key = draftStorageKey(uid, setId);
    let raw = localStorage.getItem(key);
    // Legacy drafts lack ownership. Only migrate existing sets whose owner can be verified.
    if (!raw && uid && setId) {
      const legacy = JSON.parse(localStorage.getItem('quizlet_flashcards_v1') || 'null')?.state;
      const legacySets = legacy?.sets || legacy?.decks;
      if (legacy?.user?.uid === uid && legacySets?.some((item: { id: string }) => item.id === setId)) {
        raw = localStorage.getItem(`flashcards_set_draft_${setId}`) ?? localStorage.getItem(`flashcards_deck_draft_${setId}`);
        if (raw) localStorage.setItem(key, raw);
      }
    }
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.title !== 'string' || !Array.isArray(draft.cardItems)) return null;
    return draft;
  } catch (error) {
    console.error('Failed to load set draft:', error);
    return null;
  }
}

export function saveSetDraft(uid: string | undefined, draft: SetDraftData): boolean {
  try {
    localStorage.setItem(draftStorageKey(uid, draft.setId), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Failed to save set draft:', error);
    return false;
  }
}

export function removeSetDraft(uid?: string, setId?: string): void {
  localStorage.removeItem(draftStorageKey(uid, setId));
  // Mark this scope as migrated so an old draft cannot reappear after a save/discard.
  localStorage.setItem(draftStorageKey(uid, setId), 'null');
}
