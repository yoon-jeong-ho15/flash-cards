import React, { useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeckCard } from '../deck/DeckCard';
import { ProgressBar } from '../common/ProgressBar';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';

interface DashboardViewProps {
  lastStudiedDeckId: string | null;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
  onNavigateDeck: (deckId: string) => void;
  onNavigateAllDecks: () => void;
  onStartStudy: (deckId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lastStudiedDeckId,
  onCreateDeck,
  onCreateFolder,
  onNavigateDeck,
  onNavigateAllDecks,
  onStartStudy,
}) => {
  const decks = useFlashcardStore((state) => state.decks);
  const cards = useFlashcardStore((state) => state.cards);
  const folders = useFlashcardStore((state) => state.folders);
  const user = useFlashcardStore((state) => state.user);
  const summaries = useMemo(() => {
    const counts = new Map<string, { total: number; learned: number }>();
    cards.forEach((card) => {
      const count = counts.get(card.deckId) ?? { total: 0, learned: 0 };
      count.total++;
      if (card.learned) count.learned++;
      counts.set(card.deckId, count);
    });
    return [...decks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((deck) => ({
        deck,
        total: counts.get(deck.id)?.total ?? 0,
        learned: counts.get(deck.id)?.learned ?? 0,
      }));
  }, [decks, cards]);
  const total = summaries.reduce((sum, item) => sum + item.total, 0);
  const learned = summaries.reduce((sum, item) => sum + item.learned, 0);
  const progress = total ? Math.round((learned / total) * 100) : 0;
  const inProgress = summaries.filter((item) => item.total > item.learned);
  const featured = inProgress.find((item) => item.deck.id === lastStudiedDeckId) ?? inProgress[0];
  const allLearned = total > 0 && !featured;
  const date = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  return (
    <div className="page-container space-y-8 sm:space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label mb-2">MY LEARNING SPACE</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
            {user?.displayName
              ? `${user.displayName}님, 오늘도 한 걸음.`
              : '오늘도, 기억에 남는 학습.'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            작은 반복이 쌓여, 확실한 내 지식이 됩니다.
          </p>
        </div>
        <span className="text-xs text-muted-foreground pb-1 tabular-nums">{date}</span>
      </div>

      <section
        className="study-hero relative overflow-hidden rounded-3xl border border-primary/10 px-6 py-7 sm:p-9"
        aria-labelledby="study-heading"
      >
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="min-w-0 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/60 px-3 py-1 text-xs font-medium text-primary">
              {allLearned ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {featured
                ? featured.deck.id === lastStudiedDeckId
                  ? '이어서 학습하기'
                  : '오늘의 학습'
                : allLearned
                  ? '모든 카드 학습 완료'
                  : '나만의 학습을 시작해요'}
            </span>
            <h2
              id="study-heading"
              className="mt-4 text-2xl sm:text-[30px] font-bold tracking-tight leading-snug break-words"
            >
              {featured ? (
                featured.deck.title
              ) : allLearned ? (
                '차곡차곡 쌓은 지식, 멋져요.'
              ) : (
                <>
                  배우고 싶은 것을
                  <br />
                  오래 기억하는 방법.
                </>
              )}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/65">
              {featured
                ? `${featured.total}장 중 ${featured.learned}장을 익혔어요. 남은 ${featured.total - featured.learned}장도 차근차근 학습해 보세요.`
                : allLearned
                  ? '익힌 카드를 한 번 더 복습하고 기억을 단단하게 만들어 보세요.'
                  : '질문과 답을 카드에 담아 보세요. 나에게 맞는 속도로 학습하고 복습할 수 있어요.'}
            </p>
            <Button
              className="mt-6"
              onClick={
                featured
                  ? () => onStartStudy(featured.deck.id)
                  : allLearned
                    ? onNavigateAllDecks
                    : onCreateDeck
              }
              leftIcon={
                featured ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : allLearned ? (
                  <BookOpen className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
              rightIcon={<ArrowRight className="h-4 w-4 ml-2" />}
            >
              {featured ? '학습 이어가기' : allLearned ? '복습할 덱 둘러보기' : '첫 번째 덱 만들기'}
            </Button>
          </div>
          <div className="deck-illustration hidden md:block mr-6" aria-hidden="true">
            <div className="left-0 top-4 -rotate-[16deg] border-[#d4d8be] bg-[#f5f0d8]">
              <span className="h-2 w-10 rounded bg-[#d3cba4]" />
              <span className="text-4xl text-[#afa570]">Aa</span>
              <span className="h-1.5 w-16 rounded bg-[#ddd5b2]" />
            </div>
            <div className="left-9 top-2 rotate-[10deg] border-[#b9cfc1] bg-[#d9e8dc]">
              <span className="h-2 w-10 rounded bg-primary/20" />
              <BookOpen className="h-9 w-9 text-primary/60" />
              <span className="h-1.5 w-16 rounded bg-primary/15" />
            </div>
            <div className="left-5 top-9 -rotate-[5deg] border-white bg-white">
              <span className="text-[9px] font-semibold tracking-[0.2em] text-primary/70">
                FLASHCARDS
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Check className="h-6 w-6 text-primary" />
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold text-primary">
                하나씩, 확실하게.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="전체 학습 현황"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {[
          {
            label: '내 학습 덱',
            value: decks.length,
            unit: '개',
            icon: Layers,
            color: 'bg-secondary text-primary',
            detail: '차곡차곡 모은 학습 자료',
          },
          {
            label: '전체 카드',
            value: total,
            unit: '장',
            icon: BookOpen,
            color: 'bg-[#f5eddb] text-[#947031]',
            detail: '기억하고 싶은 지식',
          },
          {
            label: '익힌 카드',
            value: learned,
            unit: '장',
            icon: CheckCircle2,
            color: 'bg-[#eaf1e3] text-[#618044]',
            detail: '반복이 만든 작은 성취',
          },
          {
            label: '전체 달성률',
            value: progress,
            unit: '%',
            icon: Target,
            color: 'bg-[#ece9f4] text-[#7c6a9b]',
            detail: total ? `${total - learned}장 더 학습하면 완료` : '첫 카드부터 시작해 보세요',
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">{stat.label}</span>
              <span className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
              {stat.value.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{stat.unit}</span>
            </p>
            <p className="mt-2 hidden sm:block text-[11px] text-muted-foreground">{stat.detail}</p>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_264px] gap-7">
        <section aria-labelledby="recent-decks-heading" className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <h2 id="recent-decks-heading" className="text-lg font-semibold tracking-tight">
                내 학습 덱
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">최근 수정한 덱부터 모아봤어요.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateAllDecks}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              className="text-muted-foreground"
            >
              전체 보기
            </Button>
          </div>
          {summaries.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaries.slice(0, 4).map(({ deck, total, learned }) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  cardsCount={total}
                  learnedCount={learned}
                  parentFolderTitle={folders.find((folder) => folder.id === deck.folderId)?.title}
                  onNavigateDeck={onNavigateDeck}
                  onStartStudy={onStartStudy}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-input bg-card/60 px-5 py-9 sm:p-8">
              <p className="font-semibold text-center">첫 학습, 이렇게 시작해 보세요</p>
              <div className="mt-7 grid gap-6 sm:grid-cols-3">
                {[
                  ['01', '덱 만들기', '배우고 싶은 주제를 정해요.'],
                  ['02', '카드 채우기', '질문과 답을 한 장에 담아요.'],
                  ['03', '반복하며 기억하기', '카드를 뒤집으며 복습해요.'],
                ].map(([step, title, text]) => (
                  <div key={step}>
                    <span className="text-xs font-mono text-primary/70">{step}</span>
                    <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 text-center">
                <Button
                  variant="outline"
                  onClick={onCreateDeck}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  새 덱 만들기
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <Card className="p-5 sm:p-6">
            <p className="section-label">LEARNING PROGRESS</p>
            <h2 className="mt-2 font-semibold">나의 학습 페이스</h2>
            <div className="my-5 flex items-center gap-4">
              <div
                className="relative h-20 w-20 shrink-0 rounded-full"
                role="img"
                aria-label={`전체 달성률 ${progress}%`}
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--secondary)) 0)`,
                }}
              >
                <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-card text-xl font-semibold tabular-nums">
                  {progress}
                  <span className="ml-0.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-medium">조금씩, 꾸준하게</p>
                <p className="mt-1 text-muted-foreground">
                  {learned.toLocaleString()}장의 카드를
                  <br />내 지식으로 만들었어요.
                </p>
              </div>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">진행 중인 덱</span>
              <span className="font-medium">{inProgress.length}개</span>
            </div>
            <ProgressBar value={progress} />
          </Card>
          <button
            type="button"
            tabIndex={-1}
            onClick={onCreateFolder}
            className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
          >
            <span className="rounded-xl bg-[#f5eddb] p-2.5 text-[#947031]">
              <FolderPlus className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">주제별로 정리하기</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                폴더로 덱을 모아보세요.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </button>
          <p className="px-1 text-xs text-muted-foreground leading-relaxed">
            {user
              ? '로그인한 계정으로 학습 자료가 클라우드에 동기화됩니다.'
              : '게스트 학습 자료는 이 브라우저에 저장돼요. Google에 로그인하면 계정별로 학습할 수 있어요.'}
          </p>
        </aside>
      </div>
      <footer className="flex items-center justify-between border-t border-border pt-5 text-[11px] text-muted-foreground">
        <span>매일 조금씩, 오래 기억하세요.</span>
        <span className="font-semibold tracking-tight">FlashCards</span>
      </footer>
    </div>
  );
};
