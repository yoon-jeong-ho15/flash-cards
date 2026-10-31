import React, { useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeckCard } from '../deck/DeckCard';
import {
  ArrowRight,
  BookOpen,
  Check,
  Folder,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import { travelSample } from '@/lib/learning';

interface DashboardViewProps {
  lastStudiedDeckId: string | null;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
  onNavigateDeck: (id: string) => void;
  onNavigateAllDecks: () => void;
  onStartStudy: (id: string) => void;
  onNavigateFolder?: (id: string) => void;
  onNavigateAllFolders?: () => void;
}
function LearningArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden h-44 w-44 shrink-0 sm:block xl:h-48 xl:w-48"
    >
      <div className="absolute left-1 top-5 h-36 w-28 -rotate-[18deg] rounded-2xl bg-[#ada4ff]" />
      <div className="absolute left-8 top-3 h-36 w-28 rotate-3 rounded-2xl bg-[#d6d1ff]" />
      <div className="absolute left-12 top-6 flex h-36 w-28 rotate-[18deg] flex-col items-center justify-center gap-4 rounded-2xl bg-white shadow-xl shadow-indigo-950/10">
        <span className="rounded-2xl bg-secondary p-3 text-primary">
          <Sparkles className="h-8 w-8" />
        </span>
        <span className="h-1.5 w-14 rounded-full bg-[#d9d4fa]" />
        <span className="-mt-2 h-1.5 w-9 rounded-full bg-[#ebe8fc]" />
      </div>
      <span className="absolute -right-2 top-0 text-[#cdc7ff]">
        <Plus className="h-7 w-7" />
      </span>
    </div>
  );
}
export const DashboardView: React.FC<DashboardViewProps> = ({
  lastStudiedDeckId,
  onCreateDeck,
  onCreateFolder,
  onNavigateDeck,
  onNavigateAllDecks,
  onStartStudy,
  onNavigateFolder,
  onNavigateAllFolders,
}) => {
  const decks = useFlashcardStore((state) => state.decks);
  const cards = useFlashcardStore((state) => state.cards);
  const folders = useFlashcardStore((state) => state.folders);
  const user = useFlashcardStore((state) => state.user);
  const addDeck = useFlashcardStore((state) => state.addDeck);
  const summaries = useMemo(() => {
    const counts = new Map<string, { total: number; learned: number }>();
    cards.forEach((card) => {
      const count = counts.get(card.deckId) || { total: 0, learned: 0 };
      count.total++;
      if (card.learned) count.learned++;
      counts.set(card.deckId, count);
    });
    return [...decks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((deck) => ({
        deck,
        total: counts.get(deck.id)?.total || 0,
        learned: counts.get(deck.id)?.learned || 0,
      }));
  }, [decks, cards]);
  const total = summaries.reduce((sum, item) => sum + item.total, 0);
  const learned = summaries.reduce((sum, item) => sum + item.learned, 0);
  const progress = total ? Math.round((learned / total) * 100) : 0;
  const unfinished = summaries.filter((item) => item.total > item.learned);
  const featured =
    unfinished.find((item) => item.deck.id === lastStudiedDeckId) ||
    unfinished[0] ||
    summaries.find((item) => item.total > 0);
  const date = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
  const createSample = () => {
    try {
      const id = addDeck(
        {
          title: '하루 6개, 여행 영어',
          description: '여행에서 바로 쓰는 표현으로 첫 학습을 시작해 보세요.',
        },
        travelSample
      );
      onNavigateDeck(id);
    } catch {
      window.alert('샘플을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
    }
  };
  return (
    <div className="page-container space-y-8 sm:space-y-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{date}</p>
          <h1 className="page-title">
            {user?.displayName
              ? `${user.displayName}님, 오늘도 한 걸음`
              : '오늘도 하나씩, 오래 기억해요'}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            작은 반복이 쌓여, 확실한 내 지식이 됩니다.
          </p>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          나만의 학습 공간
        </span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="study-hero relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8">
          <div className="flex items-center gap-4">
            <div className="relative z-10 min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                {featured ? 'READY TO LEARN' : 'A LITTLE, EVERY DAY'}
              </span>
              <h2 className="mt-5 text-2xl font-bold leading-snug tracking-tight sm:text-[30px]">
                {featured ? (
                  '이어서, 한 걸음 더'
                ) : (
                  <>
                    작은 카드 한 장,
                    <br />
                    커다란 배움의 시작
                  </>
                )}
              </h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100">
                {featured
                  ? featured.total === featured.learned
                    ? '모든 카드를 익혔어요. 한 번 더 복습해 볼까요?'
                    : `복습할 카드 ${featured.total - featured.learned}장. 오늘의 배움을 이어가세요.`
                  : '질문과 답을 담고, 떠올리고, 기억해요. 나만의 속도로 시작해 보세요.'}
              </p>
            </div>
            <LearningArt />
          </div>
          {featured && (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="truncate text-sm font-semibold">{featured.deck.title}</p>
                <span className="shrink-0 text-xs text-indigo-100">
                  {featured.learned}/{featured.total}장
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="추천 세트 학습 진행도"
                aria-valuemin={0}
                aria-valuemax={featured.total}
                aria-valuenow={featured.learned}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className="h-full rounded-full bg-[#c5f1c9]"
                  style={{
                    width: `${(featured.learned / featured.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          <Button
            onClick={featured ? () => onStartStudy(featured.deck.id) : onCreateDeck}
            size="lg"
            className="mt-6 w-full border-0 bg-white text-primary shadow-none hover:bg-white/90 sm:w-auto"
            leftIcon={featured ? <Play className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            rightIcon={<ArrowRight className="ml-3 h-4 w-4" />}
          >
            {featured
              ? featured.total === featured.learned
                ? '한 번 더 복습하기'
                : '학습 이어가기'
              : '첫 학습 세트 만들기'}
          </Button>
        </section>
        <Card className="flex flex-col justify-between p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">차곡차곡 쌓은 배움</h2>
            <span className="rounded-xl bg-secondary p-2 text-primary">
              <Check className="h-4 w-4" />
            </span>
          </div>
          <div className="my-5 flex items-center gap-5 xl:my-7">
            <div
              role="img"
              aria-label={`전체 학습 달성률 ${progress}%`}
              className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#6155e8 ${progress}%, #eeecff 0)`,
              }}
            >
              <span className="absolute inset-[7px] rounded-full bg-card" />
              <span className="relative text-xl font-bold tabular-nums">
                {progress}
                <span className="ml-0.5 text-xs text-muted-foreground">%</span>
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {learned.toLocaleString()}
                <span className="ml-1 text-sm font-medium text-muted-foreground">장</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                내 지식으로
                <br />
                만든 카드예요.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border pt-5 text-center">
            {[
              [decks.length, '학습 세트'],
              [total, '전체 카드'],
              [unfinished.length, '학습 중'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">최근 학습 세트</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              가장 최근에 다듬은 배움부터 만나보세요.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateAllDecks}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="text-xs text-primary"
          >
            전체 보기
          </Button>
        </div>
        {summaries.length ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {summaries.slice(0, 6).map(({ deck, total: count, learned: known }) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                cardsCount={count}
                learnedCount={known}
                parentFolderTitle={folders.find((folder) => folder.id === deck.folderId)?.title}
                onNavigateDeck={onNavigateDeck}
                onStartStudy={onStartStudy}
              />
            ))}
          </div>
        ) : (
          <Card className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div className="flex items-start gap-4">
              <span className="rounded-2xl bg-[#e6f5ef] p-3.5 text-[#21856f]">
                <BookOpen className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-bold">처음이라면, 가볍게 체험해 보세요</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  여행 영어 6장으로 카드 학습을 경험해 보세요.
                  <br className="hidden sm:block" />
                  직접 나만의 세트를 만들어도 좋아요.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={createSample}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              샘플 세트로 시작하기
            </Button>
          </Card>
        )}
      </section>
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">주제별로 모아두기</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={folders.length && onNavigateAllFolders ? onNavigateAllFolders : onCreateFolder}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="text-xs text-primary"
          >
            {folders.length ? '모든 폴더' : '폴더 만들기'}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {folders.slice(0, 5).map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onNavigateFolder?.(folder.id)}
              className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/30"
            >
              <span className="rounded-xl bg-[#fff0e7] p-3 text-[#ba7549]">
                <Folder className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{folder.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  세트 {decks.filter((deck) => deck.folderId === folder.id).length}개
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={onCreateFolder}
            className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-input bg-transparent p-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <FolderPlus className="h-5 w-5" />새 폴더 만들기
          </button>
        </div>
      </section>
      {!user && (
        <p className="text-center text-xs leading-5 text-muted-foreground">
          게스트 자료는 이 브라우저에 저장돼요. Google 계정을 연결하면 계정의 학습 자료를 불러올 수
          있어요.
        </p>
      )}
    </div>
  );
};
