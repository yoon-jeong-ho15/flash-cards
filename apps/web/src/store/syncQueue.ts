import { AccountData, PendingSync, EMPTY_PENDING_SYNC } from './types';
import type { Card } from '../types';

export const collections = [
  ['folders', 'folderIds', 'deletedFolderIds'],
  ['decks', 'deckIds', 'deletedDeckIds'],
  ['cards', 'cardIds', 'deletedCardIds'],
] as const;

export function enqueueChanges(before: AccountData, after: AccountData, pending: PendingSync,
  versions: Record<string, number>, revision: number, cardChange?: 'learned') {
  const next = { ...pending };
  const nextVersions = { ...versions };
  const writeStates = { ...pending.writeStates };
  const learnedOnly = new Set(pending.learnedOnlyCardIds);
  for (const [collection, upserts, deletes] of collections) {
    if (before[collection] === after[collection]) continue;
    const oldItems = new Map<string, unknown>(before[collection].map(item => [item.id, item]));
    const newIds = new Set(after[collection].map(item => item.id));
    const updated = new Set(pending[upserts]);
    const removed = new Set(pending[deletes]);
    for (const item of after[collection]) {
      const previous = oldItems.get(item.id);
      if (previous === item) continue;
      if (collection === 'cards') {
        const oldCard = previous as Card | undefined;
        const card = item as Card;
        const sameContent = oldCard && (Object.keys({ ...oldCard, ...card }) as (keyof Card)[])
          .every(key => key === 'learned' || Object.is(oldCard[key], card[key]));
        if (sameContent && oldCard.learned === card.learned && cardChange !== 'learned') continue;
        if (sameContent &&
            (!updated.has(item.id) || learnedOnly.has(item.id))) learnedOnly.add(item.id);
        else learnedOnly.delete(item.id);
      }
      const token = `${collection}:${item.id}`;
      if (!updated.has(item.id)) {
        writeStates[token] = previous ? 'existing' : removed.has(item.id) ? 'attempted' : 'unsent';
      }
      updated.add(item.id);
      removed.delete(item.id);
      nextVersions[token] = revision;
    }
    for (const id of oldItems.keys()) {
      if (newIds.has(id)) continue;
      if (collection === 'cards') learnedOnly.delete(id);
      const token = `${collection}:${id}`;
      const queued = updated.delete(id);
      if (writeStates[token] === 'unsent') {
        delete writeStates[token];
        delete nextVersions[token];
        removed.delete(id);
        continue;
      }
      // A legacy upsert may already be a creation that was sent.
      writeStates[token] = queued && writeStates[token] !== 'existing' ? 'attempted' : 'existing';
      removed.add(id);
      nextVersions[token] = revision;
    }
    next[upserts] = [...updated];
    next[deletes] = [...removed];
  }
  next.learnedOnlyCardIds = [...learnedOnly];
  next.writeStates = writeStates;
  return { pendingSync: next, pendingVersions: nextVersions };
}

export function markCreationsAttempted(pending: PendingSync): PendingSync {
  const unsent = Object.entries(pending.writeStates ?? {}).filter(([, state]) => state === 'unsent');
  if (!unsent.length) return pending;
  const writeStates = { ...pending.writeStates };
  for (const [token] of unsent) writeStates[token] = 'attempted';
  return { ...pending, writeStates };
}

export function omitDeferredDeletes(pending: PendingSync, versions: Record<string, number>,
  deferred: ReadonlyMap<string, number | undefined>): PendingSync {
  if (!deferred.size) return pending;
  const next = { ...pending };
  for (const [collection, , deletes] of collections) {
    next[deletes] = pending[deletes].filter(id => {
      const token = `${collection}:${id}`;
      return !deferred.has(token) || deferred.get(token) !== versions[token];
    });
  }
  return next;
}

export const hasPending = (pending: PendingSync) =>
  collections.some(([, upserts, deletes]) => pending[upserts].length > 0 || pending[deletes].length > 0);

export function acknowledge(current: PendingSync, versions: Record<string, number>,
  sent: PendingSync, sentVersions: Record<string, number>) {
  const pendingSync = { ...EMPTY_PENDING_SYNC };
  const pendingVersions = { ...versions };
  const writeStates = { ...current.writeStates };
  for (const [collection, upserts, deletes] of collections) {
    for (const key of [upserts, deletes]) {
      const sentIds = new Set(sent[key]);
      pendingSync[key] = current[key].filter(id => {
        const token = `${collection}:${id}`;
        const acknowledged = sentIds.has(id) && versions[token] === sentVersions[token];
        if (acknowledged) {
          delete pendingVersions[token];
          delete writeStates[token];
        } else if (key === upserts && sentIds.has(id) && writeStates[token] === 'attempted') {
          writeStates[token] = 'existing';
        }
        return !acknowledged;
      });
    }
  }
  const learnedOnly = new Set(current.learnedOnlyCardIds);
  pendingSync.learnedOnlyCardIds = pendingSync.cardIds.filter(id => learnedOnly.has(id));
  pendingSync.writeStates = writeStates;
  return { pendingSync, pendingVersions };
}
