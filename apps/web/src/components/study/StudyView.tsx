import React from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Flashcard } from './Flashcard';
import { StudyComplete } from './StudyComplete';
import { ShortcutBadge } from './ShortcutBadge';
import { StickyActionBar } from '../common/StickyActionBar';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditCardModal } from './EditCardModal';
import { useStudySession } from '../../hooks/useStudySession';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../common/EmptyState';
import { Clock, CheckCircle2, Layers, ThumbsUp, RotateCw, RotateCcw, Trophy, PlusCircle, Shuffle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
        ? '0 0 16px rgba(245, 158, 11, 0.15)'
        : '0 0 16px rgba(16, 185, 129, 0.15)',
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
  shuffle?: boolean;
  onExit: () => void;
  onEditDeck: (deckId: string) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({
  deckId,
  onlyDifficult = false,
  shuffle = false,
  onExit,
  onEditDeck,
}) => {
  const {
    deck,
    deckCards,
    sessionCards,
    currentIndex,
    totalInitialCount,
    currentCard,
    isCurrentCardLearned,
    masteredCount,
    isFlipped,
    round,
    isShake,
    isCompleted,
    actionFeedback,
    direction,
    stepCount,
    isShuffle,
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
    initSession,
    handleRestartUnlearned,
    handleRestartAll,
    closeFinishModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleUpdateCurrentCard,
    handleDeleteCurrentCard,
  } = useStudySession({ deckId, onlyDifficult, shuffle, onExit });

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

  // 덱의 모든 카드가 이미 알아요 상태인 경우
  if (deckCards.length > 0 && sessionCards.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
          title="모든 카드를 이미 마스터했습니다!"
          description={`'${deck.title}' 덱의 모든 카드(${deckCards.length}개)가 이미 '알아요' 상태입니다.`}
          action={
            <div className="flex justify-center gap-2.5">
              <Button variant="outline" size="sm" onClick={onExit}>
                돌아가기
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => initSession(false, isShuffle, true)}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                전체 카드 다시 학습하기
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // 학습 완료 화면
  if (isCompleted) {
    const unlearnedCount = Math.max(0, totalInitialCount - masteredCount);
    return (
      <StudyComplete
        deck={deck}
        totalCards={totalInitialCount}
        difficultCardsCount={unlearnedCount}
        roundCount={round}
        onRestartAll={() => initSession(false, isShuffle)}
        onRestartDifficultOnly={() => initSession(true, isShuffle)}
        onBackToDeck={onExit}
      />
    );
  }

  const percentage = totalInitialCount > 0
    ? Math.round((masteredCount / totalInitialCount) * 100)
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
        description={isShuffle ? "플래시카드 랜덤 순서 학습" : "플래시카드 순차 학습"}
        right={
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {round > 1 && (
              <Badge variant="outline" className="font-semibold text-xs px-2 py-0.5 sm:py-1 border border-primary/30 text-primary bg-primary/5">
                {round}라운드
              </Badge>
            )}

            {isShuffle && (
              <Badge variant="secondary" className="gap-1 font-medium text-xs px-2 py-0.5 sm:py-1 border border-border">
                <Shuffle className="w-3 h-3 text-primary" />
                <span className="hidden sm:inline">랜덤학습</span>
              </Badge>
            )}

            {/* 카드 순번 배지 */}
            <Badge variant="outline" className="font-mono text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 border border-border">
              <span className="text-muted-foreground mr-1">카드</span>
              <strong className="text-foreground">{currentIndex + 1}</strong>
              <span className="text-muted-foreground">/{totalInitialCount}</span>
            </Badge>

            {/* 알아요 완료 배지 */}
            <Badge variant="success" className="gap-1 sm:gap-1.5 font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">알아요 </span>
              <strong className="font-mono">{masteredCount}/{totalInitialCount}</strong>
            </Badge>

            <span className="text-foreground font-bold font-mono text-xs sm:text-sm pl-0.5 sm:pl-1">
              {percentage}%
            </span>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 overflow-x-clip">
        <div className="mx-auto mb-5 max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{isFlipped ? '정답을 확인하고, 기억했는지 표시해 보세요.' : '먼저 떠올려 보고, 카드를 뒤집어 보세요.'}</span><span className="shrink-0 pl-2 tabular-nums">{masteredCount} / {totalInitialCount}장</span></div>
          <ProgressBar value={percentage} />
          <span role="status" className="sr-only">{actionFeedback === 'know' ? '암기 완료 상태를 변경했습니다.' : ''}</span>
        </div>
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
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />

                {/* 전환 시 찰나의 은은한 컬러 틴트 오버레이 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  exit={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-2xl z-10 transition-colors',
                    direction < 0
                      ? 'bg-emerald-500/[0.03] ring-1 ring-emerald-500/20'
                      : direction > 0
                      ? 'bg-amber-500/[0.03] ring-1 ring-amber-500/20'
                      : ''
                  )}
                />
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* 하단 학습 컨트롤 버튼 바 */}
        <div className="max-w-2xl mx-auto mt-6 flex items-stretch gap-3 sm:gap-4">
          {/* 1. 이전 카드 버튼 (왼쪽 화살표) */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={cn(
              'group flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-3.5 sm:px-4 rounded-xl border transition-all font-semibold shadow-2xs select-none shrink-0 min-w-[76px] sm:min-w-[105px]',
              canGoPrevious
                ? 'border-border bg-card hover:bg-muted text-foreground active:scale-[0.98] cursor-pointer'
                : 'border-border/40 bg-muted/20 text-muted-foreground/40 cursor-not-allowed opacity-50'
            )}
            title={canGoPrevious ? '이전 카드로 이동 (←)' : '첫 번째 카드입니다'}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                canGoPrevious ? 'bg-muted text-foreground group-hover:bg-background' : 'bg-transparent text-muted-foreground/40'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1">
                <span>이전</span>
                <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center rounded border border-border bg-muted/60 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  ←
                </kbd>
              </div>
              <div className="hidden sm:block text-[11px] text-muted-foreground font-normal">이전 카드</div>
            </div>
          </button>

          {/* 2. 알아요 토글 버튼 (Enter) */}
          <button
            type="button"
            onClick={handleToggleKnow}
            className={cn(
              'flex-1 group flex items-center justify-center gap-2.5 sm:gap-3 py-3.5 px-3 sm:px-4 rounded-xl border transition-all font-semibold shadow-2xs cursor-pointer select-none',
              isCurrentCardLearned
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-500/20 active:scale-[0.98]'
                : 'border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground active:scale-[0.98]'
            )}
            title="알아요 상태 토글 (↵ Enter)"
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform shrink-0',
                isCurrentCardLearned
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground group-hover:text-emerald-600 group-hover:bg-emerald-500/20'
              )}
            >
              {isCurrentCardLearned ? (
                <Check className="w-4.5 h-4.5" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
            </div>
            <div className="text-left min-w-0">
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>{isCurrentCardLearned ? '알아요 (완료됨)' : '알아요'}</span>
                <kbd
                  className={cn(
                    'pointer-events-none hidden md:inline-flex h-4 select-none items-center rounded px-1 font-mono text-[10px] font-medium',
                    isCurrentCardLearned
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'border border-border bg-muted text-foreground'
                  )}
                >
                  ↵ Enter
                </kbd>
              </div>
              <div
                className={cn(
                  'text-xs font-normal truncate',
                  isCurrentCardLearned ? 'text-white/80' : 'text-muted-foreground'
                )}
              >
                {isCurrentCardLearned ? '다시 누르면 해제' : '암기 완료로 표시'}
              </div>
            </div>
          </button>

          {/* 3. 다음 카드 버튼 (오른쪽 화살표) */}
          <button
            type="button"
            onClick={handleNext}
            className={cn(
              'flex-1 group flex items-center justify-center gap-2.5 sm:gap-3 py-3.5 px-3 sm:px-4 rounded-xl border transition-all font-semibold shadow-2xs cursor-pointer select-none',
              isLastCard
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]'
                : 'border-border bg-card hover:bg-muted text-foreground active:scale-[0.98]'
            )}
            title={isLastCard ? '학습 완료하기 (→)' : '다음 카드로 이동 (→)'}
          >
            <div className="text-left min-w-0">
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>{isLastCard ? '학습 완료' : '다음'}</span>
                <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center rounded border border-border bg-muted/60 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  →
                </kbd>
              </div>
              <div className="text-xs text-muted-foreground font-normal truncate">
                {isLastCard ? '결과 확인하기' : '다음 카드로'}
              </div>
            </div>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform shrink-0',
                isLastCard ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground'
              )}
            >
              {isLastCard ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
          </button>
        </div>

        {/* 키보드 단축키 안내 (데스크탑 전용) */}
        <div className="mt-6 hidden md:block">
          <ShortcutBadge />
        </div>
      </div>

      {/* 마지막 카드 도달 시 라운드 종료 / 재학습 모달 */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={closeFinishModal}
        title={remainingUnlearnedCount === 0 ? '학습 완료! 🎉' : `${round}라운드 완료`}
        icon={
          remainingUnlearnedCount === 0 ? (
            <Trophy className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          )
        }
        maxWidth="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {remainingUnlearnedCount === 0
              ? `'${deck.title}' 덱의 모든 카드를 성공적으로 암기(알아요) 완료했습니다!`
              : `이번 라운드의 카드를 모두 확인했습니다. '알아요' 완료된 카드를 제외한 남은 미완료 카드(${remainingUnlearnedCount}개)로 다시 학습을 시작하시겠습니까?`}
          </p>

          {/* 학습 요약 정보 카드 그리드 */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="text-center p-2">
              <span className="block text-xl font-bold font-mono text-foreground">
                {sessionCards.length}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">이번 라운드</span>
            </div>
            <div className="text-center p-2 border-x border-border">
              <span className="block text-xl font-bold font-mono text-emerald-600">
                {masteredCount}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">알아요 완료</span>
            </div>
            <div className="text-center p-2">
              <span className="block text-xl font-bold font-mono text-amber-600">
                {remainingUnlearnedCount}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">남은 미완료</span>
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="font-medium"
            >
              학습 종료
            </Button>

            {remainingUnlearnedCount > 0 ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleRestartUnlearned}
                leftIcon={isShuffle ? <Shuffle className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                className="font-semibold"
              >
                {isShuffle ? '랜덤 순서로 다시 학습' : '정방향으로 다시 학습'}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleRestartAll}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="font-semibold"
              >
                전체 카드 다시 학습
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* 카드 즉석 내용 수정 모달 */}
      <EditCardModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        card={currentCard}
        onSave={handleUpdateCurrentCard}
        onDelete={openDeleteModal}
      />

      {/* 카드 즉석 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteCurrentCard}
        title="카드 삭제"
        message={`현재 학습 중인 카드를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 덱에서도 완전히 삭제됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        isDanger
      />
    </div>
  );
};
