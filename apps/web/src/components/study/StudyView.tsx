import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from './Flashcard';
import { StudyComplete } from './StudyComplete';
import { ShortcutBadge } from './ShortcutBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditCardModal } from './EditCardModal';
import { useStudySession } from '../../hooks/useStudySession';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '../common/EmptyState';
import {
  Check,
  Layers,
  RotateCcw,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Bookmark,
} from 'lucide-react';
import { useFlashcardStore } from '../../store/useFlashcardStore';

interface StudyViewProps {
  deckId?: string;
  folderId?: string;
  onlyDifficult?: boolean;
  shuffle?: boolean;
  onExit: () => void;
  onEditDeck: (id: string) => void;
}
export const StudyView: React.FC<StudyViewProps> = ({
  deckId,
  folderId,
  onlyDifficult = false,
  shuffle = folderId !== undefined,
  onExit,
  onEditDeck,
}) => {
  const session = useStudySession({
    deckId,
    folderId,
    onlyDifficult,
    shuffle,
    onExit,
  });
  const {
    deck,
    folder,
    deckCards,
    sessionCards,
    currentIndex,
    totalInitialCount,
    currentCard,
    masteredCount,
    isFlipped,
    round,
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
    handleRate,
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
  } = session;
  const currentDeck = useFlashcardStore((state) =>
    state.decks.find((item) => item.id === currentCard?.deckId)
  );
  const skipClick = useRef(false);
  const source = folderId !== undefined ? folder : deck;
  const sourceType = folderId !== undefined ? '폴더' : '덱';
  if (!source)
    return (
      <div className="page-container">
        <EmptyState
          title="학습 자료를 찾을 수 없어요"
          action={<Button onClick={onExit}>돌아가기</Button>}
        />
      </div>
    );
  if (!deckCards.length)
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <EmptyState
          icon={<Layers className="h-8 w-8 text-primary" />}
          title="학습할 카드가 없어요"
          description="질문과 답을 입력하면 학습을 시작할 수 있어요."
          action={
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onExit}>
                돌아가기
              </Button>
              {deck && (
                <Button onClick={() => onEditDeck(deck.id)} leftIcon={<Plus className="h-4 w-4" />}>
                  카드 추가
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  if (!sessionCards.length)
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <EmptyState
          title="학습 세트를 준비했어요"
          description="전체 카드를 한 번 더 복습해 보세요."
          action={
            <Button onClick={() => initSession(false, isShuffle, true)}>전체 카드 복습하기</Button>
          }
        />
      </div>
    );
  if (isCompleted || isFinishModalOpen)
    return (
      <StudyComplete
        deck={source}
        sourceType={sourceType}
        totalCards={totalInitialCount}
        difficultCardsCount={Math.max(0, totalInitialCount - masteredCount)}
        roundCount={round}
        onRestartAll={handleRestartAll}
        onRestartDifficultOnly={handleRestartUnlearned}
        onBackToDeck={onExit}
        onContinue={closeFinishModal}
      />
    );
  const flip = () => {
    if (!skipClick.current) handleFlip();
  };
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex min-h-20 items-center gap-4 border-b border-border py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          title="학습 나가기 (Esc)"
          aria-label="학습 나가기"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{source.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {isShuffle ? <Shuffle className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
            {folderId !== undefined
              ? '폴더 전체 랜덤 학습'
              : isShuffle
                ? '랜덤 학습'
                : '플래시카드'}{' '}
            · {round}회차
          </p>
        </div>
        <span
          aria-live="polite"
          className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-bold tabular-nums text-primary"
        >
          {currentIndex + 1} / {totalInitialCount}
        </span>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col py-6 sm:py-8">
        <div className="mb-6">
          <ProgressBar value={totalInitialCount ? (currentIndex / totalInitialCount) * 100 : 0} />
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {isFlipped ? '얼마나 기억했는지 표시해 보세요' : '답을 보기 전에 먼저 떠올려 보세요'}
            </span>
            <span className="font-medium text-emerald-700">기억한 카드 {masteredCount}장</span>
          </div>
          {folderId !== undefined && currentDeck && (
            <p className="mt-3 truncate text-xs text-muted-foreground">
              현재 덱: <strong className="font-medium text-foreground">{currentDeck.title}</strong>
            </p>
          )}
        </div>
        <div className="relative isolate mb-7">
          <div
            aria-hidden="true"
            className="absolute inset-x-5 -bottom-2 -z-10 h-24 rounded-3xl bg-[#e8e5f7]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-2.5 -bottom-1 -z-10 h-24 rounded-3xl bg-[#f0eefb]"
          />
          <div className="relative h-[clamp(300px,48dvh,520px)] overflow-x-clip rounded-3xl">
            <AnimatePresence initial={false} mode="popLayout">
              {currentCard && (
                <motion.div
                  key={`${currentCard.id}-${stepCount}`}
                  initial={{ opacity: 0, x: direction > 0 ? -35 : 35 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? 35 : -35 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.14}
                  dragMomentum={false}
                  onPointerDownCapture={() => {
                    skipClick.current = false;
                  }}
                  onDragStart={() => {
                    skipClick.current = true;
                  }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -65) handleNext();
                    else if (info.offset.x > 65) handlePrevious();
                  }}
                  style={{ touchAction: 'pan-y' }}
                  className="absolute inset-0"
                >
                  <Flashcard
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={flip}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            title="이전 카드 (←)"
            aria-label="이전 카드"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleFlip}
            className="text-xs text-primary"
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            카드 뒤집기
            <span className="hidden text-muted-foreground sm:inline">· Space</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            title={isLastCard ? '학습 결과 보기 (→)' : '다음 카드 (→)'}
            aria-label={isLastCard ? '학습 결과 보기' : '다음 카드'}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => handleRate(false)}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            className="h-14"
          >
            다시 볼게요
            <kbd className="ml-2 hidden rounded border border-primary/15 px-1.5 py-0.5 text-[10px] sm:inline">
              1
            </kbd>
          </Button>
          <Button
            size="lg"
            onClick={() => handleRate(true)}
            leftIcon={<Check className="h-4 w-4" />}
            className="h-14"
          >
            알아요
            <kbd className="ml-2 hidden rounded border border-white/25 px-1.5 py-0.5 text-[10px] sm:inline">
              2
            </kbd>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            좌우로 밀어서 이동할 수도 있어요
          </span>
          <button
            type="button"
            onClick={handleToggleKnow}
            aria-pressed={session.isCurrentCardLearned}
            className="inline-flex min-h-8 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {session.isCurrentCardLearned ? '기억한 표시 해제' : '기억한 표시만 하기'} · Enter
          </button>
        </div>
        <span role="status" className="sr-only">
          {actionFeedback === 'know'
            ? '기억한 카드로 저장하고 다음으로 이동했습니다.'
            : actionFeedback === 'unknown'
              ? '다시 볼 카드로 저장하고 다음으로 이동했습니다.'
              : ''}
        </span>
        <ShortcutBadge className="mt-2" />
      </div>
      <EditCardModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        card={currentCard}
        onSave={handleUpdateCurrentCard}
        onDelete={openDeleteModal}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteCurrentCard}
        title="카드 삭제"
        message="이 카드를 세트에서도 삭제할까요? 이 작업은 되돌릴 수 없습니다."
        confirmText="카드 삭제"
        isDanger
      />
    </div>
  );
};
