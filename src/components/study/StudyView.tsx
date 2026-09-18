import React from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Flashcard } from './Flashcard';
import { StudyComplete } from './StudyComplete';
import { ShortcutBadge } from './ShortcutBadge';
import { StickyActionBar } from '../common/StickyActionBar';
import { useStudySession } from '../../hooks/useStudySession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../common/EmptyState';
import { Clock, CheckCircle2, Layers, ThumbsUp, RotateCw, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 미니멀 푸시 & 컬러 플래시 전환 애니메이션 (옵션 3)
const cardVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -20 : direction < 0 ? 20 : 0,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    boxShadow: '0 0 0 0px transparent',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
    scale: 0.98,
    boxShadow:
      direction > 0
        ? '0 0 16px rgba(16, 185, 129, 0.15)'
        : '0 0 16px rgba(245, 158, 11, 0.15)',
    transition: {
      duration: 0.18,
      ease: 'easeOut',
    },
  }),
  shake: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    boxShadow: [
      '0 0 0 0px transparent',
      '0 0 16px rgba(245, 158, 11, 0.2)',
      '0 0 16px rgba(245, 158, 11, 0.2)',
      '0 0 0 0px transparent',
    ],
    transition: {
      duration: 0.45,
      ease: 'easeInOut',
    },
  },
};

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
    actionFeedback,
    direction,
    stepCount,
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

  const percentage = totalInitialCount > 0
    ? Math.round((masteredCards.length / totalInitialCount) * 100)
    : 0;

  return (
    <div className="relative">
      {/* 상단 Sticky 컨트롤 바 */}
      <StickyActionBar
        onBack={onExit}
        iconOnlyBack
        backTitle="학습 나가기 (Esc)"
        title={
          <h2 className="font-semibold text-foreground text-sm sm:text-base leading-tight tracking-tight truncate">
            {deck.title}
          </h2>
        }
        description="플래시카드 반복 학습"
        right={
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {round > 1 && (
              <Badge variant="secondary" className="gap-1 font-mono text-xs px-2 py-0.5 sm:py-1">
                <Layers className="w-3 h-3 text-primary" />
                <span className="hidden sm:inline">Round </span>
                <span>{round}</span>
              </Badge>
            )}

            <Badge variant="warning" className="gap-1 sm:gap-1.5 font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">학습 중 </span>
              <strong className="font-mono">{queue.length}</strong>
            </Badge>

            <Badge variant="success" className="gap-1 sm:gap-1.5 font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">완료 </span>
              <strong className="font-mono">{masteredCards.length}/{totalInitialCount}</strong>
            </Badge>

            <span className="text-foreground font-bold font-mono text-xs sm:text-sm pl-0.5 sm:pl-1">
              {percentage}%
            </span>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 overflow-x-clip">
        {/* 플래시카드 본체 영역 */}
        <div className="relative w-full max-w-2xl mx-auto">
          {/* 1장만 남았을 때 복습 힌트 배지 */}
          {isShake && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 transition-all">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-md animate-pulse">
                마지막 남은 카드 복습 중
              </span>
            </div>
          )}

          {/* 카드 전환 시 화면 좌우 오버플로우 방지 래퍼 */}
          <div className="relative w-full h-[420px] sm:h-[460px] overflow-x-clip">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            {currentCard && (
              <motion.div
                key={`${currentCard.id}-${stepCount}`}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate={isShake ? 'shake' : 'center'}
                exit="exit"
                className="w-full h-full rounded-2xl relative"
              >
                <Flashcard
                  card={currentCard}
                  isFlipped={isFlipped}
                  onFlip={handleFlip}
                />

                {/* 전환 시 찰나의 은은한 컬러 틴트 오버레이 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  exit={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-2xl z-10 transition-colors',
                    direction > 0
                      ? 'bg-emerald-500/[0.03] ring-1 ring-emerald-500/20'
                      : direction < 0
                      ? 'bg-amber-500/[0.03] ring-1 ring-amber-500/20'
                      : ''
                  )}
                />
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* 하단 학습 평가 버튼 액션 바 */}
        <div className="max-w-2xl mx-auto mt-6 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleUnknown}
            className={cn(
              'group flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border transition-all font-semibold shadow-2xs cursor-pointer select-none',
              actionFeedback === 'unknown'
                ? 'border-amber-400 bg-amber-100/90 ring-2 ring-amber-400/50 scale-[0.98] text-amber-950'
                : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-300 active:scale-[0.98] text-amber-950'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300',
                actionFeedback === 'unknown'
                  ? 'bg-amber-200 text-amber-900 rotate-180'
                  : 'bg-amber-100 text-amber-800 group-hover:rotate-180'
              )}
            >
              <RotateCw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold flex items-center gap-1.5 text-amber-950">
                몰라요
                <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center rounded border border-amber-300 bg-white/90 px-1 font-mono text-[10px] font-medium text-amber-900">←</kbd>
              </div>
              <div className="text-xs text-amber-800/80 font-normal">큐의 뒤로 보내 재학습</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleKnow}
            className={cn(
              'group flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border transition-all font-semibold shadow-2xs cursor-pointer select-none',
              actionFeedback === 'know'
                ? 'border-emerald-400 bg-emerald-100/90 ring-2 ring-emerald-400/50 scale-[0.98] text-emerald-950'
                : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-300 active:scale-[0.98] text-emerald-950'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform',
                actionFeedback === 'know'
                  ? 'bg-emerald-200 text-emerald-900 scale-110'
                  : 'bg-emerald-100 text-emerald-800 group-hover:scale-110'
              )}
            >
              <ThumbsUp className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-950">
                알아요
                <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center rounded border border-emerald-300 bg-white/90 px-1 font-mono text-[10px] font-medium text-emerald-900">→</kbd>
              </div>
              <div className="text-xs text-emerald-800/80 font-normal">마스터 완료로 이동</div>
            </div>
          </button>
        </div>

        {/* 키보드 단축키 안내 (데스크탑 전용) */}
        <div className="mt-6 hidden md:block">
          <ShortcutBadge />
        </div>
      </div>
    </div>
  );
};
