import { matchRoutes } from 'react-router';
import type { ViewMode } from './types';
import type { FlashcardStoreState } from './store/types';

const routes = [
  { path: '/', id: 'dashboard' },
  { path: '/account', id: 'account' },
  { path: '/folders', id: 'all-folders' },
  { path: '/folders/:folderId', id: 'folder' },
  { path: '/folders/:folderId/study', id: 'folder-study' },
  { path: '/sets', id: 'all-sets' },
  { path: '/sets/new', id: 'new-set' },
  { path: '/sets/:setId', id: 'set' },
  { path: '/sets/:setId/edit', id: 'edit-set' },
  { path: '/sets/:setId/study', id: 'study' },
];

// The URL is the only source of navigation state. ViewMode remains a UI adapter
// for the existing screens and navigation components, not a second state store.
export function resolveView(pathname: string, search = ''): ViewMode | null {
  const match = matchRoutes(routes, pathname)?.[0];
  if (!match) return null;
  const { setId, folderId } = match.params;
  const query = new URLSearchParams(search);
  switch (match.route.id) {
    case 'dashboard': return { type: 'dashboard' };
    case 'account': return { type: 'account' };
    case 'all-folders': return { type: 'all-folders' };
    case 'all-sets': return { type: 'all-sets' };
    case 'folder': return { type: 'folder', folderId: folderId! };
    case 'folder-study': return { type: 'folder-study', folderId: folderId! };
    case 'set': return { type: 'set', setId: setId! };
    case 'new-set': return { type: 'edit-set', folderId: query.get('folderId') || undefined };
    case 'edit-set': return { type: 'edit-set', setId: setId!, focusCardId: query.get('cardId') || undefined };
    case 'study': return { type: 'study', setId: setId!, onlyDifficult: query.get('onlyDifficult') === '1', shuffle: query.get('shuffle') === '1' };
    default: return null;
  }
}

export function viewUrl(view: ViewMode): string {
  const query = new URLSearchParams();
  let path: string;
  switch (view.type) {
    case 'dashboard': return '/';
    case 'account': return '/account';
    case 'all-folders': return '/folders';
    case 'all-sets': return '/sets';
    case 'folder': return `/folders/${encodeURIComponent(view.folderId)}`;
    case 'folder-study': return `/folders/${encodeURIComponent(view.folderId)}/study`;
    case 'set': return `/sets/${encodeURIComponent(view.setId)}`;
    case 'edit-set':
      path = view.setId ? `/sets/${encodeURIComponent(view.setId)}/edit` : '/sets/new';
      if (!view.setId && view.folderId) query.set('folderId', view.folderId);
      if (view.setId && view.focusCardId) query.set('cardId', view.focusCardId);
      break;
    case 'study':
      path = `/sets/${encodeURIComponent(view.setId)}/study`;
      if (view.onlyDifficult) query.set('onlyDifficult', '1');
      if (view.shuffle) query.set('shuffle', '1');
      break;
  }
  return query.size ? `${path}?${query}` : path;
}

type RouteData = Pick<FlashcardStoreState,
  'isAuthInitialized' | 'isInitialSyncComplete' | 'user' | 'syncStatus' | 'sets' | 'folders'>;

export function routeStatus(view: ViewMode | null, state: RouteData) {
  if (!state.isAuthInitialized) return 'loading';
  if (view?.type === 'account') return 'ready';
  if (state.user && !state.isInitialSyncComplete) return 'loading';
  if (!view) return 'not-found';
  const setId = 'setId' in view ? view.setId : undefined;
  const folderId = 'folderId' in view ? view.folderId : undefined;
  const missing = (setId && !state.sets.some(set => set.id === setId)) ||
    (folderId && !state.folders.some(folder => folder.id === folderId));
  if (!missing) return 'ready';
  if (state.user && state.syncStatus === 'syncing') return 'loading';
  if (state.user && (state.syncStatus === 'error' || state.syncStatus === 'offline')) return 'unavailable';
  return 'missing';
}
