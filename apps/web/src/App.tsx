import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { auth } from './lib/firebase';
import { useLocation, useNavigate, Link } from 'react-router';
import { resolveView, viewUrl, routeStatus } from './routing';
import { EmptyState } from './components/common/EmptyState';
import { Button } from './components/ui/button';
import { useFlashcardStore } from './store/useFlashcardStore';
import { useAccountSyncLifecycle } from './hooks/useAccountSyncLifecycle';
import { BottomNavigation } from './components/common/BottomNavigation';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearch } from './components/common/GlobalSearch';
import { AccountView } from './components/account/AccountView';
import { DashboardView } from './components/dashboard/DashboardView';
import { FolderDetailView } from './components/folder/FolderDetailView';
import { FolderModal } from './components/folder/FolderModal';
import { SetDetailView } from './components/set/SetDetailView';
import { AllFoldersView } from './components/folder/AllFoldersView';
import { AllSetsView } from './components/set/AllSetsView';
import { MotionConfig } from 'motion/react';

const SetEditor = lazy(() =>
  import('./components/set/SetEditor').then((module) => ({
    default: module.SetEditor,
  }))
);
const StudyView = lazy(() =>
  import('./components/study/StudyView').then((module) => ({
    default: module.StudyView,
  }))
);

export const App: React.FC = () => {
  useAccountSyncLifecycle();

  const initCloudSync = useFlashcardStore((state) => state.initCloudSync);
  const user = useFlashcardStore((state) => state.user);

  const syncError = useFlashcardStore(state => state.syncError);
  const syncStatus = useFlashcardStore(state => state.syncStatus);
  const storageError = useFlashcardStore(state => state.storageError);

  const location = useLocation();
  const navigate = useNavigate();
  const routeView = useMemo(() => resolveView(location.pathname, location.search), [location.pathname, location.search]);
  const currentView = routeView ?? { type: 'dashboard' as const };
  const status = useFlashcardStore(state => routeStatus(routeView, state));
  const loginWithGoogle = useFlashcardStore(state => state.loginWithGoogle);
  const [lastStudiedSetId, setLastStudiedSetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('flashcard_last_studied_set_id') ?? localStorage.getItem('flashcard_last_studied_deck_id');
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
    if (currentView.type === 'edit-set' && currentView.focusCardId) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  useEffect(() => {
    setFolderModalState({ isOpen: false });
    setIsMobileSidebarOpen(false);
    setSearchOpen(false);
  }, [user?.uid, location.key]);

  // 네비게이션 헬퍼
  const navigateHome = () => navigate(viewUrl({ type: 'dashboard' }));
  const navigateAccount = () => navigate(viewUrl({ type: 'account' }));
  const navigateAllFolders = () => navigate(viewUrl({ type: 'all-folders' }));
  const navigateAllSets = () => navigate(viewUrl({ type: 'all-sets' }));
  const navigateFolder = (folderId: string) => navigate(viewUrl({ type: 'folder', folderId }));
  const navigateSet = (setId: string) => navigate(viewUrl({ type: 'set', setId }));
  const navigateEditSet = (setId?: string, folderId?: string, focusCardId?: string) =>
    navigate(viewUrl({ type: 'edit-set', setId, folderId, focusCardId }));
  const navigateStudy = (setId: string, onlyDifficult = false, shuffle = false) => {
    navigate(viewUrl({ type: 'study', setId, onlyDifficult, shuffle }));
  };

  const studiedSetId = status === 'ready' && currentView.type === 'study' ? currentView.setId : null;
  useEffect(() => {
    if (!studiedSetId) return;
    setLastStudiedSetId(studiedSetId);
    try {
      localStorage.setItem('flashcard_last_studied_set_id', studiedSetId);
    } catch {
      // Study remains available when storage is full or disabled.
    }
  }, [studiedSetId]);

  const openNewFolderModal = () => setFolderModalState({ isOpen: true });
  const closeFolderModal = () => setFolderModalState({ isOpen: false });

  const readyView = status === 'ready' ? routeView : null;
  const showBottomNavigation = readyView &&
    readyView.type !== 'study' &&
    readyView.type !== 'folder-study' &&
    readyView.type !== 'edit-set';

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
        {storageError && <div role="alert" className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] bg-destructive text-destructive-foreground p-3 rounded-lg">
          저장하지 못했습니다: {storageError}
        </div>}
        {user && syncStatus === 'error' && <div role="alert" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-[min(90vw,36rem)] rounded-lg border border-destructive bg-background p-3 text-sm shadow-lg">
          <p>{syncError || '동기화를 완료하지 못했습니다.'} 원본과 대기 작업은 보관됩니다.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void initCloudSync()}>동기화 다시 시도</Button>
        </div>}
        {/* 1. 글로벌 좌측 접이식 사이드바 */}
        <Sidebar
          currentView={currentView}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onToggleCollapse={toggleSidebar}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNavigateHome={navigateHome}
          onNavigateAccount={navigateAccount}
          onOpenSearch={() => {
            if (isMobileSidebarOpen) {
              // Let the drawer restore focus before the search dialog takes it.
              requestAnimationFrame(() => setSearchOpen(true));
            } else {
              setSearchOpen(true);
            }
          }}
          onChooseStudySet={navigateAllSets}
          onNavigateFolder={navigateFolder}
          onNavigateSet={navigateSet}
          onCreateSet={() => navigateEditSet()}
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
                  lastStudiedSetId={lastStudiedSetId}
                  onNavigateSet={navigateSet}
                  onNavigateAllSets={navigateAllSets}
                  onNavigateFolder={navigateFolder}
                  onNavigateAllFolders={navigateAllFolders}
                  onStartStudy={(setId) => navigateStudy(setId)}
                  onCreateSet={() => navigateEditSet()}
                  onCreateFolder={openNewFolderModal}
                />
              )}

              {readyView?.type === 'all-folders' && (
                <AllFoldersView
                  onNavigateAllSets={navigateAllSets}
                  onNavigateFolder={navigateFolder}
                  onCreateFolder={openNewFolderModal}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'all-sets' && (
                <AllSetsView
                  onNavigateAllFolders={navigateAllFolders}
                  onNavigateSet={navigateSet}
                  onStartStudy={(setId) => navigateStudy(setId)}
                  onCreateSet={() => navigateEditSet()}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'folder' && (
                <FolderDetailView
                  folderId={readyView.folderId}
                  onNavigateSet={navigateSet}
                  onStartStudy={(setId) => navigateStudy(setId)}
                  onCreateSetInFolder={(folderId) => navigateEditSet(undefined, folderId)}
                  onStartFolderStudy={(folderId) =>
                    navigate(viewUrl({ type: 'folder-study', folderId }))
                  }
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'set' && (
                <SetDetailView
                  setId={readyView.setId}
                  onStartStudy={(setId, shuffle) => navigateStudy(setId, false, shuffle)}
                  onEditSet={(setId, focusCardId) =>
                    navigateEditSet(setId, undefined, focusCardId)
                  }
                  onNavigateFolder={navigateFolder}
                  onBack={navigateHome}
                />
              )}

              {readyView?.type === 'edit-set' && (
                <SetEditor
                  key={`${user?.uid || 'guest'}:${readyView.setId || 'new'}:${readyView.folderId || 'root'}`}
                  setId={readyView.setId}
                  initialFolderId={readyView.folderId}
                  focusCardId={readyView.focusCardId}
                  onClose={() => {
                    if (readyView.setId) {
                      navigateSet(readyView.setId);
                    } else if (readyView.folderId) {
                      navigateFolder(readyView.folderId);
                    } else {
                      navigateHome();
                    }
                  }}
                  onSaved={(savedSetId) => navigateSet(savedSetId)}
                />
              )}

              {readyView?.type === 'study' && (
                <StudyView
                  key={`${location.pathname}:${location.search}`}
                  setId={readyView.setId}
                  onlyDifficult={readyView.onlyDifficult}
                  shuffle={readyView.shuffle}
                  onExit={() => navigateSet(readyView.setId)}
                  onEditSet={(setId) => navigateEditSet(setId)}
                />
              )}

              {readyView?.type === 'folder-study' && (
                <StudyView
                  key={`${location.pathname}:${location.search}`}
                  folderId={readyView.folderId}
                  shuffle
                  onExit={() => navigateFolder(readyView.folderId)}
                  onEditSet={(setId) => navigateEditSet(setId)}
                />
              )}
            </Suspense>
          </main>

          {showBottomNavigation && (
            <BottomNavigation
              currentView={currentView}
              onHome={navigateHome}
              onSets={navigateAllSets}
              onFolders={navigateAllFolders}
              onCreate={() => navigateEditSet()}
            />
          )}

          {searchOpen && (
            <GlobalSearch
              onClose={() => setSearchOpen(false)}
              onNavigateSet={navigateSet}
              onNavigateFolder={navigateFolder}
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
