import React from 'react';
import { Flashcard } from './Flashcard';
import { StudyProgressBar } from './StudyProgressBar';
import { StudyComplete } from './StudyComplete';
import { ShortcutBadge } from './ShortcutBadge';
import { useStudySession } from '../../hooks/useStudySession';
import { Button } from '@/components/ui/button';
import { EmptyState } from '../common/EmptyState';
import { ArrowLeft, X, ThumbsUp, RotateCw, PlusCircle } from 'lucide-react';

interface StudyViewProps {
  deckId: string;
  onlyDifficult?: boolean;
  onExit: () => void;
  onEditDeck: (deckId: string) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({
  deckId,
  onlyDifficult = false,
  onExit,
  onEditDeck,
}) => {
  const {
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
  } = useStudySession({ deckId, onlyDifficult, onExit });

  if (!deck) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">덱을 찾을 수 없습니다.</p>
        <Button variant="default" onClick={onExit}>
          돌아가기
        </Button>
      </div>
    );
  }

  // 덱에 카드가 없는 경우
  if (deckCards.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <EmptyState
          icon={<PlusCircle className="w-8 h-8 text-primary" />}
          title="학습할 카드가 없습니다"
          description={`'${deck.title}' 덱에 카드가 아직 등록되지 않았습니다. 카드를 먼저 추가해 주세요.`}
          action={
            <div className="flex justify-center gap-2.5">
              <Button variant="outline" size="sm" onClick={onExit}>
                돌아가기
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onEditDeck(deck.id)}
              >
                카드 추가하기
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // 모든 카드를 마스터한 완료 화면
  if (isCompleted) {
    return (
      <StudyComplete
        deck={deck}
        totalCards={totalInitialCount}
        difficultCardsCount={difficultCardIds.size}
        roundCount={round}
        onRestartAll={() => initSession(false)}
        onRestartDifficultOnly={() => initSession(true)}
        onBackToDeck={onExit}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            title="학습 나가기 (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base leading-tight tracking-tight">
              {deck.title}
            </h2>
            <p className="text-xs text-muted-foreground">플래시카드 반복 학습</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          leftIcon={<X className="w-3.5 h-3.5 text-muted-foreground" />}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>나가기</span>
        </Button>
      </div>

      {/* 프로그레스 바 */}
      <StudyProgressBar
        totalUniqueCards={totalInitialCount}
        masteredCount={masteredCards.length}
        remainingQueueCount={queue.length}
        round={round}
      />

      {/* 플래시카드 본체 */}
      <div className={`transition-transform ${isShake ? 'animate-bounce' : ''}`}>
        {currentCard && (
          <Flashcard
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
        )}
      </div>

      {/* 하단 학습 평가 버튼 액션 바 */}
      <div className="max-w-2xl mx-auto mt-6 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleUnknown}
          className="group flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-300 active:scale-[0.98] transition-all text-amber-950 font-semibold shadow-2xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 group-hover:rotate-180 transition-transform duration-300">
            <RotateCw className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold flex items-center gap-1.5 text-amber-950">
              몰라요
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border border-amber-300 bg-white/90 px-1 font-mono text-[10px] font-medium text-amber-900">1</kbd>
            </div>
            <div className="text-xs text-amber-800/80 font-normal">큐의 뒤로 보내 재학습</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleKnow}
          className="group flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-300 active:scale-[0.98] transition-all text-emerald-950 font-semibold shadow-2xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-950">
              알아요
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border border-emerald-300 bg-white/90 px-1 font-mono text-[10px] font-medium text-emerald-900">2</kbd>
            </div>
            <div className="text-xs text-emerald-800/80 font-normal">마스터 완료로 이동</div>
          </div>
        </button>
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="mt-4">
        <ShortcutBadge />
      </div>
    </div>
  );
};
