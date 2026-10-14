import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Deck, Card, Folder, UserProfile } from '@flashcards/types';
import { firebaseService } from '../services/firebaseService';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface FlashcardContextType {
  user: UserProfile | null;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  folders: Folder[];
  decks: Deck[];
  cards: Card[];

  // Auth actions
  loginWithGoogle: (userProfile: UserProfile) => Promise<void>;
  logout: () => void;
  initCloudSync: () => Promise<void>;

  // Folder actions
  addFolder: (title: string, description?: string) => string;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'title' | 'description'>>) => void;
  deleteFolder: (id: string, deleteContainedDecks?: boolean) => void;

  // Deck actions
  addDeck: (
    deckData: { title: string; description?: string; folderId?: string | null },
    initialCards?: Array<{
      termRichText: string;
      definitionRichText: string;
      frontImageUrl?: string;
      backImageUrl?: string;
      imageUrl?: string;
    }>
  ) => string;
  updateDeck: (id: string, updates: Partial<Pick<Deck, 'title' | 'description' | 'folderId'>>) => void;
  deleteDeck: (id: string) => void;
  moveDeck: (deckId: string, folderId: string | null) => void;

  // Card actions
  addCard: (cardData: Omit<Card, 'id'>) => string;
  updateCard: (id: string, updates: Partial<Omit<Card, 'id' | 'deckId'>>) => void;
  deleteCard: (id: string) => void;
  saveDeckWithCards: (
    deckId: string | null,
    deckData: { title: string; description?: string; folderId?: string | null },
    cardsData: Array<{
      id?: string;
      termRichText: string;
      definitionRichText: string;
      frontImageUrl?: string;
      backImageUrl?: string;
      imageUrl?: string;
      learned?: boolean;
    }>
  ) => string;
  setCardLearned: (id: string, learned: boolean) => void;
  resetDeckProgress: (deckId: string) => void;
}

const FlashcardContext = createContext<FlashcardContextType | null>(null);

export const FlashcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 사용자가 요청한 대로: 바로 특정 아이디로 로그인된 상태가 아닌 null(로그인 전)로 시작!
  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // 로그인 전에는 빈 상태로 시작!
  const [folders, setFolders] = useState<Folder[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  // Firestore 클라우드 동기화 함수
  const initCloudSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');

    try {
      const data = await firebaseService.fetchUserData(user.uid);
      if (data) {
        setFolders(data.folders);
        setDecks(data.decks);
        setCards(data.cards);
      }
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
    } catch (err) {
      console.error('클라우드 동기화 실패:', err);
      setSyncStatus('error');
    }
  }, [user]);

  // 구글 로그인 성공 시 해당 구글 계정으로 상태 변경 및 Firestore 데이터 fetch
  const loginWithGoogle = useCallback(async (userProfile: UserProfile) => {
    setUser(userProfile);
    setSyncStatus('syncing');

    try {
      const data = await firebaseService.fetchUserData(userProfile.uid);
      setFolders(data.folders);
      setDecks(data.decks);
      setCards(data.cards);
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
    } catch (err) {
      console.error('로그인 후 데이터 로드 실패:', err);
      setSyncStatus('offline');
    }
  }, []);

  // 로그아웃 액션
  const logout = useCallback(() => {
    setUser(null);
    setFolders([]);
    setDecks([]);
    setCards([]);
    setSyncStatus('offline');
    setLastSyncedAt(null);
  }, []);

  // Folder Actions
  const addFolder = useCallback((title: string, description?: string) => {
    const id = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newFolder: Folder = {
      id,
      userId: user?.uid,
      title: title.trim(),
      description: description?.trim(),
      createdAt: Date.now(),
    };
    setFolders((prev) => [newFolder, ...prev]);
    return id;
  }, [user]);

  const updateFolder = useCallback((id: string, updates: Partial<Pick<Folder, 'title' | 'description'>>) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates, title: updates.title?.trim() ?? f.title } : f))
    );
  }, []);

  const deleteFolder = useCallback((id: string, deleteContainedDecks = false) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (deleteContainedDecks) {
      setDecks((prevDecks) => {
        const decksToDelete = prevDecks.filter((d) => d.folderId === id).map((d) => d.id);
        setCards((prevCards) => prevCards.filter((c) => !decksToDelete.includes(c.deckId)));
        return prevDecks.filter((d) => d.folderId !== id);
      });
    } else {
      setDecks((prevDecks) =>
        prevDecks.map((d) => (d.folderId === id ? { ...d, folderId: null, updatedAt: Date.now() } : d))
      );
    }
  }, []);

  // Deck Actions
  const addDeck = useCallback(
    (
      deckData: { title: string; description?: string; folderId?: string | null },
      initialCards: Array<{
        termRichText: string;
        definitionRichText: string;
        frontImageUrl?: string;
        backImageUrl?: string;
        imageUrl?: string;
      }> = []
    ) => {
      const now = Date.now();
      const deckId = `deck-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const newDeck: Deck = {
        id: deckId,
        userId: user?.uid,
        title: deckData.title.trim(),
        description: deckData.description?.trim(),
        folderId: deckData.folderId || null,
        createdAt: now,
        updatedAt: now,
      };

      const newCards: Card[] = initialCards.map((c, index) => ({
        id: `card-${now}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        deckId,
        userId: user?.uid,
        termRichText: c.termRichText,
        definitionRichText: c.definitionRichText,
        frontImageUrl: c.frontImageUrl,
        backImageUrl: c.backImageUrl || c.imageUrl,
        imageUrl: c.imageUrl || c.backImageUrl,
        learned: false,
      }));

      setDecks((prev) => [newDeck, ...prev]);
      if (newCards.length > 0) {
        setCards((prev) => [...prev, ...newCards]);
      }
      return deckId;
    },
    [user]
  );

  const updateDeck = useCallback((id: string, updates: Partial<Pick<Deck, 'title' | 'description' | 'folderId'>>) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d))
    );
  }, []);

  const deleteDeck = useCallback((id: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setCards((prev) => prev.filter((c) => c.deckId !== id));
  }, []);

  const moveDeck = useCallback((deckId: string, folderId: string | null) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, folderId, updatedAt: Date.now() } : d))
    );
  }, []);

  // Card Actions
  const addCard = useCallback((cardData: Omit<Card, 'id'>) => {
    const id = `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCard: Card = { ...cardData, id, userId: user?.uid };
    setCards((prev) => [...prev, newCard]);
    setDecks((prev) =>
      prev.map((d) => (d.id === cardData.deckId ? { ...d, updatedAt: Date.now() } : d))
    );
    return id;
  }, [user]);

  const updateCard = useCallback((id: string, updates: Partial<Omit<Card, 'id' | 'deckId'>>) => {
    setCards((prev) => {
      let targetDeckId: string | undefined;
      const updated = prev.map((c) => {
        if (c.id === id) {
          targetDeckId = c.deckId;
          return { ...c, ...updates };
        }
        return c;
      });
      if (targetDeckId) {
        setDecks((dPrev) =>
          dPrev.map((d) => (d.id === targetDeckId ? { ...d, updatedAt: Date.now() } : d))
        );
      }
      return updated;
    });
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (card) {
        setDecks((dPrev) =>
          dPrev.map((d) => (d.id === card.deckId ? { ...d, updatedAt: Date.now() } : d))
        );
      }
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const saveDeckWithCards = useCallback(
    (
      deckId: string | null,
      deckData: { title: string; description?: string; folderId?: string | null },
      cardsData: Array<{
        id?: string;
        termRichText: string;
        definitionRichText: string;
        frontImageUrl?: string;
        backImageUrl?: string;
        imageUrl?: string;
        learned?: boolean;
      }>
    ) => {
      const now = Date.now();
      const targetDeckId = deckId || `deck-${now}-${Math.random().toString(36).substring(2, 7)}`;

      const synchronizedCards: Card[] = cardsData.map((item, index) => ({
        id: item.id || `card-${now}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        deckId: targetDeckId,
        userId: user?.uid,
        termRichText: item.termRichText,
        definitionRichText: item.definitionRichText,
        frontImageUrl: item.frontImageUrl,
        backImageUrl: item.backImageUrl || item.imageUrl,
        imageUrl: item.imageUrl || item.backImageUrl,
        learned: item.learned ?? false,
      }));

      setDecks((prev) => {
        if (deckId) {
          return prev.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  title: deckData.title.trim(),
                  description: deckData.description?.trim(),
                  folderId: deckData.folderId || null,
                  updatedAt: now,
                }
              : d
          );
        } else {
          const newDeck: Deck = {
            id: targetDeckId,
            userId: user?.uid,
            title: deckData.title.trim(),
            description: deckData.description?.trim(),
            folderId: deckData.folderId || null,
            createdAt: now,
            updatedAt: now,
          };
          return [newDeck, ...prev];
        }
      });

      setCards((prev) => {
        const otherCards = prev.filter((c) => c.deckId !== targetDeckId);
        return [...otherCards, ...synchronizedCards];
      });

      return targetDeckId;
    },
    [user]
  );

  const setCardLearned = useCallback((id: string, learned: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, learned } : c)));
  }, []);

  const resetDeckProgress = useCallback((deckId: string) => {
    setCards((prev) => prev.map((c) => (c.deckId === deckId ? { ...c, learned: false } : c)));
  }, []);

  const value = useMemo(
    () => ({
      user,
      syncStatus,
      lastSyncedAt,
      folders,
      decks,
      cards,
      loginWithGoogle,
      logout,
      initCloudSync,
      addFolder,
      updateFolder,
      deleteFolder,
      addDeck,
      updateDeck,
      deleteDeck,
      moveDeck,
      addCard,
      updateCard,
      deleteCard,
      saveDeckWithCards,
      setCardLearned,
      resetDeckProgress,
    }),
    [
      user,
      syncStatus,
      lastSyncedAt,
      folders,
      decks,
      cards,
      loginWithGoogle,
      logout,
      initCloudSync,
      addFolder,
      updateFolder,
      deleteFolder,
      addDeck,
      updateDeck,
      deleteDeck,
      moveDeck,
      addCard,
      updateCard,
      deleteCard,
      saveDeckWithCards,
      setCardLearned,
      resetDeckProgress,
    ]
  );

  return <FlashcardContext.Provider value={value}>{children}</FlashcardContext.Provider>;
};

export const useFlashcardStore = (): FlashcardContextType => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error('useFlashcardStore must be used within a FlashcardProvider');
  }
  return context;
};
