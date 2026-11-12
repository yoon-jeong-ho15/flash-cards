import { matchRoutes } from 'react-router';
import type { ViewMode } from './types';
import type { FlashcardStoreState } from './store/types';

const routes = [
  { path: '/', id: 'dashboard' },
  { path: '/account', id: 'account' },
  { path: '/folders', id: 'all-folders' },
  { path: '/folders/:folderId', id: 'folder' },
  { path: '/folders/:folderId/study', id: 'folder-study' },
  { path: '/decks', id: 'all-decks' },
  { path: '/decks/new', id: 'new-deck' },
  { path: '/decks/:deckId', id: 'deck' },
  { path: '/decks/:deckId/edit', id: 'edit-deck' },
  { path: '/decks/:deckId/study', id: 'study' },
];

// The URL is the only source of navigation state. ViewMode remains a UI adapter
// for the existing screens and navigation components, not a second state store.
export function resolveView(pathname: string, search = ''): ViewMode | null {
  const match = matchRoutes(routes, pathname)?.[0];
  if (!match) return null;
  const { deckId, folderId } = match.params;
  const query = new URLSearchParams(search);
  switch (match.route.id) {
    case 'dashboard': return { type: 'dashboard' };
    case 'account': return { type: 'account' };
    case 'all-folders': return { type: 'all-folders' };
    case 'all-decks': return { type: 'all-decks' };
    case 'folder': return { type: 'folder', folderId: folderId! };
    case 'folder-study': return { type: 'folder-study', folderId: folderId! };
    case 'deck': return { type: 'deck', deckId: deckId! };
    case 'new-deck': return { type: 'edit-deck', folderId: query.get('folderId') || undefined };
    case 'edit-deck': return { type: 'edit-deck', deckId: deckId!, focusCardId: query.get('cardId') || undefined };
    case 'study': return { type: 'study', deckId: deckId!, onlyDifficult: query.get('onlyDifficult') === '1', shuffle: query.get('shuffle') === '1' };
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
    case 'all-decks': return '/decks';
    case 'folder': return `/folders/${encodeURIComponent(view.folderId)}`;
    case 'folder-study': return `/folders/${encodeURIComponent(view.folderId)}/study`;
    case 'deck': return `/decks/${encodeURIComponent(view.deckId)}`;
    case 'edit-deck':
      path = view.deckId ? `/decks/${encodeURIComponent(view.deckId)}/edit` : '/decks/new';
      if (!view.deckId && view.folderId) query.set('folderId', view.folderId);
      if (view.deckId && view.focusCardId) query.set('cardId', view.focusCardId);
      break;
    case 'study':
      path = `/decks/${encodeURIComponent(view.deckId)}/study`;
      if (view.onlyDifficult) query.set('onlyDifficult', '1');
      if (view.shuffle) query.set('shuffle', '1');
      break;
  }
  return query.size ? `${path}?${query}` : path;
}

type RouteData = Pick<FlashcardStoreState,
  'isAuthInitialized' | 'isInitialSyncComplete' | 'user' | 'syncStatus' | 'decks' | 'folders'>;

export function routeStatus(view: ViewMode | null, state: RouteData) {
  if (!state.isAuthInitialized) return 'loading';
  if (view?.type === 'account') return 'ready';
  if (state.user && !state.isInitialSyncComplete) return 'loading';
  if (!view) return 'not-found';
  const deckId = 'deckId' in view ? view.deckId : undefined;
  const folderId = 'folderId' in view ? view.folderId : undefined;
  const missing = (deckId && !state.decks.some(deck => deck.id === deckId)) ||
    (folderId && !state.folders.some(folder => folder.id === folderId));
  if (!missing) return 'ready';
  if (state.user && state.syncStatus === 'syncing') return 'loading';
  if (state.user && (state.syncStatus === 'error' || state.syncStatus === 'offline')) return 'unavailable';
  return 'missing';
}
