import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ViewMode } from './types';
import { useFlashcardStore } from './store/useFlashcardStore';
import { Navbar } from './components/common/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FolderDetailView } from './components/folder/FolderDetailView';
import { FolderModal } from './components/folder/FolderModal';
import { DeckDetailView } from './components/deck/DeckDetailView';
import { DeckEditor } from './components/deck/DeckEditor';
import { StudyView } from './components/study/StudyView';
import { AllFoldersView } from './components/folder/AllFoldersView';
import { AllDecksView } from './components/deck/AllDecksView';

export const App: React.FC = () => {
  const { initCloudSync, setSyncStatus, setUser, user } = useFlashcardStore();

  // Firebase Auth 인증 상태 감지 및 자동 동기화
  useEffect(() => {
    if (!auth) return;

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

  const [currentView, setCurrentView] = useState<ViewMode>({ type: 'dashboard' });
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    folderId?: string;
  }>({ isOpen: false });

  // 뷰 변경 시 스크롤 최상단 초기화 (모바일 및 SPA 스크롤 위치 유지 방지)
  useEffect(() => {
    // 특정 카드에 포커스하여 편집기로 진입하는 경우가 아니라면 항상 최상단으로 스크롤
    if (currentView.type === 'edit-deck' && currentView.focusCardId) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  // 네비게이션 헬퍼
  const navigateHome = () => setCurrentView({ type: 'dashboard' });
  const navigateAllFolders = () => setCurrentView({ type: 'all-folders' });
  const navigateAllDecks = () => setCurrentView({ type: 'all-decks' });
  const navigateFolder = (folderId: string) => setCurrentView({ type: 'folder', folderId });
  const navigateDeck = (deckId: string) => setCurrentView({ type: 'deck', deckId });
  const navigateEditDeck = (deckId?: string, folderId?: string, focusCardId?: string) =>
    setCurrentView({ type: 'edit-deck', deckId, folderId, focusCardId });
  const navigateStudy = (deckId: string, onlyDifficult = false) =>
    setCurrentView({ type: 'study', deckId, onlyDifficult });

  const openNewFolderModal = () => setFolderModalState({ isOpen: true });
  const closeFolderModal = () => setFolderModalState({ isOpen: false });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* 글로벌 상단 헤더 */}
      <Navbar
        currentView={currentView}
        onNavigateHome={navigateHome}
        onNavigateFolder={navigateFolder}
        onNavigateDeck={navigateDeck}
      />

      {/* 메인 뷰 컨테이너 */}
      <main className="flex-1 pb-16">
        {currentView.type === 'dashboard' && (
          <DashboardView
            onNavigateFolder={navigateFolder}
            onNavigateDeck={navigateDeck}
            onNavigateAllFolders={navigateAllFolders}
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
            onStartStudy={(deckId) => navigateStudy(deckId)}
            onEditDeck={(deckId, focusCardId) => navigateEditDeck(deckId, undefined, focusCardId)}
            onNavigateFolder={navigateFolder}
            onBack={navigateHome}
          />
        )}

        {currentView.type === 'edit-deck' && (
          <DeckEditor
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
            onExit={() => navigateDeck(currentView.deckId)}
            onEditDeck={(deckId) => navigateEditDeck(deckId)}
          />
        )}
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
  );
};

export default App;
