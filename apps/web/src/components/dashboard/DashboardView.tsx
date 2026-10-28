import React, { useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  BookOpen,
  ChevronRight,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  lastStudiedDeckId: string | null;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
  onNavigateDeck: (deckId: string) => void;
  onNavigateAllDecks: () => void;
  onStartStudy: (deckId: string) => void;
}

interface DeckSummary {
  id: string;
  title: string;
  totalCards: number;
  learnedCards: number;
  progress: number;
  updatedAt: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lastStudiedDeckId,
  onCreateDeck,
  onCreateFolder,
  onNavigateDeck,
  onNavigateAllDecks,
  onStartStudy,
}) => {
  const { decks, cards } = useFlashcardStore();

  const deckSummaries = useMemo<DeckSummary[]>(() => {
    const cardsByDeck = new Map<string, { total: number; learned: number }>();

    cards.forEach((card) => {
      const current = cardsByDeck.get(card.deckId) ?? { total: 0, learned: 0 };
      cardsByDeck.set(card.deckId, {
        total: current.total + 1,
        learned: current.learned + (card.learned ? 1 : 0),
      });
    });

    return decks
      .map((deck) => {
        const deckCards = cardsByDeck.get(deck.id) ?? { total: 0, learned: 0 };
        const progress = deckCards.total > 0
          ? Math.round((deckCards.learned / deckCards.total) * 100)
          : 0;

        return {
          id: deck.id,
          title: deck.title,
          totalCards: deckCards.total,
          learnedCards: deckCards.learned,
          progress,
          updatedAt: deck.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cards, decks]);

  const totalCards = useMemo(
    () => deckSummaries.reduce((sum, deck) => sum + deck.totalCards, 0),
    [deckSummaries]
  );
  const masteredCards = useMemo(
    () => deckSummaries.reduce((sum, deck) => sum + deck.learnedCards, 0),
    [deckSummaries]
  );
  const remainingCards = totalCards - masteredCards;
  const overallProgress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
  const inProgressDecks = useMemo(
    () => deckSummaries.filter((deck) => deck.totalCards > 0 && deck.learnedCards < deck.totalCards),
    [deckSummaries]
  );
  const mostRecentStudyableDeck = useMemo(
    () => inProgressDecks.find((deck) => deck.id === lastStudiedDeckId),
    [inProgressDecks, lastStudiedDeckId]
  );
  const featuredDeck = mostRecentStudyableDeck ?? inProgressDecks[0];
  const progressDecks = inProgressDecks.slice(0, 3);

  const handleStudy = (deckId: string) => {
    onStartStudy(deckId);
  };

  const hasStudyableDeck = Boolean(featuredDeck);
  const hasCompletedAllCards = totalCards > 0 && inProgressDecks.length === 0;

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-7 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            대시보드
          </h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            오늘 학습할 덱을 선택하고, 흐름을 이어가세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            leftIcon={<FolderPlus className="w-4 h-4 text-muted-foreground" />}
          >
            새 폴더
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onCreateDeck}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            새 덱 만들기
          </Button>
        </div>
      </div>

      {!hasStudyableDeck ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7 text-primary" />}
          title={
            decks.length === 0
              ? '첫 번째 덱을 만들어 보세요.'
              : hasCompletedAllCards
                ? '모든 카드를 익혔어요!'
                : '학습할 카드가 아직 없습니다.'
          }
          description={
            decks.length === 0
              ? '덱을 만들고 카드를 추가하면 여기에서 바로 학습을 시작할 수 있습니다.'
              : hasCompletedAllCards
                ? '완료한 덱을 다시 복습하거나, 새로운 덱으로 다음 학습을 시작해 보세요.'
                : '덱에 카드를 추가하면 학습 현황과 바로 시작할 수 있는 덱을 보여드립니다.'
          }
          action={
            <Button
              variant={hasCompletedAllCards ? 'outline' : 'default'}
              size="sm"
              onClick={hasCompletedAllCards ? onNavigateAllDecks : onCreateDeck}
              leftIcon={hasCompletedAllCards ? <BookOpen className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {hasCompletedAllCards ? '완료한 덱 보기' : '새 덱 만들기'}
            </Button>
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground shadow-sm">
            <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary-foreground/75 uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  {mostRecentStudyableDeck ? '이어서 학습하기' : '바로 학습하기'}
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight truncate">
                  {featuredDeck.title}
                </h2>
                <p className="mt-1.5 text-sm text-primary-foreground/80">
                  전체 {featuredDeck.totalCards}장 중 {featuredDeck.learnedCards}장을 익혔어요. {featuredDeck.totalCards - featuredDeck.learnedCards}장을 더 학습해 보세요.
                </p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleStudy(featuredDeck.id)}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                className="bg-background text-primary hover:bg-background/90 sm:self-center"
              >
                {featuredDeck.totalCards - featuredDeck.learnedCards}장 학습 시작
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">남은 학습 카드</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{remainingCards}</p>
                  <p className="mt-1 text-xs text-muted-foreground">진행 중인 덱 기준</p>
                </div>
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">전체 달성률</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{overallProgress}%</p>
                  <ProgressBar value={overallProgress} className="mt-2.5" />
                </div>
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">진행 중인 덱</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{inProgressDecks.length}개</p>
                  <p className="mt-1 text-xs text-muted-foreground">바로 이어서 학습 가능</p>
                </div>
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_15.5rem] gap-5 sm:gap-6">
            <section aria-labelledby="in-progress-decks-heading">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 id="in-progress-decks-heading" className="text-base font-semibold tracking-tight text-foreground">진행 중인 덱</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">학습을 이어갈 덱을 선택하세요.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onNavigateAllDecks} className="text-primary hover:text-primary">
                  모든 덱 보기
                </Button>
              </div>

              <Card className="overflow-hidden divide-y divide-border">
                {progressDecks.map((deck) => (
                  <div key={deck.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={() => onNavigateDeck(deck.id)}
                      className="min-w-0 flex-1 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`${deck.title} 덱 열기`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{deck.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {deck.learnedCards} / {deck.totalCards}장 완료
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      </div>
                      <ProgressBar value={deck.progress} className="mt-2.5" />
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStudy(deck.id)}
                      leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                      className="shrink-0"
                    >
                      학습
                    </Button>
                  </div>
                ))}
              </Card>
            </section>

            <aside aria-labelledby="quick-actions-heading">
              <Card className="p-4 sm:p-5">
                <h2 id="quick-actions-heading" className="text-sm font-semibold tracking-tight text-foreground">빠른 작업</h2>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  자료 관리는 필요한 때에만 빠르게 처리하세요.
                </p>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" size="sm" onClick={onCreateDeck} leftIcon={<Plus className="w-4 h-4 text-primary" />} className="w-full justify-start">
                    새 덱 만들기
                  </Button>
                  <Button variant="outline" size="sm" onClick={onCreateFolder} leftIcon={<FolderPlus className="w-4 h-4 text-primary" />} className="w-full justify-start">
                    새 폴더 만들기
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}

      <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>데이터는 브라우저의 localStorage 및 Firebase 클라우드에 안전하게 보관됩니다.</span>
        <span>FlashCards</span>
      </div>
    </div>
  );
};
