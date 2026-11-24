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
      updated.add(item.id);
      removed.delete(item.id);
      nextVersions[`${collection}:${item.id}`] = revision;
    }
    for (const id of oldItems.keys()) {
      if (newIds.has(id)) continue;
      if (collection === 'cards') learnedOnly.delete(id);
      updated.delete(id);
      removed.add(id);
      nextVersions[`${collection}:${id}`] = revision;
    }
    next[upserts] = [...updated];
    next[deletes] = [...removed];
  }
  next.learnedOnlyCardIds = [...learnedOnly];
  return { pendingSync: next, pendingVersions: nextVersions };
}

export const hasPending = (pending: PendingSync) =>
  collections.some(([, upserts, deletes]) => pending[upserts].length > 0 || pending[deletes].length > 0);

export function acknowledge(current: PendingSync, versions: Record<string, number>,
  sent: PendingSync, sentVersions: Record<string, number>) {
  const pendingSync = { ...EMPTY_PENDING_SYNC };
  const pendingVersions = { ...versions };
  for (const [collection, ...keys] of collections) {
    for (const key of keys) {
      const sentIds = new Set(sent[key]);
      pendingSync[key] = current[key].filter(id => {
        const token = `${collection}:${id}`;
        const acknowledged = sentIds.has(id) && versions[token] === sentVersions[token];
        if (acknowledged) delete pendingVersions[token];
        return !acknowledged;
      });
    }
  }
  const learnedOnly = new Set(current.learnedOnlyCardIds);
  pendingSync.learnedOnlyCardIds = pendingSync.cardIds.filter(id => learnedOnly.has(id));
  return { pendingSync, pendingVersions };
}
