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
  Plus,
  Layers,
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
  onCreateDeck?: () => void;
}
export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenMobileSidebar,
  onNavigateHome,
  onNavigateFolder,
  onNavigateDeck,
  onCreateDeck,
}) => {
  const folders = useFlashcardStore((state) => state.folders);
  const decks = useFlashcardStore((state) => state.decks);
  const user = useFlashcardStore((state) => state.user);
  const syncStatus = useFlashcardStore((state) => state.syncStatus);
  const login = useFlashcardStore((state) => state.loginWithGoogle);
  const sync = useFlashcardStore((state) => state.initCloudSync);
  const authError = useFlashcardStore((state) => state.authError);
  const setAuthError = useFlashcardStore((state) => state.setAuthError);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.isComposing &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => setSearchOpen(false), [user?.uid]);
  const deck =
    'deckId' in currentView ? decks.find((item) => item.id === currentView.deckId) : undefined;
  const folder = folders.find(
    (item) => item.id === (currentView.type === 'folder' ? currentView.folderId : deck?.folderId)
  );
  const label =
    currentView.type === 'all-decks'
      ? '학습 세트'
      : currentView.type === 'all-folders'
        ? '폴더'
        : deck?.title || folder?.title || '학습 홈';
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch {
      /* Auth error is rendered below. */
    } finally {
      setIsLoggingIn(false);
    }
  };
  return (
    <>
      <header className="sticky top-0 z-40 h-16 shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1360px] items-center gap-3 px-5 sm:px-8 lg:px-10 xl:px-12">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="메뉴 열기"
            aria-haspopup="dialog"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav aria-label="현재 위치" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <button
              type="button"
              onClick={onNavigateHome}
              aria-label="학습 홈으로 이동"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {folder && deck && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateFolder(folder.id)}
                  className="max-w-24 truncate text-muted-foreground hover:text-primary"
                >
                  {folder.title}
                </button>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              </>
            )}
            <span aria-current="page" className="max-w-40 truncate font-medium">
              {label}
            </span>
          </nav>
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Flashcards 홈"
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:hidden"
          >
            <Layers className="h-5 w-5 text-primary" />
            Flashcards
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="학습 자료 검색"
            aria-keyshortcuts="Meta+K Control+K"
            aria-haspopup="dialog"
            className="ml-auto flex h-10 items-center gap-2.5 rounded-xl px-3 text-muted-foreground transition-colors hover:bg-secondary sm:w-full sm:max-w-[380px] sm:bg-muted/70"
          >
            <Search className="h-4 w-4" />
            <span className="hidden flex-1 text-left text-xs sm:block">
              세트, 폴더, 카드 속 단어까지 찾아보세요
            </span>
            <kbd className="hidden rounded-md border border-border bg-card px-1.5 py-1 text-[10px] xl:block">
              ⌘ / Ctrl K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              if (user) void sync();
            }}
            disabled={!user || syncStatus === 'syncing'}
            title={user ? '동기화 다시 시도' : '게스트 자료는 이 브라우저에 저장됩니다'}
            className="hidden shrink-0 items-center gap-1.5 px-2 text-[11px] text-muted-foreground xl:flex"
          >
            {!user ? (
              <CloudOff className="h-3.5 w-3.5" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            {!user
              ? '기기에 저장'
              : syncStatus === 'synced'
                ? '동기화 완료'
                : syncStatus === 'syncing'
                  ? '동기화 중'
                  : syncStatus === 'error'
                    ? '동기화 재시도'
                    : '오프라인'}
          </button>
          {onCreateDeck && (
            <Button
              size="sm"
              onClick={onCreateDeck}
              className="hidden shrink-0 md:inline-flex"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              만들기
            </Button>
          )}
          {user ? (
            <span
              title={user.email || '내 계정'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-secondary text-xs font-bold text-primary"
            >
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 px-3 text-xs lg:hidden"
              onClick={handleLogin}
              isLoading={isLoggingIn}
            >
              로그인
            </Button>
          )}
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
