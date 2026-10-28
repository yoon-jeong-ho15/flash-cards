import React, { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ViewMode } from './types';
import { useFlashcardStore } from './store/useFlashcardStore';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FolderDetailView } from './components/folder/FolderDetailView';
import { FolderModal } from './components/folder/FolderModal';
import { DeckDetailView } from './components/deck/DeckDetailView';
import { AllFoldersView } from './components/folder/AllFoldersView';
import { AllDecksView } from './components/deck/AllDecksView';
import { MotionConfig } from 'motion/react';

const DeckEditor = lazy(() =>
  import('./components/deck/DeckEditor').then((module) => ({ default: module.DeckEditor }))
);
const StudyView = lazy(() =>
  import('./components/study/StudyView').then((module) => ({ default: module.StudyView }))
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

  // 입력창을 제외한 모든 버튼의 tabIndex를 -1로 유지 (키보드 Tab 네비게이션 시 입력창만 순회)
  useEffect(() => {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    const applyButtonTabIndex = () => {
      document.querySelectorAll('button:not([tabindex="-1"])').forEach((btn) => {
        btn.setAttribute('tabindex', '-1');
      });
    };
    applyButtonTabIndex();
    const observer = new MutationObserver(applyButtonTabIndex);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const [currentView, setCurrentView] = useState<ViewMode>({ type: 'dashboard' });
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
    setCurrentView({ type: 'dashboard' });
    setFolderModalState({ isOpen: false });
  }, [user?.uid]);

  // 네비게이션 헬퍼
  const navigateHome = () => setCurrentView({ type: 'dashboard' });
  const navigateAllFolders = () => setCurrentView({ type: 'all-folders' });
  const navigateAllDecks = () => setCurrentView({ type: 'all-decks' });
  const navigateFolder = (folderId: string) => setCurrentView({ type: 'folder', folderId });
  const navigateDeck = (deckId: string) => setCurrentView({ type: 'deck', deckId });
  const navigateEditDeck = (deckId?: string, folderId?: string, focusCardId?: string) =>
    setCurrentView({ type: 'edit-deck', deckId, folderId, focusCardId });
  const navigateStudy = (deckId: string, onlyDifficult = false, shuffle = false) => {
    setLastStudiedDeckId(deckId);
    try {
      localStorage.setItem('flashcard_last_studied_deck_id', deckId);
    } catch {
      // ignore storage error
    }
    setCurrentView({ type: 'study', deckId, onlyDifficult, shuffle });
  };

  const openNewFolderModal = () => setFolderModalState({ isOpen: true });
  const closeFolderModal = () => setFolderModalState({ isOpen: false });

  // 학습 모드일 때는 화면 전체 몰입을 위해 사이드바 숨김
  const showSidebar = currentView.type !== 'study';

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        {/* 1. 글로벌 좌측 접이식 사이드바 */}
        {showSidebar && (
          <Sidebar
            currentView={currentView}
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            onToggleCollapse={toggleSidebar}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onNavigateHome={navigateHome}
            onNavigateAllFolders={navigateAllFolders}
            onNavigateAllDecks={navigateAllDecks}
            onNavigateFolder={navigateFolder}
            onNavigateDeck={navigateDeck}
            onCreateDeck={() => navigateEditDeck()}
            onCreateFolder={openNewFolderModal}
          />
        )}

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
          />

          {/* 메인 뷰 컨테이너 */}
          <main
            id="main-content"
            tabIndex={-1}
            key={user?.uid || 'guest'}
            className="flex-1 pb-8 outline-none"
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
              {currentView.type === 'dashboard' && (
                <DashboardView
                  lastStudiedDeckId={lastStudiedDeckId}
                  onNavigateDeck={navigateDeck}
                  onNavigateAllDecks={navigateAllDecks}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeck={() => navigateEditDeck()}
                  onCreateFolder={openNewFolderModal}
                />
              )}

              {currentView.type === 'all-folders' && (
                <AllFoldersView
                  onNavigateFolder={navigateFolder}
                  onCreateFolder={openNewFolderModal}
                  onBack={navigateHome}
                />
              )}

              {currentView.type === 'all-decks' && (
                <AllDecksView
                  onNavigateDeck={navigateDeck}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeck={() => navigateEditDeck()}
                  onBack={navigateHome}
                />
              )}

              {currentView.type === 'folder' && (
                <FolderDetailView
                  folderId={currentView.folderId}
                  onNavigateDeck={navigateDeck}
                  onStartStudy={(deckId) => navigateStudy(deckId)}
                  onCreateDeckInFolder={(folderId) => navigateEditDeck(undefined, folderId)}
                  onBack={navigateHome}
                />
              )}

              {currentView.type === 'deck' && (
                <DeckDetailView
                  deckId={currentView.deckId}
                  onStartStudy={(deckId, shuffle) => navigateStudy(deckId, false, shuffle)}
                  onEditDeck={(deckId, focusCardId) =>
                    navigateEditDeck(deckId, undefined, focusCardId)
                  }
                  onNavigateFolder={navigateFolder}
                  onBack={navigateHome}
                />
              )}

              {currentView.type === 'edit-deck' && (
                <DeckEditor
                  key={`${user?.uid || 'guest'}:${currentView.deckId || 'new'}:${currentView.folderId || 'root'}`}
                  deckId={currentView.deckId}
                  initialFolderId={currentView.folderId}
                  focusCardId={currentView.focusCardId}
                  onClose={() => {
                    if (currentView.deckId) {
                      navigateDeck(currentView.deckId);
                    } else if (currentView.folderId) {
                      navigateFolder(currentView.folderId);
                    } else {
                      navigateHome();
                    }
                  }}
                  onSaved={(savedDeckId) => navigateDeck(savedDeckId)}
                />
              )}

              {currentView.type === 'study' && (
                <StudyView
                  deckId={currentView.deckId}
                  onlyDifficult={currentView.onlyDifficult}
                  shuffle={currentView.shuffle}
                  onExit={() => navigateDeck(currentView.deckId)}
                  onEditDeck={(deckId) => navigateEditDeck(deckId)}
                />
              )}
            </Suspense>
          </main>

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
