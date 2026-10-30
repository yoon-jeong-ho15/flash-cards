import { selectDeckCards, selectFolderCards } from '../store/cardSelectors';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Deck, Folder } from '../types';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { sortCardsByOrder } from '../services/flashcardService';

interface UseStudySessionOptions {
  deckId?: string;
  folderId?: string;
  onlyDifficult?: boolean;
  shuffle?: boolean;
  onExit: () => void;
}

export type StudyActionType = 'unknown' | 'know' | null;

function shuffleCards<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export interface StudyHistoryEntry {
  card: Card;
  action: 'know' | 'unknown';
  wasDifficultAlready: boolean;
  wasLearnedOriginally: boolean;
  previousRound: number;
}

export interface StudySessionState {
  deck: Deck | undefined;
  folder: Folder | undefined;
  deckCards: Card[];
  sessionCards: Card[];
  currentIndex: number;
  currentCard: Card | null;
  totalInitialCount: number;
  masteredCount: number;
  isCurrentCardLearned: boolean;
  isFlipped: boolean;
  round: number;
  isShake: boolean;
  isCompleted: boolean;
  actionFeedback: StudyActionType;
  direction: number;
  stepCount: number;
  isShuffle: boolean;
  canGoPrevious: boolean;
  isLastCard: boolean;
  isFinishModalOpen: boolean;
  remainingUnlearnedCount: number;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  handleFlip: () => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleToggleKnow: () => void;
  handleUnknown: () => void;
  handleKnow: () => void;
  initSession: (filterUnlearnedOnly?: boolean, shouldShuffle?: boolean, resetRound?: boolean) => void;
  handleRestartUnlearned: () => void;
  handleRestartAll: () => void;
  closeFinishModal: () => void;
  openFinishModal: () => void;
  openEditModal: () => void;
  closeEditModal: () => void;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  handleUpdateCurrentCard: (updates: { termRichText: string; definitionRichText: string }) => void;
  handleDeleteCurrentCard: () => void;
}

export const useStudySession = ({
  deckId,
  folderId,
  onlyDifficult = false,
  shuffle = folderId !== undefined,
  onExit,
}: UseStudySessionOptions): StudySessionState => {
  const deck = useFlashcardStore(state => state.decks.find(item => item.id === deckId));
  const folder = useFlashcardStore(state => state.folders.find(item => item.id === folderId));
  const decks = useFlashcardStore(state => state.decks);
  const cards = useFlashcardStore(state => state.cards);
  const selectSourceCards = useCallback(
    (state: { cards: Card[]; decks: Deck[] }) => folderId !== undefined
      ? selectFolderCards(state, folderId)
      : selectDeckCards(state, deckId ?? ''),
    [deckId, folderId]
  );
  const deckCards = useMemo(() => selectSourceCards({ cards, decks }), [cards, decks, selectSourceCards]);
  const setCardLearned = useFlashcardStore(state => state.setCardLearned);
  const updateCard = useFlashcardStore(state => state.updateCard);
  const deleteCard = useFlashcardStore(state => state.deleteCard);

  const [sessionCardIds, setSessionCardIds] = useState<string[]>([]);
  const sessionCards = useMemo(() => {
    const byId = new Map(deckCards.map(card => [card.id, card]));
    return sessionCardIds.map(id => byId.get(id)).filter((card): card is Card => Boolean(card));
  }, [sessionCardIds, deckCards]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [round, setRound] = useState<number>(1);
  const [actionFeedback, setActionFeedback] = useState<StudyActionType>(null);
  const [direction, setDirection] = useState<number>(0);
  const [stepCount, setStepCount] = useState<number>(0);

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFeedback = useCallback((type: StudyActionType) => {
    setActionFeedback(type);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setActionFeedback(null);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // 폴더 학습은 '알아요' 카드를 포함하고, 기존 덱 학습은 미완료 카드부터 시작합니다.
  const initSession = useCallback(
    (filterUnlearnedOnly = folderId === undefined, shouldShuffle = shuffle, resetRound = false) => {
      const rawStoreCards = selectSourceCards(useFlashcardStore.getState());
      const storeCards = sortCardsByOrder(rawStoreCards);
      let targetCards = storeCards;
      if (filterUnlearnedOnly) {
        targetCards = targetCards.filter((c) => !c.learned);
      }

      if (shouldShuffle) {
        targetCards = shuffleCards(targetCards);
      }

      setSessionCardIds(targetCards.map(card => card.id));
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setIsFinishModalOpen(false);
      setDirection(0);
      setActionFeedback(null);
      setStepCount(0);
      if (resetRound) {
        setRound(1);
      }
    },
    [folderId, selectSourceCards, shuffle]
  );

  // 세션 진입 시 (또는 덱/모드 변경 시) 1회만 초기화하여 학습 중 store 변경으로 인한 리셋 방지
  const lastInitParamsRef = useRef<string>('');

  useEffect(() => {
    const currentParamKey = JSON.stringify([deckId, folderId, shuffle]);
    if (deckCards.length > 0 && lastInitParamsRef.current !== currentParamKey) {
      lastInitParamsRef.current = currentParamKey;
      initSession(folderId === undefined, shuffle, true);
    }
  }, [deckId, folderId, shuffle, deckCards.length, initSession]);

  useEffect(() => {
    setCurrentIndex(index => Math.min(index, Math.max(0, sessionCards.length - 1)));
  }, [sessionCards.length]);

  // 카드 뒤집기
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // "이전 카드" (왼쪽 화살표)
  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
    setIsFlipped(false);
    setDirection(1); // 이전 방향 애니메이션
    setStepCount((c) => c + 1);
  }, [currentIndex]);

  // "다음 카드" (오른쪽 화살표) - 마지막 카드일 경우 재학습/종료 모달 호출
  const handleNext = useCallback(() => {
    if (sessionCards.length === 0) return;
    if (currentIndex >= sessionCards.length - 1) {
      setIsFinishModalOpen(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setIsFlipped(false);
    setDirection(-1); // 다음 방향 애니메이션
    setStepCount((c) => c + 1);
  }, [currentIndex, sessionCards.length]);

  // "알아요 토글" (Enter 키)
  const handleToggleKnow = useCallback(() => {
    if (sessionCards.length === 0 || currentIndex >= sessionCards.length) return;
    const card = sessionCards[currentIndex];
    const newLearned = !card.learned;

    // 1. 스토어 상태 반영
    setCardLearned(card.id, newLearned);


    // 3. 토글 피드백
    triggerFeedback(newLearned ? 'know' : null);
  }, [sessionCards, currentIndex, setCardLearned, triggerFeedback]);

  // '알아요' 제외하고 다시 학습 (모달에서 재학습 선택 시)
  const handleRestartUnlearned = useCallback(() => {
    initSession(true, shuffle);
    setRound((r) => r + 1);
  }, [initSession, shuffle]);

  // 전체 카드 다시 학습 (모달에서 전체 재학습 선택 시)
  const handleRestartAll = useCallback(() => {
    initSession(false, shuffle, true);
  }, [initSession, shuffle]);

  const closeFinishModal = useCallback(() => {
    setIsFinishModalOpen(false);
  }, []);

  const openFinishModal = useCallback(() => {
    setIsFinishModalOpen(true);
  }, []);

  const openEditModal = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const openDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const currentCard =
    sessionCards.length > 0 && currentIndex < sessionCards.length
      ? sessionCards[currentIndex]
      : null;

  // 카드 내용 즉석 수정 핸들러
  const handleUpdateCurrentCard = useCallback(
    (updates: { termRichText: string; definitionRichText: string }) => {
      if (!currentCard) return;

      // 1. 스토어 갱신
      updateCard(currentCard.id, updates);


      closeEditModal();
    },
    [currentCard, updateCard, closeEditModal]
  );

  // 카드 즉석 삭제 핸들러
  const handleDeleteCurrentCard = useCallback(() => {
    if (!currentCard) return;

    const cardIdToDelete = currentCard.id;

    // 1. 스토어에서 카드 삭제
    deleteCard(cardIdToDelete);

    // 2. 세션 카드 목록에서 제거
    setSessionCardIds((prev) => prev.filter(id => id !== cardIdToDelete));

    // 3. 인덱스 보정
    setCurrentIndex((prevIndex) => {
      const nextLength = sessionCards.length - 1;
      if (nextLength <= 0) return 0;
      if (prevIndex >= nextLength) return Math.max(0, nextLength - 1);
      return prevIndex;
    });

    setIsFlipped(false);
    closeDeleteModal();
    closeEditModal();
  }, [currentCard, deleteCard, sessionCards.length, closeDeleteModal, closeEditModal]);

  // 호환용 별칭
  const handleUnknown = handleNext;
  const handleKnow = handleToggleKnow;

  // 키보드 단축키 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      // 모달이 열려있는 동안에는 모달 외 단축키 동작 차단 (Esc는 해당 모달 닫기)
      if (isFinishModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsFinishModalOpen(false);
        }
        return;
      }

      if (isDeleteModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsDeleteModalOpen(false);
        }
        return;
      }

      if (isEditModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditModalOpen(false);
        }
        return;
      }

      // input이나 textarea 포커스 중에는 단축키 무시
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Let focused controls keep their native Enter/Space activation.
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement)?.closest('button, a, [role="button"]')) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleToggleKnow();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (currentCard) {
          setIsEditModalOpen(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFinishModalOpen,
    isDeleteModalOpen,
    isEditModalOpen,
    currentCard,
    handleFlip,
    handlePrevious,
    handleNext,
    handleToggleKnow,
    onExit,
  ]);

  const isCurrentCardLearned = Boolean(currentCard?.learned);
  const masteredCount = sessionCards.filter((c) => c.learned).length;
  const totalInitialCount = sessionCards.length;
  const canGoPrevious = currentIndex > 0;
  const isLastCard = sessionCards.length > 0 && currentIndex >= sessionCards.length - 1;

  const remainingUnlearnedCount = useMemo(
    () => deckCards.filter((c) => !c.learned).length,
    [deckCards]
  );

  return {
    deck,
    folder,
    deckCards,
    sessionCards,
    currentIndex,
    currentCard,
    totalInitialCount,
    masteredCount,
    isCurrentCardLearned,
    isFlipped,
    round,
    isShake: false,
    isCompleted,
    actionFeedback,
    direction,
    stepCount,
    isShuffle: shuffle,
    canGoPrevious,
    isLastCard,
    isFinishModalOpen,
    remainingUnlearnedCount,
    isEditModalOpen,
    isDeleteModalOpen,
    handleFlip,
    handlePrevious,
    handleNext,
    handleToggleKnow,
    handleUnknown,
    handleKnow,
    initSession,
    handleRestartUnlearned,
    handleRestartAll,
    closeFinishModal,
    openFinishModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleUpdateCurrentCard,
    handleDeleteCurrentCard,
  };
};
