import { StateCreator } from 'zustand';
import { FlashcardStoreState, SetSlice } from '../types';

export const createSetSlice: StateCreator<FlashcardStoreState, [], [], SetSlice> = (_set, get) => ({
  sets: [],
  addSet: (data, cards = []) => get().saveSetWithCards(null, data, cards),
  updateSet: (id, updates) => get().applyChanges(state => {
    if (!state.sets.some(item => item.id === id)) throw new Error('세트가 다른 탭에서 삭제되었습니다.');
    if (updates.folderId && !state.folders.some(folder => folder.id === updates.folderId)) throw new Error('폴더가 삭제되었습니다.');
    return { sets: state.sets.map(item => item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item) };
  }),
  moveSet: (id, folderId) => get().updateSet(id, { folderId }),
  deleteSet: async id => {
    await get().applyChanges(state => ({
      sets: state.sets.filter(item => item.id !== id),
      cards: state.cards.filter(card => card.setId !== id),
    }));
  },
});
