import { StateCreator } from 'zustand';
import { FlashcardStoreState, CardSlice } from '../types';
import { Card, CardSet } from '../../types';

const touchSet = (sets: CardSet[], id: string) => sets.map(item =>
  item.id === id ? { ...item, updatedAt: Date.now() } : item);

export const createCardSlice: StateCreator<FlashcardStoreState, [], [], CardSlice> = (_set, get) => ({
  cards: [],
  addCard: async data => {
    const id = `card-${crypto.randomUUID()}`;
    await get().applyChanges(state => {
      if (!state.sets.some(item => item.id === data.setId)) throw new Error('세트가 삭제되었습니다.');
      return { cards: [...state.cards, { ...data, id, userId: state.user?.uid,
        order: data.order ?? Math.max(-1, ...state.cards.filter(c => c.setId === data.setId).map(c => c.order ?? -1)) + 1 }],
      sets: touchSet(state.sets, data.setId) };
    });
    return id;
  },
  updateCard: (id, updates) => get().applyChanges(state => {
    const card = state.cards.find(c => c.id === id);
    if (!card) throw new Error('카드가 다른 탭에서 삭제되었습니다.');
    return { cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c),
      sets: card ? touchSet(state.sets, card.setId) : state.sets };
  }, Object.keys(updates).length === 1 && typeof updates.learned === 'boolean' ? 'learned' : undefined),
  deleteCard: async id => {
    await get().applyChanges(state => {
      const card = state.cards.find(c => c.id === id);
      return { cards: state.cards.filter(c => c.id !== id),
        sets: card ? touchSet(state.sets, card.setId) : state.sets };
    });
  },
  saveSetWithCards: async (setId, data, items, base) => {
    const id = setId || `set-${crypto.randomUUID()}`;
    // Capture the edit base before waiting for the lock. The editor supplies its
    // original base even when external refreshes have already updated the store.
    const original = base || { set: get().sets.find(item => item.id === id),
      cards: get().cards.filter(card => card.setId === id) };
    await get().applyChanges(state => {
      const now = Date.now();
      const previous = state.sets.find(item => item.id === id);
      if (setId && !previous) throw new Error('세트가 다른 탭에서 삭제되었습니다. 입력 내용을 새 세트로 저장해 주세요.');
      const desired = { title: data.title.trim(), description: data.description?.trim() || undefined, folderId: data.folderId || null };
      const cardSet: CardSet = { ...previous, id, userId: state.user?.uid,
        title: previous?.title || desired.title, createdAt: previous?.createdAt ?? now, updatedAt: now };
      for (const key of ['title', 'description', 'folderId'] as const) {
        const oldValue = key === 'folderId' ? original.set?.folderId || null :
          key === 'description' ? original.set?.description?.trim() || undefined : original.set?.title;
        if (!original.set || desired[key] !== oldValue) {
          Object.assign(cardSet, { [key]: desired[key] });
        }
      }
      if (cardSet.folderId && !state.folders.some(folder => folder.id === cardSet.folderId)) {
        throw new Error('폴더가 삭제되었습니다. 다른 폴더를 선택해 주세요.');
      }
      const oldCards = new Map(original.cards.map(card => [card.id, card]));
      const desiredCards: Card[] = items.map((item, index) => ({ ...item, id: item.id || `card-${crypto.randomUUID()}`,
        setId: id, userId: state.user?.uid, order: index, learned: item.learned ?? false,
        backImageUrl: item.backImageUrl || item.imageUrl, imageUrl: item.backImageUrl || item.imageUrl }));
      const desiredById = new Map(desiredCards.map(card => [card.id, card]));
      const fields = ['termRichText', 'definitionRichText', 'frontImageUrl', 'backImageUrl', 'imageUrl', 'learned', 'order'] as const;
      const oldValue = (card: Card, field: typeof fields[number]) =>
        field === 'backImageUrl' || field === 'imageUrl' ? card.backImageUrl || card.imageUrl :
          field === 'learned' ? card.learned ?? false : card[field];
      const latestCards = state.cards.filter(card => card.setId === id);
      const latestIds = new Set(latestCards.map(card => card.id));
      for (const card of desiredCards) {
        const old = oldCards.get(card.id);
        if (old && !latestIds.has(card.id) && fields.some(field => field !== 'order' && card[field] !== oldValue(old, field))) {
          throw new Error('수정 중인 카드가 다른 탭에서 삭제되었습니다. 입력 내용을 복사한 뒤 다시 불러와 주세요.');
        }
      }
      const merged = latestCards.flatMap(card => {
        const old = oldCards.get(card.id);
        if (!old) return [card]; // Added in another tab; this form never removed it.
        const desiredCard = desiredById.get(card.id);
        if (!desiredCard) return []; // Explicit removal of a card in the edit base.
        const patch: Partial<Card> = {};
        for (const field of fields) if (desiredCard[field] !== oldValue(old, field)) Object.assign(patch, { [field]: desiredCard[field] });
        return [Object.keys(patch).length ? { ...card, ...patch } : card];
      });
      // A deleted card is never recreated from stale form input. New form cards
      // have fresh IDs; independent additions from both tabs survive.
      merged.push(...desiredCards.filter(card => !oldCards.has(card.id)));
      return { sets: previous ? state.sets.map(item => item.id === id ? cardSet : item) : [cardSet, ...state.sets],
        cards: [...state.cards.filter(card => card.setId !== id), ...merged] };
    });
    return id;
  },
  setCardLearned: (id, learned) => get().applyChanges(state => ({
    cards: state.cards.map(card => card.id === id ? { ...card, learned } : card),
  }), 'learned'),
  resetSetProgress: setId => get().applyChanges(state => ({
    cards: state.cards.map(card => card.setId === setId ? { ...card, learned: false } : card),
  }), 'learned'),
});
