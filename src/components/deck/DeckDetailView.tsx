import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { DeckCardPreviewItem } from './DeckCardPreviewItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import { StickyActionBar } from '../common/StickyActionBar';
import {
  Play,
  Edit3,
  Trash2,
  Folder as FolderIcon,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface DeckDetailViewProps {
  deckId: string;
  onStartStudy: (deckId: string) => void;
  onEditDeck: (deckId: string, focusCardId?: string) => void;
  onNavigateFolder: (folderId: string) => void;
  onBack: () => void;
}

export const DeckDetailView: React.FC<DeckDetailViewProps> = ({
  deckId,
  onStartStudy,
  onEditDeck,
  onNavigateFolder,
  onBack,
}) => {
  const { decks, cards, folders, deleteDeck, resetDeckProgress } =
    useFlashcardStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);
  const folder = useMemo(
    () => (deck?.folderId ? folders.find((f) => f.id === deck.folderId) : null),
    [folders, deck]
  );

  if (!deck) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">존재하지 않는 덱입니다.</p>
        <Button variant="default" onClick={onBack}>
          대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  const learnedCount = deckCards.filter((c) => c.learned).length;
  const progressPercent =
    deckCards.length > 0 ? Math.round((learnedCount / deckCards.length) * 100) : 0;

  const handleBack = () => {
    if (deck.folderId) {
      onNavigateFolder(deck.folderId);
    } else {
      onBack();
    }
  };

  const handleDelete = () => {
    deleteDeck(deck.id);
    setShowDeleteConfirm(false);
    handleBack();
  };

  const handleResetProgress = () => {
    resetDeckProgress(deck.id);
    setShowResetConfirm(false);
  };

  return (
    <div className="relative">
      {/* 상단 Sticky 메뉴바 */}
      <StickyActionBar
        onBack={handleBack}
        right={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => onStartStudy(deck.id)}
              disabled={deckCards.length === 0}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              className="font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all px-2.5 sm:px-3"
              title="학습 시작"
            >
              <span className="hidden sm:inline">학습 시작</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditDeck(deck.id)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              <span className="hidden sm:inline">편집</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              <span className="hidden sm:inline">진행도 초기화</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <span className="hidden sm:inline">삭제</span>
            </Button>
          </>
        }
      />

      {/* 본문 콘텐츠 컨테이너 */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">

      {/* 덱 메인 정보 헤더 Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          {folder && (
            <button
              type="button"
              onClick={() => onNavigateFolder(folder.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors mb-3 cursor-pointer"
            >
              <FolderIcon className="w-3 h-3 text-primary" />
              <span>{folder.title}</span>
            </button>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {deck.title}
          </h1>

          {deck.description && (
            <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
              {deck.description}
            </p>
          )}
        </div>

        {/* 덱 요약 통계 및 프로그레스 바 */}
        <div className="py-4 border-y border-border space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground font-mono">{deckCards.length}개</span>
              <span>카드 등록됨</span>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-border" />

            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>마스터 완료: {learnedCount}개 ({progressPercent}%)</span>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-border" />

            <div className="flex items-center gap-1.5 text-amber-600 font-medium">
              <Clock className="w-4 h-4 shrink-0" />
              <span>학습 필요: {deckCards.length - learnedCount}개</span>
            </div>
          </div>

          <ProgressBar value={progressPercent} size="md" />
        </div>

        {/* 주요 학습 시작 CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => onStartStudy(deck.id)}
            disabled={deckCards.length === 0}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
            className="w-full sm:flex-1 shadow-sm font-semibold"
          >
            플래시카드 학습 시작하기
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onEditDeck(deck.id)}
            className="w-full sm:w-auto"
          >
            카드 추가 / 편집
          </Button>
        </div>
      </Card>

      {/* 카드 프리뷰 목록 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            이 덱의 카드
          </h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {deckCards.length}
          </Badge>
        </div>

        {deckCards.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-6 h-6 text-muted-foreground" />}
            title="등록된 카드가 없습니다."
            description="카드를 추가하여 나만의 플래시카드 덱을 완성해 보세요."
            action={
              <Button variant="default" size="sm" onClick={() => onEditDeck(deck.id)}>
                카드 추가하기
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {deckCards.map((card, index) => (
              <DeckCardPreviewItem
                key={card.id}
                card={card}
                index={index}
                onEdit={(cardId) => onEditDeck(deck.id, cardId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 덱 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="덱 삭제"
        message={`'${deck.title}' 덱을 삭제하시겠습니까?\n덱에 포함된 모든 카드도 함께 삭제되며, 이 작업은 취소할 수 없습니다.`}
        confirmText="덱 삭제"
        isDanger={true}
      />

      {/* 진행도 초기화 확인 모달 */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetProgress}
        title="학습 진행도 초기화"
        message={`'${deck.title}' 덱의 학습 진행도를 처음으로 되돌리시겠습니까?\n모든 카드가 '학습 대기' 상태로 변경됩니다.`}
        confirmText="초기화 실행"
        isDanger={false}
      />
    </div>
  </div>
);
};
