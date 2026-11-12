import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useLocation, useNavigate, Link } from 'react-router';
import { resolveView, viewUrl, routeStatus } from './routing';
import { EmptyState } from './components/common/EmptyState';
import { Button } from './components/ui/button';
import { useFlashcardStore } from './store/useFlashcardStore';
import { BottomNavigation } from './components/common/BottomNavigation';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AccountView } from './components/account/AccountView';
import { DashboardView } from './components/dashboard/DashboardView';
import { FolderDetailView } from './components/folder/FolderDetailView';
import { FolderModal } from './components/folder/FolderModal';
import { DeckDetailView } from './components/deck/DeckDetailView';
import { AllFoldersView } from './components/folder/AllFoldersView';
import { AllDecksView } from './components/deck/AllDecksView';
import { MotionConfig } from 'motion/react';

const DeckEditor = lazy(() =>
  import('./components/deck/DeckEditor').then((module) => ({
    default: module.DeckEditor,
  }))
);
const StudyView = lazy(() =>
  import('./components/study/StudyView').then((module) => ({
    default: module.StudyView,
  }))
);

export const App: React.FC = () => {
  const initCloudSync = useFlashcardStore((state) => state.initCloudSync);
  const setSyncStatus = useFlashcardStore((state) => state.setSyncStatus);
  const setUser = useFlashcardStore((state) => state.setUser);
  const user = useFlashcardStore((state) => state.user);

  // Firebase Auth 인증 상태 감지 및 자동 동기화
  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        initCloudSync();
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, initCloudSync]);

  useEffect(() => {
    // 브라우저 네트워크 온라인 복구 시 자동 동기화 트리거
    const handleOnline = () => {
      if (user) {
        initCloudSync();
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initCloudSync, setSyncStatus, user]);

  const location = useLocation();
  const navigate = useNavigate();
  const routeView = useMemo(() => resolveView(location.pathname, location.search), [location.pathname, location.search]);
  const currentView = routeView ?? { type: 'dashboard' as const };
  const status = useFlashcardStore(state => routeStatus(routeView, state));
  const loginWithGoogle = useFlashcardStore(state => state.loginWithGoogle);
  const [lastStudiedDeckId, setLastStudiedDeckId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('flashcard_last_studied_deck_id');
    } catch {
      return null;
    }
  });
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    folderId?: string;
  }>({ isOpen: false });

  // 사이드바 상태 (접힘 여부 로컬 스토리지 유지)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('flashcard_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flashcard_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 뷰 변경 시 스크롤 최상단 초기화 (모바일 및 SPA 스크롤 위치 유지 방지)
  useEffect(() => {
    // 특정 카드에 포커스하여 편집기로 진입하는 경우가 아니라면 항상 최상단으로 스크롤
    if (currentView.type === 'edit-deck' && currentView.focusCardId) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  useEffect(() => {
    setFolderModalState({ isOpen: false });
    setIsMobileSidebarOpen(false);
  }, [user?.uid, location.key]);

  // 네비게이션 헬퍼
  const navigateHome = () => navigate(viewUrl({ type: 'dashboard' }));
  const navigateAccount = () => navigate(viewUrl({ type: 'account' }));
  const navigateAllFolders = () => navigate(viewUrl({ type: 'all-folders' }));
  const navigateAllDecks = () => navigate(viewUrl({ type: 'all-decks' }));
  const navigateFolder = (folderId: string) => navigate(viewUrl({ type: 'folder', folderId }));
  const navigateDeck = (deckId: string) => navigate(viewUrl({ type: 'deck', deckId }));
  const navigateEditDeck = (deckId?: string, folderId?: string, focusCardId?: string) =>
    navigate(viewUrl({ type: 'edit-deck', deckId, folderId, focusCardId }));
  const navigateStudy = (deckId: string, onlyDifficult = false, shuffle = false) => {
    navigate(viewUrl({ type: 'study', deckId, onlyDifficult, shuffle }));
  };

  const studiedDeckId = status === 'ready' && currentView.type === 'study' ? currentView.deckId : null;
  useEffect(() => {
    if (!studiedDeckId) return;
    setLastStudiedDeckId(studiedDeckId);
    try {
      localStorage.setItem('flashcard_last_studied_deck_id', studiedDeckId);
    } catch {
      // Study remains available when storage is full or disabled.
    }
  }, [studiedDeckId]);

  const openNewFolderModal = () => setFolderModalState({ isOpen: true });
  const closeFolderModal = () => setFolderModalState({ isOpen: false });

  const readyView = status === 'ready' ? routeView : null;
  const showBottomNavigation = readyView &&
    readyView.type !== 'study' &&
    readyView.type !== 'folder-study' &&
    readyView.type !== 'edit-deck';

  const routeFeedback = status !== 'ready' && (
    <div className="page-container py-16">
      {status === 'loading' ? (
        <p role="status" className="text-center text-muted-foreground">자료를 불러오는 중…</p>
      ) : (
        <EmptyState
          title={status === 'not-found' ? '페이지를 찾을 수 없어요' : status === 'unavailable' ? '자료를 불러오지 못했어요' : '자료를 찾을 수 없어요'}
          description={status === 'unavailable'
            ? '인터넷 연결을 확인하고 다시 시도해 주세요. 주소는 그대로 유지됩니다.'
            : status === 'missing'
              ? '삭제된 자료이거나 현재 계정에서 접근할 수 없는 자료입니다. 자료를 만든 계정으로 로그인해 주세요.'
              : '주소를 확인해 주세요.'}
          action={<>
            <Link to="/" className="text-sm text-primary underline">홈으로</Link>
            {status === 'unavailable' && <Button onClick={() => void initCloudSync()}>다시 시도</Button>}
            {status === 'missing' && auth && <Button onClick={() => void loginWithGoogle().catch(() => {})}>{user ? '계정 변경' : '로그인'}</Button>}
          </>}
        />
      )}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        {/* 1. 글로벌 좌측 접이식 사이드바 */}
        <Sidebar
          currentView={currentView}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onToggleCollapse={toggleSidebar}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNavigateHome={navigateHome}
          onNavigateAccount={navigateAccount}
          onChooseStudyDeck={navigateAllDecks}
          onNavigateFolder={navigateFolder}
          onNavigateDeck={navigateDeck}
          onCreateDeck={() => navigateEditDeck()}
          onCreateFolder={openNewFolderModal}
        />

        {/* 2. 메인 화면 영역 (Navbar + 콘텐츠) */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            currentView={currentView}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigateHome={navigateHome}
            onNavigateFolder={navigateFolder}
            onNavigateDeck={navigateDeck}
            onCreateDeck={() => navigateEditDeck()}
          />

          {/* 메인 뷰 컨테이너 */}
          <main
            id="main-content"
            tabIndex={-1}
            key={`${user?.uid || 'guest'}:${location.pathname}`}
            className={`flex-1 outline-none ${showBottomNavigation ? 'pb-24 lg:pb-10' : ''}`}
          >
            <Suspense
              fallback={
                <div role="status" className="page-container space-y-5">
                  <span className="sr-only">화면을 불러오는 중…</span>
                  <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
                  <div className="h-64 animate-pulse rounded-3xl bg-muted" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-36 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-36 animate-pulse rounded-2xl bg-muted" />
                  </div>
                </div>
              }
            >
              {routeFeedback}

              {readyView?.type === 'account' && <AccountView />}

              {readyView?.type === 'dashboard' && (
                <DashboardView
                  lastStudiedDeckId={lastStudiedDeckId}
                  onNavigateDeck={navigateDeck}
                  onNavigateAllDecks={navigateAllDecks}
                  onNavigateFolder={navigateFolder}
                  onNavigateAllFolders={navigateAllFolders}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeck={() => navigateEditDeck()}
                  onCreateFolder={openNewFolderModal}
                />
              )}

              {readyView?.type === 'all-folders' && (
                <AllFoldersView
                  onNavigateAllDecks={navigateAllDecks}
                  onNavigateFolder={navigateFolder}
                  onCreateFolder={openNewFolderModal}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'all-decks' && (
                <AllDecksView
                  onNavigateAllFolders={navigateAllFolders}
                  onNavigateDeck={navigateDeck}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeck={() => navigateEditDeck()}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'folder' && (
                <FolderDetailView
                  folderId={readyView.folderId}
                  onNavigateDeck={navigateDeck}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeckInFolder={(folderId) => navigateEditDeck(undefined, folderId)}
                  onStartFolderStudy={(folderId) =>
                    navigate(viewUrl({ type: 'folder-study', folderId }))
                  }
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'deck' && (
                <DeckDetailView
                  deckId={readyView.deckId}
                  onStartStudy={(deckId, shuffle) => navigateStudy(deckId, false, shuffle)}
                  onEditDeck={(deckId, focusCardId) =>
                    navigateEditDeck(deckId, undefined, focusCardId)
                  }
                  onNavigateFolder={navigateFolder}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'edit-deck' && (
                <DeckEditor
                  key={`${user?.uid || 'guest'}:${readyView.deckId || 'new'}:${readyView.folderId || 'root'}`}
                  deckId={readyView.deckId}
                  initialFolderId={readyView.folderId}
                  focusCardId={readyView.focusCardId}
                  onClose={() => {
                    if (readyView.deckId) {
                      navigateDeck(readyView.deckId);
                    } else if (readyView.folderId) {
                      navigateFolder(readyView.folderId);
                    } else {
                      navigateHome();
                    }
                  }}
                  onSaved={(savedDeckId) => navigateDeck(savedDeckId)}
                />
              )}

              {readyView?.type === 'study' && (
                <StudyView
                  key={`${location.pathname}:${location.search}`}
                  deckId={readyView.deckId}
                  onlyDifficult={readyView.onlyDifficult}
                  shuffle={readyView.shuffle}
                  onExit={() => navigateDeck(readyView.deckId)}
                  onEditDeck={(deckId) => navigateEditDeck(deckId)}
                />
              )}

              {readyView?.type === 'folder-study' && (
                <StudyView
                  key={`${location.pathname}:${location.search}`}
                  folderId={readyView.folderId}
                  shuffle
                  onExit={() => navigateFolder(readyView.folderId)}
                  onEditDeck={(deckId) => navigateEditDeck(deckId)}
                />
              )}
            </Suspense>
          </main>

          {showBottomNavigation && (
            <BottomNavigation
              currentView={currentView}
              onHome={navigateHome}
              onDecks={navigateAllDecks}
              onFolders={navigateAllFolders}
              onCreate={() => navigateEditDeck()}
            />
          )}

          {/* 글로벌 폴더 생성/수정 모달 */}
          {folderModalState.isOpen && (
            <FolderModal
              folderId={folderModalState.folderId}
              onClose={closeFolderModal}
              onSaved={(newFolderId) => {
                closeFolderModal();
                navigateFolder(newFolderId);
              }}
            />
          )}
        </div>
      </div>
    </MotionConfig>
  );
};

export default App;
