import { AccountData, PendingSync, EMPTY_PENDING_SYNC } from './types';

export const collections = [
  ['folders', 'folderIds', 'deletedFolderIds'],
  ['decks', 'deckIds', 'deletedDeckIds'],
  ['cards', 'cardIds', 'deletedCardIds'],
] as const;

export function enqueueChanges(before: AccountData, after: AccountData, pending: PendingSync,
  versions: Record<string, number>, revision: number) {
  const next = { ...pending };
  const nextVersions = { ...versions };
  for (const [collection, upserts, deletes] of collections) {
    if (before[collection] === after[collection]) continue;
    const oldItems = new Map<string, unknown>(before[collection].map(item => [item.id, item]));
    const newIds = new Set(after[collection].map(item => item.id));
    const updated = new Set(pending[upserts]);
    const removed = new Set(pending[deletes]);
    for (const item of after[collection]) {
      if (oldItems.get(item.id) === item) continue;
      updated.add(item.id);
      removed.delete(item.id);
      nextVersions[`${collection}:${item.id}`] = revision;
    }
    for (const id of oldItems.keys()) {
      if (newIds.has(id)) continue;
      updated.delete(id);
      removed.add(id);
      nextVersions[`${collection}:${id}`] = revision;
    }
    next[upserts] = [...updated];
    next[deletes] = [...removed];
  }
  return { pendingSync: next, pendingVersions: nextVersions };
}

export const hasPending = (pending: PendingSync) => Object.values(pending).some(ids => ids.length > 0);

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
  return { pendingSync, pendingVersions };
}
