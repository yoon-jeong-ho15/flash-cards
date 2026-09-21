import React, { useState } from 'react';
import { ViewMode, Folder, Deck } from '../../types';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import {
  Layers,
  Folder as FolderIcon,
  Home,
  Plus,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  FileText,
  Check,
  CloudOff,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const {
    folders,
    decks,
    cards,
    syncStatus,
    user,
    loginWithGoogle,
    logout,
    initCloudSync,
    pendingSync,
    lastSyncedAt,
  } = useFlashcardStore();

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch {
      // ignore
    } finally {
      setIsLoggingIn(false);
    }
  };

  const pendingCount =
    (pendingSync?.folderIds?.length || 0) +
    (pendingSync?.deckIds?.length || 0) +
    (pendingSync?.cardIds?.length || 0) +
    (pendingSync?.deletedFolderIds?.length || 0) +
    (pendingSync?.deletedDeckIds?.length || 0) +
    (pendingSync?.deletedCardIds?.length || 0);

  // 폴더별 아코디언 펼침/접힘 상태 관리 (기본적으로 모두 펼침)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    folders.forEach((f) => {
      init[f.id] = true;
    });
    return init;
  });

  const toggleFolderAccordion = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // 미분류 덱 목록
  const unassignedDecks = decks.filter((d) => !d.folderId);

  // 활성 여부 체크 헬퍼
  const isHomeActive = currentView.type === 'dashboard';
  const isAllFoldersActive = currentView.type === 'all-folders';
  const isAllDecksActive = currentView.type === 'all-decks';
  const isCurrentFolder = (folderId: string) =>
    currentView.type === 'folder' && currentView.folderId === folderId;
  const isCurrentDeck = (deckId: string) =>
    (currentView.type === 'deck' && currentView.deckId === deckId) ||
    (currentView.type === 'edit-deck' && currentView.deckId === deckId);



  const renderSidebarContent = (collapsed: boolean) => (
    <div className="h-full flex flex-col justify-between bg-card text-card-foreground select-none">
      {/* 1. 상단 컨트롤 바 (접기/펼치기 및 닫기) */}
      <div>
        <div
          className={cn(
            'h-14 sm:h-16 flex items-center border-b border-border/80 px-3 transition-all',
            collapsed ? 'justify-center' : 'justify-end'
          )}
        >
          {/* 데스크탑 접기/펼치기 토글 버튼 */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* 모바일 닫기 버튼 */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 퀵 생성 액션 버튼 */}
        <div className="p-3 border-b border-border/60">
          {!collapsed ? (
            <div className="space-y-1.5">
              <Button
                variant="default"
                size="sm"
                className="w-full justify-start gap-2 shadow-xs font-medium"
                onClick={() => {
                  onCreateDeck();
                  onCloseMobile();
                }}
              >
                <Plus className="w-4 h-4" />
                <span>새 덱 만들기</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onCreateFolder();
                  onCloseMobile();
                }}
              >
                <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>새 폴더 추가</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onCreateDeck();
                  onCloseMobile();
                }}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-colors"
                title="새 덱 만들기"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateFolder();
                  onCloseMobile();
                }}
                className="w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground flex items-center justify-center hover:bg-muted transition-colors"
                title="새 폴더 추가"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 3. 기본 메인 네비게이션 메뉴 */}
        <div className="p-2 space-y-0.5 border-b border-border/60">
          <button
            type="button"
            onClick={() => {
              onNavigateHome();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isHomeActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            title="대시보드"
          >
            <Home className="w-4 h-4 shrink-0" />
            {!collapsed && <span>대시보드</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateAllFolders();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isAllFoldersActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            title="모든 폴더"
          >
            <div className="flex items-center gap-2.5">
              <FolderIcon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>모든 폴더</span>}
            </div>
            {!collapsed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {folders.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateAllDecks();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isAllDecksActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            title="모든 덱"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 shrink-0" />
              {!collapsed && <span>모든 덱</span>}
            </div>
            {!collapsed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {decks.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* 4. 학습 보관함 (폴더 & 덱 계층 구조 스크롤 영역) */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {!collapsed && (
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                내 학습 보관함
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70">
                총 {cards.length}장
              </span>
            </div>

            {/* 폴더 목록 트리 */}
            <div className="space-y-1">
              {folders.map((folder) => {
                const folderDecks = decks.filter((d) => d.folderId === folder.id);
                const isExpanded = expandedFolderIds[folder.id];
                const isSelected = isCurrentFolder(folder.id);

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      onClick={() => {
                        onNavigateFolder(folder.id);
                        onCloseMobile();
                      }}
                      className={cn(
                        'group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-secondary text-secondary-foreground font-semibold'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleFolderAccordion(folder.id, e)}
                          className="p-0.5 hover:bg-muted-foreground/10 rounded transition-colors text-muted-foreground"
                          title={isExpanded ? '접기' : '펼치기'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <FolderIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{folder.title}</span>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 font-mono text-muted-foreground border-border/60 shrink-0"
                      >
                        {folderDecks.length}
                      </Badge>
                    </div>

                    {/* 폴더 하위 덱 목록 아코디언 */}
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5 border-l border-border/40 ml-3.5 my-0.5">
                        {folderDecks.length === 0 ? (
                          <div className="px-2 py-1 text-[11px] text-muted-foreground/70 italic">
                            덱이 없습니다
                          </div>
                        ) : (
                          folderDecks.map((deck) => {
                            const isDeckActive = isCurrentDeck(deck.id);
                            const deckCardsCount = cards.filter((c) => c.deckId === deck.id).length;

                            return (
                              <div
                                key={deck.id}
                                onClick={() => {
                                  onNavigateDeck(deck.id);
                                  onCloseMobile();
                                }}
                                className={cn(
                                  'flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-colors',
                                  isDeckActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className="w-3 h-3 shrink-0 opacity-70" />
                                  <span className="truncate">{deck.title}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-70 shrink-0">
                                  {deckCardsCount}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 미분류 덱 목록 */}
              {unassignedDecks.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    미분류 덱
                  </div>
                  <div className="space-y-0.5">
                    {unassignedDecks.map((deck) => {
                      const isDeckActive = isCurrentDeck(deck.id);
                      const deckCardsCount = cards.filter((c) => c.deckId === deck.id).length;

                      return (
                        <div
                          key={deck.id}
                          onClick={() => {
                            onNavigateDeck(deck.id);
                            onCloseMobile();
                          }}
                          className={cn(
                            'flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-colors',
                            isDeckActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3 h-3 shrink-0 opacity-70" />
                            <span className="truncate">{deck.title}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-70 shrink-0">
                            {deckCardsCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-8 h-px bg-border" />
            {folders.slice(0, 5).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onNavigateFolder(f.id);
                  onCloseMobile();
                }}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                  isCurrentFolder(f.id) && 'bg-primary/10 text-primary'
                )}
                title={f.title}
              >
                <FolderIcon className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. 하단 로그인 & 클라우드 동기화 상태 영역 */}
      <div className="p-3 border-t border-border/80 space-y-2.5 bg-muted/15">
        {!collapsed ? (
          <>
            {/* 동기화 상태 인디케이터 바 */}
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-[11px] text-muted-foreground font-medium">동기화 상태</span>
              {!user ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal py-0 h-4.5 gap-1">
                  <CloudOff className="w-3 h-3" />
                  <span>게스트</span>
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  {syncStatus === 'synced' && (
                    <button
                      type="button"
                      onClick={() => initCloudSync()}
                      title={`동기화 완료${lastSyncedAt ? ` (${new Date(lastSyncedAt).toLocaleTimeString()} 갱신)` : ''}`}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium hover:underline cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>동기화 완료</span>
                    </button>
                  )}
                  {syncStatus === 'syncing' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>동기화 중...</span>
                    </span>
                  )}
                  {syncStatus === 'offline' && (
                    <button
                      type="button"
                      onClick={() => initCloudSync()}
                      title="클릭 시 동기화 재시도"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <CloudOff className="w-3 h-3" />
                      <span>{pendingCount > 0 ? `오프라인 (${pendingCount})` : '오프라인'}</span>
                    </button>
                  )}
                  {syncStatus === 'error' && (
                    <button
                      type="button"
                      onClick={() => initCloudSync()}
                      title="동기화 재시도"
                      className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      <AlertCircle className="w-3 h-3" />
                      <span>재시도</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 계정 프로필 또는 로그인 버튼 */}
            {!user ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoggingIn}
                onClick={handleGoogleLogin}
                className="w-full justify-center gap-2 h-8.5 text-xs font-semibold shadow-2xs"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{isLoggingIn ? '로그인 중...' : 'Google 로그인'}</span>
              </Button>
            ) : (
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-background border border-border/80">
                <div className="flex items-center gap-2 min-w-0 pr-1" title={user.email || ''}>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full border border-border object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate leading-tight">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* 접혔을 때 컴팩트 아이콘 모드 */
          <div className="flex flex-col items-center gap-2.5">
            {!user ? (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                title="Google 로그인"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <div className="relative group">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-border object-cover"
                    title={user.displayName || user.email || ''}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20"
                    title={user.displayName || user.email || ''}
                  >
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                {/* 동기화 인디케이터 점 */}
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                    syncStatus === 'synced' && 'bg-emerald-500',
                    syncStatus === 'syncing' && 'bg-amber-500 animate-pulse',
                    syncStatus === 'offline' && 'bg-slate-400',
                    syncStatus === 'error' && 'bg-destructive'
                  )}
                  title={`동기화 상태: ${syncStatus}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. 데스크탑 고정 사이드바 */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 border-r border-border/80 sticky top-0 h-screen transition-all duration-300 z-30',
          isCollapsed ? 'w-16' : 'w-64 xl:w-72'
        )}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* 2. 모바일/태블릿 드로어 (Slide-over Sheet) - 항상 완전히 펼쳐진(collapsed: false) 상태로 렌더링 */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 어두운 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />

          {/* 슬라이드인 사이드바 패널 */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs shadow-2xl bg-card border-r border-border animate-in slide-in-from-left duration-300">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
