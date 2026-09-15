import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Deck } from '../types';
import { useFlashcardStore } from '../store/useFlashcardStore';

interface UseStudySessionOptions {
  deckId: string;
  onlyDifficult?: boolean;
  onExit: () => void;
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
  handleFlip: () => void;
  handleUnknown: () => void;
  handleKnow: () => void;
  initSession: (filterDifficult?: boolean) => void;
}

export const useStudySession = ({
  deckId,
  onlyDifficult = false,
  onExit,
}: UseStudySessionOptions): StudySessionState => {
  const { decks, cards, setCardLearned } = useFlashcardStore();

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);

  // 학습 대기 큐 및 마스터 카드 상태
  const [queue, setQueue] = useState<Card[]>([]);
  const [masteredCards, setMasteredCards] = useState<Card[]>([]);
  const [difficultCardIds, setDifficultCardIds] = useState<Set<string>>(new Set());
  const [totalInitialCount, setTotalInitialCount] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [round, setRound] = useState<number>(1);
  const [isShake, setIsShake] = useState<boolean>(false);

  // 세션 초기화
  const initSession = useCallback(
    (filterDifficult = false) => {
      let targetCards = deckCards;
      if (filterDifficult && difficultCardIds.size > 0) {
        targetCards = deckCards.filter((c) => difficultCardIds.has(c.id));
      }

      setQueue(targetCards);
      setMasteredCards([]);
      setTotalInitialCount(targetCards.length);
      setIsFlipped(false);
      setRound(1);
    },
    [deckCards, difficultCardIds]
  );

  useEffect(() => {
    initSession(onlyDifficult);
  }, [deckId, onlyDifficult]);

  // 카드 뒤집기
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // "몰라요 (학습 중)" - 큐의 맨 뒤로 이동
  const handleUnknown = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    // 오답 세트에 추가
    setDifficultCardIds((prev) => new Set(prev).add(currentCard.id));

    if (rest.length === 0) {
      // 남은 카드가 1장뿐인 경우 살짝 흔들림 피드백 후 앞면으로 리셋
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      setIsFlipped(false);
      return;
    }

    // 현재 카드를 큐의 맨 뒤로 보냄
    setQueue([...rest, currentCard]);
    setIsFlipped(false);
  }, [queue]);

  // "알아요 (완료)" - 마스터 목록으로 이동
  const handleKnow = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    // 스토어 학습 상태 업데이트
    setCardLearned(currentCard.id, true);

    setMasteredCards((prev) => [...prev, currentCard]);
    setQueue(rest);
    setIsFlipped(false);

    // 라운드 번호 증가 체크
    if (rest.length > 0 && rest.length % Math.max(1, totalInitialCount) === 0) {
      setRound((r) => r + 1);
    }
  }, [queue, totalInitialCount, setCardLearned]);

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
      } else if (e.key === '1' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUnknown();
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleKnow();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleUnknown, handleKnow, onExit]);

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
    handleFlip,
    handleUnknown,
    handleKnow,
    initSession,
  };
};
