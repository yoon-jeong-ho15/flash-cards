import { AccountData, PendingSync, EMPTY_PENDING_SYNC } from './types';
import { decideMissingCardSync, shouldPromoteCardToLearnedOnly, type SyncWriteResult } from '@flashcards/types';
import type { AccountSnapshot } from './accountStorage';
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
  const refreshImages = new Set(pending.refreshImageCardIds);
  const cardContentVersions = { ...pending.cardContentVersions };
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
        if (sameContent && (!updated.has(item.id) || learnedOnly.has(item.id))) {
          learnedOnly.add(item.id);
          delete cardContentVersions[item.id];
        } else {
          learnedOnly.delete(item.id);
          refreshImages.delete(item.id);
          if (sameContent) {
            const existingContentVersion = cardContentVersions[item.id] ?? versions[`cards:${item.id}`];
            if (existingContentVersion !== undefined) cardContentVersions[item.id] = existingContentVersion;
          } else {
            cardContentVersions[item.id] = revision;
          }
        }
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
      if (collection === 'cards') {
        learnedOnly.delete(id);
        refreshImages.delete(id);
        delete cardContentVersions[id];
      }
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
  if (Object.keys(cardContentVersions).length) next.cardContentVersions = cardContentVersions;
  else delete next.cardContentVersions;
  if (pending.refreshImageCardIds) next.refreshImageCardIds = [...refreshImages];
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

export const countPending = (pending: PendingSync) =>
  collections.reduce((sum, [, upserts, deletes]) => sum + pending[upserts].length + pending[deletes].length, 0);

export const hasPending = (pending: PendingSync) =>
  collections.some(([, upserts, deletes]) => pending[upserts].length > 0 || pending[deletes].length > 0);

export function acknowledge(current: PendingSync, versions: Record<string, number>,
  sent: PendingSync, sentVersions: Record<string, number>) {
  const pendingSync = { ...current };
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

export function applyWriteResults(latest: AccountSnapshot, sent: AccountSnapshot, results: SyncWriteResult[],
  refreshCards: Set<string>, deferred: Map<string, number | undefined>): AccountSnapshot {
  const outcomes = new Map(results.map(result => [result.key, result]));
  const writeStates = { ...latest.pendingSync.writeStates };
  const versions = { ...latest.pendingVersions };
  const pending = { ...latest.pendingSync, writeStates };
  const learnedOnly = new Set(pending.learnedOnlyCardIds);
  const cardContentVersions = { ...pending.cardContentVersions };
  const refreshImages = new Set(pending.refreshImageCardIds);
  const confirmed = { ...EMPTY_PENDING_SYNC };
  let cards = latest.cards;
  let cardConflicts = latest.cardConflicts;
  const sentCards = new Map(sent.cards.map(card => [card.id, card]));
  for (const [kind, upserts, deletes] of collections) {
    for (const field of [upserts, deletes]) {
      const ids: string[] = [];
      for (const id of sent.pendingSync[field]) {
        const key = `${kind}:${id}`;
        const result = outcomes.get(key);
        if (!result) continue;
        const { outcome } = result;
        const firstCreate = sent.pendingSync.writeStates?.[key] === 'unsent';
        if (outcome === 'not-sent') {
          if (!firstCreate || writeStates[key] !== 'attempted') continue;
          if (pending[deletes].includes(id)) {
            pending[deletes] = pending[deletes].filter(value => value !== id);
            delete writeStates[key];
            delete versions[key];
          } else writeStates[key] = 'unsent';
          continue;
        }
        if (outcome === 'missing' && field === deletes && sent.pendingSync.writeStates?.[key] !== 'existing') {
          deferred.set(key, sent.pendingVersions[key]);
          continue;
        }
        const sameVersion = versions[key] === sent.pendingVersions[key];
        if (field === 'cardIds' && pending.cardIds.includes(id)) {
          const card = cards.find(card => card.id === id);
          const sentCard = sentCards.get(id);
          if (card?.contentVersion !== sentCard?.contentVersion &&
              (outcome === 'conflict' || outcome === 'missing' ||
                (outcome === 'written' && result.contentVersion))) continue;
          if (outcome === 'conflict') {
            if (!sameVersion || !card) continue;
            cardConflicts = { ...cardConflicts, [id]: card };
            cards = cards.map(item => item === card ? result.serverCard : item);
            refreshImages.delete(id);
          }
          if (outcome === 'written' && result.contentVersion) {
            // A confirmed write can advance later local edits on the same base.
            cards = cards.map(item => item === card ? { ...item, contentVersion: result.contentVersion } : item);
          }
        }
        if (field === 'cardIds' && outcome === 'missing' && pending.cardIds.includes(id)) {
          if (
            decideMissingCardSync({
              sameRevision: sameVersion,
              currentLearnedOnly: learnedOnly.has(id),
            }) === 'remove'
          ) {
            cards = cards.filter(card => card.id !== id);
            pending.cardIds = pending.cardIds.filter(value => value !== id);
          } else {
            // Keep edits made during the request without recreating a remotely deleted ID.
            const copyId = `card-${crypto.randomUUID()}`;
            cards = cards.map(card => card.id === id ? { ...card, id: copyId, contentVersion: undefined } : card);
            pending.cardIds = pending.cardIds.map(value => value === id ? copyId : value);
            versions[`cards:${copyId}`] = versions[key];
            writeStates[`cards:${copyId}`] = 'unsent';
            cardContentVersions[copyId] = versions[key];
          }
          refreshImages.delete(id);
          learnedOnly.delete(id);
          delete cardContentVersions[id];
          delete versions[key];
          delete writeStates[key];
        } else if (field === 'cardIds' && sameVersion && refreshCards.has(id)) {
          refreshImages.add(id);
        } else if (field === upserts && outcome === 'written' && pending[deletes].includes(id)) {
          writeStates[key] = 'existing';
        } else if (
          field === 'cardIds' &&
          outcome === 'written' &&
          pending.cardIds.includes(id) &&
          shouldPromoteCardToLearnedOnly({
            sameRevision: sameVersion,
            sentLearnedOnly: Boolean(sent.pendingSync.learnedOnlyCardIds?.includes(id)),
            currentLearnedOnly: learnedOnly.has(id),
            sentRevision: sent.pendingVersions[key],
            sentContentRevision: sent.pendingSync.cardContentVersions?.[id],
            currentRevision: versions[key],
            currentContentRevision: cardContentVersions[id],
          })
        ) {
          learnedOnly.add(id);
          delete cardContentVersions[id];
        }
        ids.push(id);
      }
      confirmed[field] = ids;
    }
  }
  if (refreshImages.size || pending.refreshImageCardIds) pending.refreshImageCardIds = [...refreshImages];
  if (learnedOnly.size || pending.learnedOnlyCardIds) pending.learnedOnlyCardIds = [...learnedOnly];
  const acknowledged = acknowledge(pending, versions, confirmed, sent.pendingVersions);
  const remainingCards = new Set(acknowledged.pendingSync.cardIds);
  for (const id of Object.keys(cardContentVersions)) {
    if (!remainingCards.has(id)) delete cardContentVersions[id];
  }
  if (Object.keys(cardContentVersions).length) acknowledged.pendingSync.cardContentVersions = cardContentVersions;
  else delete acknowledged.pendingSync.cardContentVersions;
  return { ...latest, cards, cardConflicts, ...acknowledged };
}
