import { StateCreator } from 'zustand';
import { FlashcardStoreState, FolderSlice } from '../types';

export const createFolderSlice: StateCreator<FlashcardStoreState, [], [], FolderSlice> = (_set, get) => ({
  folders: [],
  addFolder: async (title, description) => {
    const id = `folder-${crypto.randomUUID()}`;
    await get().applyChanges(state => ({ folders: [...state.folders, { id, title: title.trim(),
      description: description?.trim(), createdAt: Date.now(), userId: state.user?.uid }] }));
    return id;
  },
  updateFolder: (id, updates) => get().applyChanges(state => {
    if (!state.folders.some(folder => folder.id === id)) throw new Error('폴더가 다른 탭에서 삭제되었습니다.');
    return { folders: state.folders.map(folder => folder.id === id ? { ...folder, ...updates } : folder) };
  }),
  deleteFolder: (id, deleteContainedSets = false) => get().applyChanges(state => {
    const setIds = new Set(state.sets.filter(item => item.folderId === id).map(item => item.id));
    return {
      folders: state.folders.filter(folder => folder.id !== id),
      sets: deleteContainedSets ? state.sets.filter(item => !setIds.has(item.id)) :
        state.sets.map(item => setIds.has(item.id) ? { ...item, folderId: null, updatedAt: Date.now() } : item),
      cards: deleteContainedSets ? state.cards.filter(card => !setIds.has(card.setId)) : state.cards,
    };
  }),
});
