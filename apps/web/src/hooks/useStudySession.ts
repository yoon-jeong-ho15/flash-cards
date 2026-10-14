import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Deck } from '../types';
import { useFlashcardStore } from '../store/useFlashcardStore';

interface UseStudySessionOptions {
  deckId: string;
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
  handleFlip: () => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleToggleKnow: () => void;
  handleUnknown: () => void;
  handleKnow: () => void;
  initSession: (filterUnlearnedOnly?: boolean, shouldShuffle?: boolean) => void;
}

export const useStudySession = ({
  deckId,
  onlyDifficult = false,
  shuffle = false,
  onExit,
}: UseStudySessionOptions): StudySessionState => {
  const { decks, cards, setCardLearned } = useFlashcardStore();

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);

  // 학습 세션 카드 목록 및 현재 인덱스
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
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

  const deckCardsRef = useRef(deckCards);
  useEffect(() => {
    deckCardsRef.current = deckCards;
  }, [deckCards]);

  // 세션 초기화
  const initSession = useCallback(
    (filterUnlearnedOnly = false, shouldShuffle = shuffle) => {
      let targetCards = deckCardsRef.current;
      if (filterUnlearnedOnly) {
        targetCards = targetCards.filter((c) => !c.learned);
      }

      if (shouldShuffle) {
        targetCards = shuffleCards(targetCards);
      }

      setSessionCards(targetCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setDirection(0);
      setActionFeedback(null);
      setStepCount(0);
    },
    [shuffle]
  );

  // 세션 진입 시 (또는 덱/모드 변경 시) 1회만 초기화하여 학습 중 store 변경으로 인한 리셋 방지
  const lastInitParamsRef = useRef<string>('');

  useEffect(() => {
    const currentParamKey = `${deckId}-${onlyDifficult}-${shuffle}`;
    if (deckCards.length > 0 && lastInitParamsRef.current !== currentParamKey) {
      lastInitParamsRef.current = currentParamKey;
      initSession(onlyDifficult, shuffle);
    }
  }, [deckId, onlyDifficult, shuffle, deckCards.length, initSession]);

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

  // "다음 카드" (오른쪽 화살표)
  const handleNext = useCallback(() => {
    if (currentIndex >= sessionCards.length - 1) {
      // 마지막 카드에서 다음을 누르면 완료 화면으로 전환
      setIsCompleted(true);
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

    // 2. 세션 카드 목록 상태 반영
    setSessionCards((prev) =>
      prev.map((c, i) => (i === currentIndex ? { ...c, learned: newLearned } : c))
    );

    // 3. 토글 피드백
    triggerFeedback(newLearned ? 'know' : null);
  }, [sessionCards, currentIndex, setCardLearned, triggerFeedback]);

  // 호환용 별칭
  const handleUnknown = handleNext;
  const handleKnow = handleToggleKnow;

  // 키보드 단축키 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input이나 textarea 포커스 중에는 단축키 무시
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handlePrevious, handleNext, handleToggleKnow, onExit]);

  const currentCard =
    sessionCards.length > 0 && currentIndex < sessionCards.length
      ? sessionCards[currentIndex]
      : null;
  const isCurrentCardLearned = Boolean(currentCard?.learned);
  const masteredCount = sessionCards.filter((c) => c.learned).length;
  const totalInitialCount = sessionCards.length;
  const canGoPrevious = currentIndex > 0;
  const isLastCard = currentIndex >= sessionCards.length - 1;

  return {
    deck,
    deckCards,
    sessionCards,
    currentIndex,
    currentCard,
    totalInitialCount,
    masteredCount,
    isCurrentCardLearned,
    isFlipped,
    round: 1,
    isShake: false,
    isCompleted,
    actionFeedback,
    direction,
    stepCount,
    isShuffle: shuffle,
    canGoPrevious,
    isLastCard,
    handleFlip,
    handlePrevious,
    handleNext,
    handleToggleKnow,
    handleUnknown,
    handleKnow,
    initSession,
  };
};
