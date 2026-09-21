import React, { useState } from 'react';
import { ViewMode, Folder, Deck } from '../../types';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import {
  Layers,
  ChevronRight,
  FolderPlus,
  Plus,
  Home,
  Cloud,
  Check,
  CloudOff,
  AlertCircle,
  RefreshCw,
  LogOut,
  Menu,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  currentView: ViewMode;
  folders?: Folder[];
  decks?: Deck[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  onNavigateHome: () => void;
  onNavigateFolder: (folderId: string) => void;
  onNavigateDeck: (deckId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  folders: propFolders,
  decks: propDecks,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  onNavigateHome,
  onNavigateFolder,
  onNavigateDeck,
}) => {
  const store = useFlashcardStore();
  const folders = propFolders ?? store.folders;
  const decks = propDecks ?? store.decks;
  const {
    syncStatus,
    lastSyncedAt,
    initCloudSync,
    pendingSync,
    user,
    loginWithGoogle,
    logout,
    authError,
    setAuthError,
  } = store;

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch {
      // 에러 메시지는 authSlice에 설정됨
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

  // 브레드크럼 정보 계산
  let currentFolder: Folder | undefined;
  let currentDeck: Deck | undefined;

  if (currentView.type === 'folder') {
    currentFolder = folders.find((f) => f.id === currentView.folderId);
  } else if (currentView.type === 'deck' || currentView.type === 'study') {
    currentDeck = decks.find((d) => d.id === currentView.deckId);
    if (currentDeck?.folderId) {
      currentFolder = folders.find((f) => f.id === currentDeck?.folderId);
    }
  } else if (currentView.type === 'edit-deck') {
    if (currentView.deckId) {
      currentDeck = decks.find((d) => d.id === currentView.deckId);
      if (currentDeck?.folderId) {
        currentFolder = folders.find((f) => f.id === currentDeck?.folderId);
      }
    } else if (currentView.folderId) {
      currentFolder = folders.find((f) => f.id === currentView.folderId);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* 좌측 로고 및 브레드크럼 네비게이션 */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          {/* 모바일 햄버거 메뉴 버튼 (모바일 뷰에서만 노출) */}
          {onOpenMobileSidebar && currentView.type !== 'study' && (
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
              title="메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 font-semibold text-foreground tracking-tight shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline font-bold text-base">FlashCards</span>
          </button>

          {/* 브레드크럼 */}
          {currentView.type !== 'dashboard' && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-hidden pl-2 border-l border-border">
              <button
                type="button"
                onClick={onNavigateHome}
                className="hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors shrink-0 cursor-pointer"
                title="홈 대시보드로 이동"
              >
                <Home className="w-3.5 h-3.5" />
              </button>

              {currentView.type === 'all-folders' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-primary bg-primary/10 font-semibold truncate shrink-0 px-2 py-0.5 rounded-md text-xs">
                    모든 폴더
                  </span>
                </>
              )}

              {currentView.type === 'all-decks' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-primary bg-primary/10 font-semibold truncate shrink-0 px-2 py-0.5 rounded-md text-xs">
                    모든 덱
                  </span>
                </>
              )}

              {currentFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNavigateFolder(currentFolder!.id)}
                    className={`truncate max-w-[80px] sm:max-w-[160px] font-medium px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer ${currentView.type === 'folder'
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {currentFolder.title}
                  </button>
                </>
              )}

              {currentDeck && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNavigateDeck(currentDeck!.id)}
                    className={`truncate max-w-[90px] sm:max-w-[180px] font-medium px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer ${currentView.type === 'deck'
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {currentDeck.title}
                  </button>
                </>
              )}

              {currentView.type === 'edit-deck' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-foreground font-semibold truncate shrink-0 px-2 py-0.5 bg-muted rounded-md text-xs">
                    {currentView.deckId ? '덱 편집' : '새 덱 작성'}
                  </span>
                </>
              )}

              {currentView.type === 'study' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-primary font-semibold truncate shrink-0 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-xs">
                    학습 모드
                  </span>
                </>
              )}
            </nav>
          )}
        </div>

        {/* 우측 클라우드 상태 및 계정/버튼 그룹 (데스크탑에서는 사이드바 하단으로 이동하므로 lg:hidden 처리) */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {/* 사용자 로그인 상태에 따른 클라우드 동기화 뱃지 */}
          <div className="hidden sm:flex items-center">
            {!user ? (
              <Badge
                variant="outline"
                className="text-muted-foreground font-normal py-1 gap-1.5"
                title="Google 로그인 시 클라우드에 데이터가 안전하게 실시간 보관됩니다."
              >
                <CloudOff className="w-3.5 h-3.5" />
                <span>게스트 모드</span>
              </Badge>
            ) : (
              <>
                {syncStatus === 'synced' && (
                  <button
                    type="button"
                    onClick={() => initCloudSync()}
                    title={`클라우드 실시간 동기화 완료${lastSyncedAt ? ` (${new Date(lastSyncedAt).toLocaleTimeString()} 갱신)` : ''}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>동기화</span>
                  </button>
                )}

                {syncStatus === 'syncing' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>동기화 중...</span>
                  </div>
                )}

                {syncStatus === 'offline' && (
                  <button
                    type="button"
                    onClick={() => initCloudSync()}
                    title={
                      pendingCount > 0
                        ? `오프라인 상태 (대기 ${pendingCount}건). 클릭 시 지금 동기화 시도.`
                        : '오프라인 상태'
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>{pendingCount > 0 ? `오프라인 (${pendingCount}건 대기)` : '오프라인'}</span>
                  </button>
                )}

                {syncStatus === 'error' && (
                  <button
                    type="button"
                    onClick={() => initCloudSync()}
                    title="동기화 재시도"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>동기화 재시도</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Google 로그인 / 사용자 프로필 */}
          {!user ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isLoggingIn}
              onClick={handleGoogleLogin}
              className="h-8 gap-1.5"
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
              <span className="hidden sm:inline">{isLoggingIn ? '로그인 중...' : 'Google 로그인'}</span>
              <span className="sm:hidden">로그인</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div
                className="flex items-center gap-1.5"
                title={user.email || user.displayName || ''}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="w-7 h-7 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-xs font-medium text-foreground max-w-[100px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                title="로그아웃"
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 로그인 에러 모달 */}
      {authError && (
        <Modal
          isOpen={Boolean(authError)}
          onClose={() => setAuthError(null)}
          title="로그인 안내"
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          maxWidth="sm"
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="leading-relaxed">{authError}</p>
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthError(null)}
              >
                확인
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
};
