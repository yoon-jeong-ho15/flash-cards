import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { DeckCardPreviewItem } from './DeckCardPreviewItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Search,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [cardFilter, setCardFilter] = useState<'all' | 'unlearned' | 'learned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);
  const folder = useMemo(
    () => (deck?.folderId ? folders.find((f) => f.id === deck.folderId) : null),
    [folders, deck]
  );

  const learnedCount = deckCards.filter((c) => c.learned).length;
  const unlearnedCount = deckCards.length - learnedCount;
  const progressPercent =
    deckCards.length > 0 ? Math.round((learnedCount / deckCards.length) * 100) : 0;

  // 카드 필터링 및 검색
  const filteredCards = useMemo(() => {
    let result = deckCards;
    if (cardFilter === 'learned') {
      result = result.filter((c) => c.learned);
    } else if (cardFilter === 'unlearned') {
      result = result.filter((c) => !c.learned);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.termRichText?.toLowerCase().includes(q) ||
          c.definitionRichText?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deckCards, cardFilter, searchQuery]);

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

      {/* 본문 콘텐츠 컨테이너 (데스크탑: 좌측 Sticky 요약 + 우측 2열 그리드) */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <div className="lg:flex lg:gap-8 lg:items-start">
          {/* 좌측 요약 Sticky 패널 (데스크탑 상시 고정) */}
          <div className="lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20 space-y-4 mb-6 lg:mb-0">
            <Card className="p-5 sm:p-6 space-y-5">
              <div>
                {folder && (
                  <button
                    type="button"
                    onClick={() => onNavigateFolder(folder.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors mb-2.5 cursor-pointer"
                  >
                    <FolderIcon className="w-3 h-3 text-primary" />
                    <span>{folder.title}</span>
                  </button>
                )}

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                  {deck.title}
                </h1>

                {deck.description && (
                  <p className="text-muted-foreground text-xs sm:text-sm mt-2 leading-relaxed">
                    {deck.description}
                  </p>
                )}
              </div>

              {/* 덱 요약 통계 및 프로그레스 바 */}
              <div className="py-3.5 border-y border-border space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">총 카드 수</span>
                  <span className="font-mono font-bold text-foreground">{deckCards.length}개</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>암기 완료</span>
                  </div>
                  <span className="font-mono font-semibold text-emerald-600">{learnedCount}개 ({progressPercent}%)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>학습 필요</span>
                  </div>
                  <span className="font-mono font-semibold text-amber-600">{unlearnedCount}개</span>
                </div>

                <ProgressBar value={progressPercent} size="md" />
              </div>

              {/* 주요 학습 시작 CTA */}
              <div className="space-y-2">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => onStartStudy(deck.id)}
                  disabled={deckCards.length === 0}
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                  className="w-full shadow-sm font-semibold text-sm"
                >
                  플래시카드 학습 시작
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  onClick={() => onEditDeck(deck.id)}
                  leftIcon={<Edit3 className="w-4 h-4 text-muted-foreground" />}
                  className="w-full text-xs font-medium"
                >
                  카드 추가 / 편집하기
                </Button>
              </div>

              {/* 카드 필터 탭 */}
              {deckCards.length > 0 && (
                <div className="pt-3 border-t border-border/80">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    카드 필터링
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCardFilter('all')}
                      className={cn(
                        'py-1 text-xs font-medium rounded-md transition-colors text-center cursor-pointer truncate px-1',
                        cardFilter === 'all'
                          ? 'bg-background text-foreground shadow-2xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      전체 ({deckCards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardFilter('unlearned')}
                      className={cn(
                        'py-1 text-xs font-medium rounded-md transition-colors text-center cursor-pointer truncate px-1',
                        cardFilter === 'unlearned'
                          ? 'bg-background text-amber-600 shadow-2xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      학습중 ({unlearnedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardFilter('learned')}
                      className={cn(
                        'py-1 text-xs font-medium rounded-md transition-colors text-center cursor-pointer truncate px-1',
                        cardFilter === 'learned'
                          ? 'bg-background text-emerald-600 shadow-2xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      완료 ({learnedCount})
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 우측 카드 브라우징 영역 (데스크탑 2열 그리드) */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 카드 목록 헤더 및 검색창 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground tracking-tight">
                  {cardFilter === 'learned'
                    ? '암기 완료된 카드'
                    : cardFilter === 'unlearned'
                    ? '학습 필요한 카드'
                    : '이 덱의 모든 카드'}
                </h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredCards.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="카드 내용 검색..."
                    leftIcon={<Search className="w-3.5 h-3.5 text-muted-foreground" />}
                    className="h-8 text-xs"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditDeck(deck.id)}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
                  className="h-8 text-xs shrink-0"
                >
                  <span className="hidden sm:inline">새 카드</span> 추가
                </Button>
              </div>
            </div>

            {/* 2열 반응형 카드 그리드 */}
            {filteredCards.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6 text-muted-foreground" />}
                title={
                  searchQuery
                    ? '검색 결과와 일치하는 카드가 없습니다.'
                    : cardFilter === 'learned'
                    ? '아직 암기 완료된 카드가 없습니다.'
                    : cardFilter === 'unlearned'
                    ? '모든 카드를 마스터했습니다! 🎉'
                    : '등록된 카드가 없습니다.'
                }
                description={
                  deckCards.length === 0
                    ? '카드를 추가하여 나만의 플래시카드 덱을 완성해 보세요.'
                    : '필터 조건을 변경하거나 새로운 카드를 추가해 보세요.'
                }
                action={
                  deckCards.length === 0 ? (
                    <Button variant="default" size="sm" onClick={() => onEditDeck(deck.id)}>
                      카드 추가하기
                    </Button>
                  ) : cardFilter !== 'all' ? (
                    <Button variant="outline" size="sm" onClick={() => setCardFilter('all')}>
                      전체 카드 보기
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCards.map((card, index) => (
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
        </div>
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
  );
};
