import { AccountData, EMPTY_PENDING_SYNC, FlashcardStoreState, PendingSync } from './types';
import { collections } from './syncQueue';
import type { Card } from '../types';

export interface AccountSnapshot extends AccountData {
  pendingSync: PendingSync;
  pendingVersions: Record<string, number>;
  mutationRevision: number;
  cardConflicts: Record<string, Card>;
}
export const accountStorageKey = (uid?: string) => `flashcards_account_v1:${uid ? `user:${uid}` : 'guest'}`;
export const emptyAccount = (): AccountSnapshot => ({ folders: [], decks: [], cards: [],
  pendingSync: { ...EMPTY_PENDING_SYNC }, pendingVersions: {}, mutationRevision: 0, cardConflicts: {} });

const readCache = new Map<string, { raw: string; snapshot: AccountSnapshot }>();
export function readAccount(uid?: string): AccountSnapshot {
  const key = accountStorageKey(uid);
  // Always read storage, even when cached: only the exact durable string may be reused.
  const raw = localStorage.getItem(key);
  if (raw) {
    const cached = readCache.get(key);
    if (cached?.raw === raw) return cached.snapshot;
    const snapshot = { ...emptyAccount(), ...JSON.parse(raw) };
    readCache.set(key, { raw, snapshot });
    return snapshot;
  }
  readCache.delete(key);

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

const serializedCollections = new WeakMap<object, string>();
function serializeCollection(value: object): string {
  let serialized = serializedCollections.get(value);
  if (serialized === undefined) {
    serialized = JSON.stringify(value);
    serializedCollections.set(value, serialized);
  }
  return serialized;
}

function writeAccount(state: AccountSnapshot, uid?: string): void {
  const metadata = JSON.stringify({ pendingSync: state.pendingSync,
    pendingVersions: state.pendingVersions, mutationRevision: state.mutationRevision, cardConflicts: state.cardConflicts });
  // One atomic localStorage write. Acknowledgements reuse collection JSON rather than
  // walking every card (and embedded image) again just to update the outbox.
  const serialized = `{"folders":${serializeCollection(state.folders)},"decks":${serializeCollection(state.decks)},"cards":${serializeCollection(state.cards)},${metadata.slice(1)}`;
  localStorage.setItem(accountStorageKey(uid), serialized);
  readCache.set(accountStorageKey(uid), { raw: serialized, snapshot: state });
}

// All writers (including cloud pull and acknowledgement) use this origin-wide lock.
// There is deliberately no localStorage spin-lock or unlocked fallback.
export async function withAccountLock<T>(uid: string | undefined, kind: 'data' | 'sync', work: () => T | Promise<T>): Promise<T> {
  if (!navigator.locks) return Promise.reject(new Error('이 브라우저는 안전한 다중 탭 저장(Web Locks)을 지원하지 않습니다. 최신 브라우저와 HTTPS 환경을 사용해 주세요.'));
  return await navigator.locks.request(`${accountStorageKey(uid)}:${kind}`, async () => await work());
}

export function transactAccount(uid: string | undefined,
  change: (latest: AccountSnapshot) => AccountSnapshot | null,
  publish: (saved: AccountSnapshot) => void,
  active: () => boolean = () => true): Promise<void> {
  return withAccountLock(uid, 'data', () => {
    if (!active()) throw new Error('계정이 변경되어 저장을 취소했습니다.');
    const latest = readAccount(uid);
    const next = change(latest);
    if (!next) return;
    writeAccount(next, uid);
    publish(next);
  });
}

// Rendering may continue after a blocked/corrupt storage read. Transactions always
// use readAccount directly, so this empty view can never replace the recovery data.
export function loadAccountView(uid?: string) {
  try { return { ...readAccount(uid), storageError: null }; }
  catch (error) { return { ...emptyAccount(), storageError: error instanceof Error ? error.message : String(error) }; }
}
