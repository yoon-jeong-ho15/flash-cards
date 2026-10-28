import { AccountData, EMPTY_PENDING_SYNC, FlashcardStoreState, PendingSync } from './types';
import { collections } from './syncQueue';

export interface AccountSnapshot extends AccountData {
  pendingSync: PendingSync;
  pendingVersions: Record<string, number>;
  mutationRevision: number;
}
export const accountStorageKey = (uid?: string) => `flashcards_account_v1:${uid ? `user:${uid}` : 'guest'}`;
export const emptyAccount = (): AccountSnapshot => ({ folders: [], decks: [], cards: [],
  pendingSync: { ...EMPTY_PENDING_SYNC }, pendingVersions: {}, mutationRevision: 0 });

export function readAccount(uid?: string): AccountSnapshot {
  const raw = localStorage.getItem(accountStorageKey(uid));
  if (raw) return { ...emptyAccount(), ...JSON.parse(raw) };

  // Keep the original key as a recovery copy. Never assign another account's cache to this user.
  const legacyRaw = localStorage.getItem('quizlet_flashcards_v1');
  if (!legacyRaw) return emptyAccount();
  const legacy = JSON.parse(legacyRaw).state as Partial<FlashcardStoreState>;
  const owners = new Set([...(legacy.folders || []), ...(legacy.decks || []), ...(legacy.cards || [])]
    .map(item => item.userId).filter(Boolean));
  const owner = legacy.user?.uid || (owners.size === 1 ? [...owners][0] : undefined);
  if (owner !== uid || (!owner && owners.size > 0)) return emptyAccount();
  const snapshot: AccountSnapshot = { ...emptyAccount(),
    folders: legacy.folders || [], decks: legacy.decks || [], cards: legacy.cards || [],
    pendingSync: { ...EMPTY_PENDING_SYNC, ...legacy.pendingSync }, mutationRevision: 1 };
  for (const [collection, ...keys] of collections) {
    for (const key of keys) {
      for (const id of snapshot.pendingSync[key]) snapshot.pendingVersions[`${collection}:${id}`] = 1;
    }
  }
  return snapshot;
}

export function writeAccount(state: FlashcardStoreState): void {
  const snapshot: AccountSnapshot = { folders: state.folders, decks: state.decks, cards: state.cards,
    pendingSync: state.pendingSync, pendingVersions: state.pendingVersions, mutationRevision: state.mutationRevision };
  localStorage.setItem(accountStorageKey(state.user?.uid), JSON.stringify(snapshot));
}
