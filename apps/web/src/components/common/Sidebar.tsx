import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ViewMode } from '../../types';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { indexCards } from '../../store/cardSelectors';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import {
  Layers,
  Folder,
  Home,
  Plus,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  FileText,
  CloudOff,
  RefreshCw,
  LogOut,
  AlertCircle,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: ViewMode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigateHome: () => void;
  onNavigateAllFolders: () => void;
  onNavigateAllDecks: () => void;
  onNavigateFolder: (folderId: string) => void;
  onNavigateDeck: (deckId: string) => void;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onNavigateHome,
  onNavigateAllFolders,
  onNavigateAllDecks,
  onNavigateFolder,
  onNavigateDeck,
  onCreateDeck,
  onCreateFolder,
}) => {
  const folders = useFlashcardStore((state) => state.folders);
  const decks = useFlashcardStore((state) => state.decks);
  const cards = useFlashcardStore((state) => state.cards);
  const user = useFlashcardStore((state) => state.user);
  const syncStatus = useFlashcardStore((state) => state.syncStatus);
  const pendingSync = useFlashcardStore((state) => state.pendingSync);
  const login = useFlashcardStore((state) => state.loginWithGoogle);
  const logout = useFlashcardStore((state) => state.logout);
  const sync = useFlashcardStore((state) => state.initCloudSync);
  const lastSyncedAt = useFlashcardStore((state) => state.lastSyncedAt);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(drawerRef, isMobileOpen, onCloseMobile);
  const counts = useMemo(() => indexCards(cards).byDeck, [cards]);
  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.title.localeCompare(b.title, 'ko', { numeric: true })),
    [folders]
  );
  const sortedDecks = useMemo(
    () => [...decks].sort((a, b) => a.title.localeCompare(b.title, 'ko', { numeric: true })),
    [decks]
  );
  const pendingCount = Object.values(pendingSync ?? {}).reduce((sum, ids) => sum + ids.length, 0);
  const navigate = (action: () => void) => {
    action();
    onCloseMobile();
  };
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch {
      /* Auth errors are displayed by Navbar. */
    } finally {
      setIsLoggingIn(false);
    }
  };
  const isCurrentDeck = (id: string) =>
    (currentView.type === 'deck' || currentView.type === 'edit-deck') && currentView.deckId === id;
  const renderDeck = (deck: (typeof decks)[number]) => (
    <button
      key={deck.id}
      type="button"
      tabIndex={-1}
      onClick={() => navigate(() => onNavigateDeck(deck.id))}
      aria-current={isCurrentDeck(deck.id) ? 'page' : undefined}
      className={cn(
        'group flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted',
        isCurrentDeck(deck.id) ? 'bg-secondary font-semibold text-primary' : 'text-muted-foreground'
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 opacity-65" />
      <span className="min-w-0 flex-1 truncate">{deck.title}</span>
      <span className="shrink-0 tabular-nums text-[10px] opacity-75">{counts.get(deck.id)?.length ?? 0}</span>
    </button>
  );
  const content = (collapsed: boolean) => (
    <div className="flex h-full flex-col bg-[#fdfcf9]">
      <div
        className={cn(
          'flex h-14 sm:h-16 shrink-0 items-center gap-2 px-4',
          collapsed && 'justify-center px-2'
        )}
      >
        {!collapsed && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => navigate(onNavigateHome)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            aria-label="FlashCards 홈"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Layers className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              FlashCards
              <span className="mt-0.5 block text-[9px] font-normal tracking-[0.12em] text-muted-foreground">
                A LITTLE, EVERY DAY
              </span>
            </span>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:block"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={onCloseMobile}
          className="rounded-lg p-2 text-muted-foreground lg:hidden"
          aria-label="메뉴 닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className={cn('px-4 pb-5 pt-6', collapsed && 'px-2')}>
        <Button
          onClick={() => navigate(onCreateDeck)}
          className={cn('w-full gap-2', collapsed ? 'px-0' : 'justify-start')}
          aria-label="새 덱 만들기"
          title="새 덱 만들기"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>새 덱 만들기</span>}
        </Button>
      </div>
      <nav aria-label="주 메뉴" className={cn('space-y-1 px-3', collapsed && 'px-2')}>
        {[
          { type: 'dashboard', label: '학습 홈', icon: Home, action: onNavigateHome, count: null },
          {
            type: 'all-decks',
            label: '모든 덱',
            icon: Layers,
            action: onNavigateAllDecks,
            count: decks.length,
          },
          {
            type: 'all-folders',
            label: '모든 폴더',
            icon: Folder,
            action: onNavigateAllFolders,
            count: folders.length,
          },
        ].map((item) => (
          <button
            key={item.type}
            type="button"
            tabIndex={-1}
            onClick={() => navigate(item.action)}
            aria-current={currentView.type === item.type ? 'page' : undefined}
            title={item.label}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
              currentView.type === item.type
                ? 'bg-secondary font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== null && (
                  <span className="text-[11px] tabular-nums opacity-70">{item.count}</span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>
      <div
        className={cn(
          'mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-border/70 px-4 pt-5 pb-4 no-scrollbar',
          collapsed && 'px-2'
        )}
      >
        {!collapsed ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-label">내 보관함</h2>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => navigate(onCreateFolder)}
                aria-label="새 폴더 만들기"
                title="새 폴더 만들기"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>
            {!folders.length && !decks.length && (
              <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
                배우고 싶은 것들을
                <br />
                이곳에 차곡차곡 모아보세요.
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => navigate(onCreateFolder)}
                  className="mt-3 flex items-center gap-1 text-primary font-medium"
                >
                  폴더 만들기
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            )}
            {sortedFolders.map((folder) => {
              const folderDecks = sortedDecks.filter((deck) => deck.folderId === folder.id);
              const folderCardCount = folderDecks.reduce(
                (sum, deck) => sum + (counts.get(deck.id)?.length ?? 0),
                0
              );
              const isExpanded =
                expanded[folder.id] ??
                ((currentView.type === 'folder' && currentView.folderId === folder.id) ||
                  folderDecks.some((deck) => isCurrentDeck(deck.id)));
              const selected = currentView.type === 'folder' && currentView.folderId === folder.id;
              return (
                <div key={folder.id} className="mb-0.5">
                  <div
                    className={cn(
                      'flex min-w-0 items-center rounded-lg hover:bg-muted',
                      selected && 'bg-secondary'
                    )}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      className="shrink-0 rounded-lg px-1 py-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setExpanded((prev) => ({ ...prev, [folder.id]: !isExpanded }))}
                      aria-label={`${folder.title} ${isExpanded ? '접기' : '펼치기'}`}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => navigate(() => onNavigateFolder(folder.id))}
                      aria-current={selected ? 'page' : undefined}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-xs"
                    >
                      <Folder className="h-4 w-4 shrink-0 text-[#a58b4e]" />
                      <span className="min-w-0 flex-1 truncate">{folder.title}</span>
                      <span
                        className="flex shrink-0 items-baseline gap-1 tabular-nums text-muted-foreground"
                        title={`덱 ${folderDecks.length}개 · 총 카드 ${folderCardCount}장`}
                      >
                        <span className="text-[10px]">{folderDecks.length}</span>
                        <span className="text-[9px] text-muted-foreground/60">
                          ({folderCardCount}장)
                        </span>
                      </span>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="ml-3 min-w-0 space-y-0.5 border-l border-border pl-2 py-0.5">
                      {folderDecks.length ? (
                        folderDecks.map(renderDeck)
                      ) : (
                        <p className="p-2 text-xs text-muted-foreground">아직 덱이 없어요.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sortedDecks.some((deck) => !deck.folderId) && (
              <div className="mt-4">
                <p className="mb-2 px-2 text-[10px] text-muted-foreground">미분류 덱</p>
                <div className="space-y-0.5">
                  {sortedDecks.filter((deck) => !deck.folderId).map(renderDeck)}
                </div>
              </div>
            )}
          </>
        ) : (
          sortedFolders.slice(0, 6).map((folder) => (
            <button
              key={folder.id}
              type="button"
              tabIndex={-1}
              onClick={() => navigate(() => onNavigateFolder(folder.id))}
              title={folder.title}
              aria-label={folder.title}
              className="mb-2 flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Folder className="h-4 w-4" />
            </button>
          ))
        )}
      </div>
      <div className={cn('shrink-0 border-t border-border/70 p-4', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{user ? '클라우드 보관함' : '이 브라우저에 저장 중'}</span>
            {!user ? (
              <CloudOff className="h-3.5 w-3.5" />
            ) : (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => sync()}
                title={
                  lastSyncedAt
                    ? `마지막 동기화: ${new Date(lastSyncedAt).toLocaleString('ko-KR')}`
                    : '동기화 재시도'
                }
                className={cn(
                  'flex items-center gap-1 hover:underline',
                  syncStatus === 'error' ? 'text-destructive' : 'text-primary'
                )}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : syncStatus === 'synced' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {syncStatus === 'synced'
                  ? '동기화 완료'
                  : syncStatus === 'syncing'
                    ? '동기화 중'
                    : syncStatus === 'error'
                      ? '재시도'
                      : `오프라인${pendingCount ? ` (${pendingCount})` : ''}`}
              </button>
            )}
          </div>
        )}
        {user ? (
          <div className="flex items-center gap-2.5">
            {!collapsed && (
              <>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-secondary text-sm font-semibold text-primary">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{user.displayName || '내 계정'}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => logout()}
              title="로그아웃"
              aria-label="로그아웃"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn('w-full', collapsed && 'px-0')}
            isLoading={isLoggingIn}
            onClick={handleLogin}
            aria-label="Google 로그인"
            leftIcon={
              <span aria-hidden="true" className="text-base font-bold text-primary">
                G
              </span>
            }
          >
            {!collapsed && 'Google로 로그인'}
          </Button>
        )}
      </div>
    </div>
  );
  return (
    <>
      <aside
        aria-label="사이드바"
        className={cn(
          'sticky top-0 z-30 hidden h-screen shrink-0 border-r border-border/80 transition-[width] duration-200 lg:block',
          isCollapsed ? 'w-[72px]' : 'w-60 xl:w-64'
        )}
      >
        {content(isCollapsed)}
      </aside>
      {isMobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <div
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="학습 메뉴"
              className="fixed inset-y-0 left-0 w-[min(85vw,300px)] shadow-2xl"
            >
              {content(false)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
