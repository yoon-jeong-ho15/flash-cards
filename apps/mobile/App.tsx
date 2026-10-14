import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  Platform,
  BackHandler,
  SafeAreaView,
} from 'react-native';
import type { ViewMode } from '@flashcards/types';
import { FlashcardProvider } from './src/store/flashcardStore';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AllFoldersScreen } from './src/screens/AllFoldersScreen';
import { AllDecksScreen } from './src/screens/AllDecksScreen';
import { FolderDetailScreen } from './src/screens/FolderDetailScreen';
import { DeckDetailScreen } from './src/screens/DeckDetailScreen';
import { DeckEditorScreen } from './src/screens/DeckEditorScreen';
import { StudyScreen } from './src/screens/StudyScreen';
import { FolderModal } from './src/components/folder/FolderModal';

function MainApp() {
  const [currentView, setCurrentView] = useState<ViewMode>({ type: 'dashboard' });
  const [history, setHistory] = useState<ViewMode[]>([]);
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    folderId?: string;
  }>({ isOpen: false });

  // 뷰 전환 네비게이션 함수 (히스토리 스택 누적)
  const navigateTo = useCallback((nextView: ViewMode) => {
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(nextView);
  }, [currentView]);

  // 뒤로 가기 처리
  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prevView = history[history.length - 1];
      setHistory((prev) => prev.slice(0, prev.length - 1));
      setCurrentView(prevView);
      return true;
    } else if (currentView.type !== 'dashboard') {
      setCurrentView({ type: 'dashboard' });
      return true;
    }
    return false;
  }, [history, currentView]);

  // 안드로이드 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      if (folderModalState.isOpen) {
        setFolderModalState({ isOpen: false });
        return true;
      }
      return handleBack();
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [handleBack, folderModalState.isOpen]);

  // 화면 이동 헬퍼들
  const navigateHome = () => {
    setHistory([]);
    setCurrentView({ type: 'dashboard' });
  };
  const navigateAllFolders = () => navigateTo({ type: 'all-folders' });
  const navigateAllDecks = () => navigateTo({ type: 'all-decks' });
  const navigateFolder = (folderId: string) => navigateTo({ type: 'folder', folderId });
  const navigateDeck = (deckId: string) => navigateTo({ type: 'deck', deckId });
  const navigateEditDeck = (deckId?: string, folderId?: string, focusCardId?: string) =>
    navigateTo({ type: 'edit-deck', deckId, folderId, focusCardId });
  const navigateStudy = (deckId: string, onlyDifficult = false) =>
    navigateTo({ type: 'study', deckId, onlyDifficult });

  const openNewFolderModal = () => setFolderModalState({ isOpen: true });
  const closeFolderModal = () => setFolderModalState({ isOpen: false });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 현재 ViewMode에 따른 스크린 렌더링 */}
      <View style={styles.screenContainer}>
        {currentView.type === 'dashboard' && (
          <DashboardScreen
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
          <AllFoldersScreen
            onNavigateFolder={navigateFolder}
            onCreateFolder={openNewFolderModal}
            onBack={handleBack}
          />
        )}

        {currentView.type === 'all-decks' && (
          <AllDecksScreen
            onNavigateDeck={navigateDeck}
            onStartStudy={(deckId) => navigateStudy(deckId)}
            onCreateDeck={() => navigateEditDeck()}
            onBack={handleBack}
          />
        )}

        {currentView.type === 'folder' && (
          <FolderDetailScreen
            folderId={currentView.folderId}
            onNavigateDeck={navigateDeck}
            onStartStudy={(deckId) => navigateStudy(deckId)}
            onCreateDeckInFolder={(fId) => navigateEditDeck(undefined, fId)}
            onBack={handleBack}
          />
        )}

        {currentView.type === 'deck' && (
          <DeckDetailScreen
            deckId={currentView.deckId}
            onStartStudy={(deckId) => navigateStudy(deckId)}
            onEditDeck={(deckId, focusCardId) => navigateEditDeck(deckId, undefined, focusCardId)}
            onNavigateFolder={navigateFolder}
            onBack={handleBack}
          />
        )}

        {currentView.type === 'edit-deck' && (
          <DeckEditorScreen
            deckId={currentView.deckId}
            initialFolderId={currentView.folderId}
            focusCardId={currentView.focusCardId}
            onClose={handleBack}
            onSaved={(savedDeckId) => {
              navigateDeck(savedDeckId);
            }}
          />
        )}

        {currentView.type === 'study' && (
          <StudyScreen
            deckId={currentView.deckId}
            onlyDifficult={currentView.onlyDifficult}
            onExit={handleBack}
            onEditDeck={(deckId) => navigateEditDeck(deckId)}
          />
        )}
      </View>

      {/* 글로벌 폴더 생성/수정 모달 */}
      <FolderModal
        isOpen={folderModalState.isOpen}
        folderId={folderModalState.folderId}
        onClose={closeFolderModal}
        onSaved={(newFolderId) => {
          closeFolderModal();
          navigateFolder(newFolderId);
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <FlashcardProvider>
      <MainApp />
    </FlashcardProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
