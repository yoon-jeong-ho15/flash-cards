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
  queue: Card[];
  masteredCards: Card[];
  difficultCardIds: Set<string>;
  totalInitialCount: number;
  currentCard: Card | null;
  isFlipped: boolean;
  round: number;
  isShake: boolean;
  isCompleted: boolean;
  actionFeedback: StudyActionType;
  direction: number;
  stepCount: number;
  isShuffle: boolean;
  canGoPrevious: boolean;
  handleFlip: () => void;
  handlePrevious: () => void;
  handleUnknown: () => void;
  handleKnow: () => void;
  initSession: (filterDifficult?: boolean, shouldShuffle?: boolean) => void;
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

  // 학습 대기 큐 및 마스터 카드 상태
  const [queue, setQueue] = useState<Card[]>([]);
  const [masteredCards, setMasteredCards] = useState<Card[]>([]);
  const [difficultCardIds, setDifficultCardIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<StudyHistoryEntry[]>([]);
  const [totalInitialCount, setTotalInitialCount] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [round, setRound] = useState<number>(1);
  const [isShake, setIsShake] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<StudyActionType>(null);
  const [direction, setDirection] = useState<number>(0);
  const [stepCount, setStepCount] = useState<number>(0);

  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const deckCardsRef = useRef(deckCards);
  useEffect(() => {
    deckCardsRef.current = deckCards;
  }, [deckCards]);

  const difficultCardIdsRef = useRef(difficultCardIds);
  useEffect(() => {
    difficultCardIdsRef.current = difficultCardIds;
  }, [difficultCardIds]);

  // 세션 초기화
  const initSession = useCallback(
    (filterDifficult = false, shouldShuffle = shuffle) => {
      let targetCards = deckCardsRef.current;
      if (filterDifficult && difficultCardIdsRef.current.size > 0) {
        targetCards = deckCardsRef.current.filter((c) => difficultCardIdsRef.current.has(c.id));
      }

      if (shouldShuffle) {
        targetCards = shuffleCards(targetCards);
      }

      setQueue(targetCards);
      setMasteredCards([]);
      setHistory([]);
      setTotalInitialCount(targetCards.length);
      setIsFlipped(false);
      setRound(1);
      setDirection(0);
      setActionFeedback(null);
      setStepCount(0);
    },
    [shuffle]
  );

  // 세션 진입 시 (또는 덱/모드 변경 시) 1회만 초기화하여 학습 중 store/difficult 상태 변경으로 인한 리셋 방지
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

  // "이전 카드 (되돌리기)"
  const handlePrevious = useCallback(() => {
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    if (lastEntry.action === 'know') {
      // 1. 마스터 완료 목록에서 제거
      setMasteredCards((prev) => prev.filter((c) => c.id !== lastEntry.card.id));
      // 2. 원래 학습 상태 복원
      setCardLearned(lastEntry.card.id, lastEntry.wasLearnedOriginally);
      // 3. 큐 맨 앞에 복원
      setQueue((prev) => [lastEntry.card, ...prev]);
    } else {
      // 1. 오답 세트 복원 (원래 오답이 아니었다면 Set에서 제거)
      if (!lastEntry.wasDifficultAlready) {
        setDifficultCardIds((prev) => {
          const next = new Set(prev);
          next.delete(lastEntry.card.id);
          return next;
        });
      }
      // 2. 큐 복원: 큐 뒤로 보냈던 카드를 다시 큐 맨 앞으로 이동
      setQueue((prev) => {
        const next = [...prev];
        const lastIdx = next.map((c) => c.id).lastIndexOf(lastEntry.card.id);
        if (lastIdx !== -1) {
          next.splice(lastIdx, 1);
        }
        return [lastEntry.card, ...next];
      });
    }

    setRound(lastEntry.previousRound);
    setIsFlipped(false);
    setDirection(1);
    setStepCount((c) => c + 1);
  }, [history, setCardLearned]);

  // "몰라요 (학습 중)" - 큐의 맨 뒤로 이동
  const handleUnknown = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    // 히스토리 기록
    setHistory((prev) => [
      ...prev,
      {
        card: currentCard,
        action: 'unknown',
        wasDifficultAlready: difficultCardIds.has(currentCard.id),
        wasLearnedOriginally: Boolean(currentCard.learned),
        previousRound: round,
      },
    ]);

    // 오답 세트에 추가
    setDifficultCardIds((prev) => new Set(prev).add(currentCard.id));
    setDirection(1);
    triggerFeedback('unknown');
    setStepCount((c) => c + 1);

    if (rest.length === 0) {
      // 남은 카드가 1장뿐인 경우 살짝 흔들림 피드백 후 앞면으로 리셋
      setIsShake(true);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = setTimeout(() => {
        setIsShake(false);
      }, 500);
      setIsFlipped(false);
      return;
    }

    // 현재 카드를 큐의 맨 뒤로 보냄
    setQueue([...rest, currentCard]);
    setIsFlipped(false);
  }, [queue, round, difficultCardIds, triggerFeedback]);

  // "알아요 (완료)" - 마스터 목록으로 이동
  const handleKnow = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    // 히스토리 기록
    setHistory((prev) => [
      ...prev,
      {
        card: currentCard,
        action: 'know',
        wasDifficultAlready: difficultCardIds.has(currentCard.id),
        wasLearnedOriginally: Boolean(currentCard.learned),
        previousRound: round,
      },
    ]);

    // 스토어 학습 상태 업데이트
    setCardLearned(currentCard.id, true);
    setDirection(-1);
    triggerFeedback('know');
    setStepCount((c) => c + 1);

    setMasteredCards((prev) => [...prev, currentCard]);
    setQueue(rest);
    setIsFlipped(false);

    // 라운드 번호 증가 체크
    if (rest.length > 0 && rest.length % Math.max(1, totalInitialCount) === 0) {
      setRound((r) => r + 1);
    }
  }, [queue, round, difficultCardIds, totalInitialCount, setCardLearned, triggerFeedback]);

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

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleUnknown();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleKnow();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handlePrevious, handleUnknown, handleKnow, onExit]);

  const currentCard = queue.length > 0 ? queue[0] : null;
  const isCompleted = queue.length === 0 && totalInitialCount > 0;

  return {
    deck,
    deckCards,
    queue,
    masteredCards,
    difficultCardIds,
    totalInitialCount,
    currentCard,
    isFlipped,
    round,
    isShake,
    isCompleted,
    actionFeedback,
    direction,
    stepCount,
    isShuffle: shuffle,
    canGoPrevious: history.length > 0,
    handleFlip,
    handlePrevious,
    handleUnknown,
    handleKnow,
    initSession,
  };
};
