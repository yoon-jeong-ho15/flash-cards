import React, { useState, useMemo, useDeferredValue } from 'react';
import { selectDeckCards } from '../../store/cardSelectors';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { DeckCardPreviewItem } from './DeckCardPreviewItem';
import { MoveDeckModal } from './MoveDeckModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import { ActionMenu } from '../common/ActionMenu';
import { richTextToText } from '../../utils/search';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pencil,
  Trash2,
  Folder,
  FolderInput,
  RotateCcw,
  Check,
  Layers,
  Search,
  Plus,
  Shuffle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deckAccent } from '@/lib/learning';

interface DeckDetailViewProps {
  deckId: string;
  onStartStudy: (id: string, shuffle?: boolean) => void;
  onEditDeck: (id: string, focusCardId?: string) => void;
  onNavigateFolder: (id: string) => void;
  onBack: () => void;
}
export const DeckDetailView: React.FC<DeckDetailViewProps> = ({
  deckId,
  onStartStudy,
  onEditDeck,
  onNavigateFolder,
  onBack,
}) => {
  const decks = useFlashcardStore((state) => state.decks);
  const folders = useFlashcardStore((state) => state.folders);
  const deleteDeck = useFlashcardStore((state) => state.deleteDeck);
  const resetDeckProgress = useFlashcardStore((state) => state.resetDeckProgress);
  const deckCards = useFlashcardStore((state) => selectDeckCards(state, deckId));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [moving, setMoving] = useState(false);
  const [mode, setMode] = useState<'ordered' | 'shuffle'>('ordered');
  const [cardFilter, setCardFilter] = useState<'all' | 'unlearned' | 'learned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const query = useDeferredValue(searchQuery);
  const deck = decks.find((item) => item.id === deckId);
  const folder = folders.find((item) => item.id === deck?.folderId);
  const learnedCount = deckCards.filter((card) => card.learned).length;
  const progress = deckCards.length ? Math.round((learnedCount / deckCards.length) * 100) : 0;
  const filteredCards = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ko-KR');
    return deckCards.filter(
      (card) =>
        (cardFilter === 'all' || card.learned === (cardFilter === 'learned')) &&
        (!q ||
          richTextToText(`${card.termRichText} ${card.definitionRichText}`)
            .toLocaleLowerCase('ko-KR')
            .includes(q))
    );
  }, [deckCards, query, cardFilter]);
  const indices = useMemo(
    () => new Map(deckCards.map((card, index) => [card.id, index])),
    [deckCards]
  );
  if (!deck)
    return (
      <div className="page-container">
        <EmptyState
          title="학습 세트를 찾을 수 없어요"
          description="다른 기기에서 삭제되었을 수 있어요."
          action={<Button onClick={onBack}>홈으로 돌아가기</Button>}
        />
      </div>
    );
  const accent = deckAccent(deck.title);
  const back = () => (folder ? onNavigateFolder(folder.id) : onBack());
  const start = () => onStartStudy(deck.id, mode === 'shuffle');
  return (
    <div className="page-container space-y-7">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={back}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="-ml-3 text-xs text-muted-foreground"
        >
          {folder?.title || '학습 홈'}
          <span className="sr-only">으로 돌아가기</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditDeck(deck.id)}
            leftIcon={<Pencil className="h-4 w-4" />}
          >
            세트 편집
          </Button>
          <ActionMenu
            label="학습 세트 관리"
            actions={[
              {
                label: '폴더 이동',
                icon: <FolderInput className="h-4 w-4" />,
                onSelect: () => setMoving(true),
              },
              {
                label: '진행도 초기화',
                icon: <RotateCcw className="h-4 w-4" />,
                onSelect: () => setShowResetConfirm(true),
              },
              {
                label: '세트 삭제',
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => setShowDeleteConfirm(true),
                destructive: true,
              },
            ]}
          />
        </div>
      </div>
      <div className="flex items-start gap-5">
        <span
          style={{ backgroundColor: accent.background, color: accent.color }}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px]"
        >
          <Layers className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Folder className="h-3.5 w-3.5" />
            {folder ? (
              <button
                type="button"
                onClick={() => onNavigateFolder(folder.id)}
                className="hover:text-primary"
              >
                {folder.title}
              </button>
            ) : (
              '미분류'
            )}
          </div>
          <h1 className="page-title break-words">{deck.title}</h1>
          {deck.description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {deck.description}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            카드 {deckCards.length}장 ·{' '}
            {new Date(deck.updatedAt).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
            })}{' '}
            수정
          </p>
        </div>
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="surface p-5 sm:p-6">
            <h2 className="mb-4 text-base font-bold">어떻게 학습할까요?</h2>
            <div role="group" aria-label="학습 방식" className="grid grid-cols-2 gap-3">
              {(
                [
                  ['ordered', Layers, '플래시카드', '차례대로 떠올리기'],
                  ['shuffle', Shuffle, '랜덤 학습', '순서를 섞어 복습하기'],
                ] as const
              ).map(([key, Icon, title, description]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={mode === key}
                  onClick={() => setMode(key)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                    mode === key
                      ? 'border-primary bg-secondary ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <span className="mb-4 flex items-center justify-between">
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        mode === key ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        mode === key ? 'border-primary bg-primary text-white' : 'border-input'
                      )}
                    >
                      {mode === key && <Check className="h-3 w-3" />}
                    </span>
                  </span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
            <Button
              size="lg"
              onClick={start}
              disabled={!deckCards.length}
              className="mt-4 w-full xl:hidden"
              leftIcon={<Play className="h-4 w-4" />}
            >
              {progress === 100 ? '전체 카드 복습하기' : '학습 시작하기'}
            </Button>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <h2 className="text-lg font-bold">
              카드 둘러보기{' '}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                {deckCards.length}
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditDeck(deck.id)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="text-xs text-primary"
            >
              카드 추가
            </Button>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="찾고 싶은 카드가 있나요?"
            aria-label="카드 내용 검색"
            leftIcon={<Search className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', '전체'],
                ['unlearned', '학습 중'],
                ['learned', '기억했어요'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCardFilter(key)}
                aria-pressed={cardFilter === key}
                className="filter-chip"
              >
                {label}
              </button>
            ))}
          </div>
          <p role="status" className="text-xs text-muted-foreground">
            {filteredCards.length}장의 카드
          </p>
          {!filteredCards.length ? (
            <EmptyState
              icon={<Layers className="h-7 w-7 text-primary" />}
              title={deckCards.length ? '조건에 맞는 카드가 없어요' : '첫 카드를 채워보세요'}
              description={
                deckCards.length
                  ? '검색어나 학습 상태를 변경해 보세요.'
                  : '질문과 답을 입력하면 학습을 시작할 수 있어요.'
              }
              action={
                <Button
                  onClick={
                    deckCards.length
                      ? () => {
                          setSearchQuery('');
                          setCardFilter('all');
                        }
                      : () => onEditDeck(deck.id)
                  }
                >
                  {deckCards.length ? '검색 및 필터 초기화' : '카드 추가하기'}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => (
                <DeckCardPreviewItem
                  key={card.id}
                  card={card}
                  index={indices.get(card.id) || 0}
                  onEdit={(id) => onEditDeck(deck.id, id)}
                />
              ))}
            </div>
          )}
        </div>
        <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-bold">나의 학습 현황</h2>
              <span className="text-xl font-bold text-primary">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
            <dl className="my-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">기억했어요</dt>
                <dd className="font-semibold text-emerald-700">{learnedCount}장</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">다시 볼 카드</dt>
                <dd className="font-semibold">{deckCards.length - learnedCount}장</dd>
              </div>
            </dl>
            <Button
              size="lg"
              className="w-full"
              onClick={start}
              disabled={!deckCards.length}
              leftIcon={<Play className="h-4 w-4" />}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {progress === 100 ? '전체 카드 복습' : '학습 시작하기'}
            </Button>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              {mode === 'shuffle'
                ? '카드를 섞어 새로운 순서로 학습해요.'
                : '아직 익히지 않은 카드부터 학습해요.'}
            </p>
          </Card>
          <div className="px-2 text-xs leading-6 text-muted-foreground">
            조금씩 반복하고, 기억한 카드를 표시해 보세요. 배움이 얼마나 쌓였는지 확인할 수 있어요.
          </div>
        </aside>
      </div>
      {moving && (
        <MoveDeckModal
          deckId={deck.id}
          currentFolderId={deck.folderId}
          onClose={() => setMoving(false)}
        />
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteDeck(deck.id);
          setShowDeleteConfirm(false);
          back();
        }}
        title="학습 세트 삭제"
        message={`'${deck.title}' 세트와 모든 카드를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="세트 삭제"
        isDanger
      />
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetDeckProgress(deck.id);
          setShowResetConfirm(false);
        }}
        title="학습 진행도 초기화"
        message="모든 카드를 아직 익히지 않은 상태로 변경합니다. 카드 내용은 유지됩니다."
        confirmText="진행도 초기화"
      />
    </div>
  );
};
