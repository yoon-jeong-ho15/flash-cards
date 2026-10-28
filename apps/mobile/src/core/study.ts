import type { Card } from './types';
import { shuffled } from './content';

export interface StudySession { ids: string[]; index: number; flipped: boolean; round: number; finished: boolean; shuffle: boolean }
export function startSession(cards: Card[], shuffle = false, unlearnedOnly = true, round = 1): StudySession {
  const target = cards.filter(c => !unlearnedOnly || !c.learned).map(c => c.id);
  return { ids: shuffle ? shuffled(target) : target, index: 0, flipped: false, round, finished: !target.length, shuffle };
}
/** Resolve against current data so inline edits/deletions and cloud updates stay visible. */
export function reconcileSession(session: StudySession, cards: Card[]): StudySession {
  const available = new Set(cards.map(c => c.id));
  const currentId = session.ids[session.index];
  const ids = session.ids.filter(id => available.has(id));
  const retainedIndex = ids.indexOf(currentId);
  const index = retainedIndex >= 0 ? retainedIndex : Math.min(session.index, Math.max(0, ids.length - 1));
  return { ...session, ids, index, flipped: retainedIndex < 0 ? false : session.flipped, finished: session.finished || !ids.length };
}
export function stepSession(session: StudySession, delta: -1 | 1): StudySession {
  if (delta === 1 && session.index >= session.ids.length - 1) return { ...session, finished: true };
  return { ...session, index: Math.max(0, session.index + delta), flipped: false };
}
