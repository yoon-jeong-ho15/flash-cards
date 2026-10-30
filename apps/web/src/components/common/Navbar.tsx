import React, { useEffect, useState } from 'react';
import { ViewMode } from '../../types';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import {
  ChevronRight,
  Home,
  Search,
  Menu,
  AlertCircle,
  CloudOff,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { Modal } from './Modal';
import { GlobalSearch } from './GlobalSearch';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  currentView: ViewMode;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  onNavigateHome: () => void;
  onNavigateFolder: (id: string) => void;
  onNavigateDeck: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenMobileSidebar,
  onNavigateHome,
  onNavigateFolder,
  onNavigateDeck,
}) => {
  const folders = useFlashcardStore((state) => state.folders);
  const decks = useFlashcardStore((state) => state.decks);
  const user = useFlashcardStore((state) => state.user);
  const syncStatus = useFlashcardStore((state) => state.syncStatus);
  const login = useFlashcardStore((state) => state.loginWithGoogle);
  const authError = useFlashcardStore((state) => state.authError);
  const setAuthError = useFlashcardStore((state) => state.setAuthError);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isStudying = currentView.type === 'study' || currentView.type === 'folder-study';
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.isComposing
      ) {
        if (isStudying || document.querySelector('[role="dialog"]')) return;
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudying]);
  useEffect(() => setSearchOpen(false), [user?.uid]);
  const deck =
    'deckId' in currentView ? decks.find((item) => item.id === currentView.deckId) : undefined;
  const folderId =
    currentView.type === 'folder' || currentView.type === 'folder-study'
      ? currentView.folderId
      : (deck?.folderId ?? (currentView.type === 'edit-deck' ? currentView.folderId : undefined));
  const folder = folders.find((item) => item.id === folderId);
  const label =
    currentView.type === 'all-decks'
      ? '모든 덱'
      : currentView.type === 'all-folders'
        ? '모든 폴더'
        : currentView.type === 'edit-deck'
          ? deck
            ? '덱 편집'
            : '새 덱 만들기'
          : isStudying
            ? '학습 중'
            : (deck?.title ?? folder?.title ?? '학습 홈');
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch {
      /* Error is displayed below. */
    } finally {
      setIsLoggingIn(false);
    }
  };
  return (
    <>
      <header className="sticky top-0 z-40 h-14 sm:h-16 shrink-0 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {!isStudying && (
              <button
                type="button"
                onClick={onOpenMobileSidebar}
                aria-label="메뉴 열기"
                aria-haspopup="dialog"
                className="-ml-2 rounded-lg p-2.5 text-muted-foreground hover:bg-muted lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <nav
              aria-label="현재 위치"
              className="flex min-w-0 items-center gap-2 text-xs sm:text-sm"
            >
              <button
                type="button"
                onClick={onNavigateHome}
                aria-label="학습 홈으로 이동"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <Home className="h-4 w-4" />
              </button>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              {folder && (deck || currentView.type === 'folder-study') && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateFolder(folder.id)}
                    className="hidden max-w-28 truncate text-muted-foreground hover:text-primary md:block"
                  >
                    {folder.title}
                  </button>
                  <ChevronRight className="hidden h-3 w-3 shrink-0 text-muted-foreground/40 md:block" />
                </>
              )}
              <span aria-current="page" className="truncate font-medium">
                {label}
              </span>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {!isStudying && (
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setSearchOpen(true);
                }}
                aria-label="학습 자료 검색"
                aria-keyshortcuts="Meta+K Control+K"
                aria-haspopup="dialog"
                className="flex h-9 items-center gap-2 rounded-xl border border-transparent px-2.5 text-muted-foreground transition-colors hover:bg-card sm:border-border sm:bg-card sm:px-3"
              >
                <Search className="h-4 w-4" />
                <span className="hidden text-xs sm:block">학습 자료 검색</span>
                <kbd className="ml-6 hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:block">
                  ⌘ / Ctrl K
                </kbd>
              </button>
            )}
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
              {user ? (
                syncStatus === 'syncing' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Cloud className="h-3.5 w-3.5" />
                )
              ) : (
                <CloudOff className="h-3.5 w-3.5" />
              )}
              {user
                ? syncStatus === 'synced'
                  ? '동기화 완료'
                  : syncStatus === 'syncing'
                    ? '동기화 중'
                    : syncStatus === 'error'
                      ? '동기화 확인 필요'
                      : '오프라인'
                : '게스트 모드'}
            </span>
            {!user && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs lg:hidden"
                onClick={handleLogin}
                isLoading={isLoggingIn}
              >
                로그인
              </Button>
            )}
            {user && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary lg:hidden"
                title={user.email || '내 계정'}
              >
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </header>
      {searchOpen && (
        <GlobalSearch
          onClose={() => setSearchOpen(false)}
          onNavigateDeck={onNavigateDeck}
          onNavigateFolder={onNavigateFolder}
        />
      )}
      {authError && (
        <Modal
          isOpen
          onClose={() => setAuthError(null)}
          title="로그인 안내"
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
          maxWidth="sm"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{authError}</p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setAuthError(null)}>확인</Button>
          </div>
        </Modal>
      )}
    </>
  );
};
