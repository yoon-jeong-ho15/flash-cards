import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { DeckCard } from '../deck/DeckCard';
import { FolderCard } from '../folder/FolderCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Folder as FolderIcon,
  Search,
  BookOpen,
  FolderPlus,
  Plus,
  CheckCircle2,
  Layers,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateFolder: (folderId: string) => void;
  onNavigateDeck: (deckId: string) => void;
  onNavigateAllFolders: () => void;
  onNavigateAllDecks: () => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateFolder,
  onNavigateDeck,
  onNavigateAllFolders,
  onNavigateAllDecks,
  onStartStudy,
  onCreateDeck,
  onCreateFolder,
}) => {
  const { folders, decks, cards } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');

  // 통계 계산
  const totalCards = cards.length;
  const masteredCards = cards.filter((c) => c.learned).length;
  const overallProgress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // 검색 필터링
  const filteredDecks = useMemo(() => {
    let result = decks;

    if (activeTab === 'root') {
      result = result.filter((d) => !d.folderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        const cardMatch = cards
          .filter((c) => c.deckId === d.id)
          .some(
            (c) =>
              c.termRichText.toLowerCase().includes(q) ||
              c.definitionRichText.toLowerCase().includes(q)
          );
        return titleMatch || descMatch || cardMatch;
      });
    }

    return result;
  }, [decks, cards, searchQuery, activeTab]);

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-8">
      {/* 상단 페이지 타이틀 & 퀵 액션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            대시보드
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            플래시카드 덱과 폴더를 관리하고 3D 반복 학습을 시작하세요.
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

      {/* shadcn 시그니처 4열 통계 지표 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: 총 카드 */}
        <Card className="p-3.5 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              총 학습 카드
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground">
              {totalCards}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              전체 등록 카드
            </p>
          </CardContent>
        </Card>

        {/* Card 2: 마스터 완료 */}
        <Card className="p-3.5 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              마스터 완료
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600">
              {masteredCards}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              학습 완료된 카드
            </p>
          </CardContent>
        </Card>

        {/* Card 3: 전체 달성률 */}
        <Card className="p-3.5 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              전체 달성률
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground">
              {overallProgress}%
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: 보관 덱 & 폴더 */}
        <Card className="p-3.5 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              학습 덱 & 폴더
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground">
              {decks.length}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              폴더 {folders.length}개 보관 중
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 바 */}
      <div className="w-full sm:max-w-md">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="덱 제목, 카드 단어, 개념 검색..."
          leftIcon={<Search className="w-4 h-4" />}
          className="h-9"
        />
      </div>

      {/* 섹션 1: 폴더 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground tracking-tight">학습 폴더</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {folders.length}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {folders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateAllFolders}
                className="text-xs text-muted-foreground hover:text-foreground h-8 gap-0.5 px-2"
                title="모든 폴더 보기"
              >
                <span>더보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateFolder}
              className="text-xs text-primary hover:text-primary h-8"
            >
              + 폴더 추가
            </Button>
          </div>
        </div>

        {folders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-muted-foreground text-sm">
            폴더를 생성하여 관련된 카드 덱을 체계적으로 묶어보세요.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.slice(0, 6).map((f) => {
                const count = decks.filter((d) => d.folderId === f.id).length;
                return (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    decksCount={count}
                    onClick={() => onNavigateFolder(f.id)}
                  />
                );
              })}
            </div>

            {folders.length > 6 && (
              <div className="text-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateAllFolders}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <span>전체 폴더 {folders.length}개 모두 보기</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 섹션 2: 카드 덱 목록 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground tracking-tight">학습 덱 목록</h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredDecks.length}
              </Badge>
            </div>

            {/* 필터 탭 */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'all' | 'root')}
              className="w-auto"
            >
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="all" className="text-xs px-2.5 py-0.5">전체</TabsTrigger>
                <TabsTrigger value="root" className="text-xs px-2.5 py-0.5">미분류</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
            {decks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateAllDecks}
                className="text-xs text-muted-foreground hover:text-foreground h-8 gap-0.5 px-2"
                title="모든 덱 보기"
              >
                <span>더보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateDeck}
              className="text-xs text-primary hover:text-primary h-8"
            >
              + 새 덱 추가
            </Button>
          </div>
        </div>

        {filteredDecks.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6 text-muted-foreground" />}
            title={searchQuery ? '검색 결과와 일치하는 덱이 없습니다.' : '등록된 덱이 없습니다.'}
            description="새로운 카드 덱을 생성하여 플래시카드 학습을 시작해 보세요."
            action={
              <Button variant="default" size="sm" onClick={onCreateDeck}>
                새 덱 만들기
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDecks.slice(0, 6).map((deck) => {
                const deckCards = cards.filter((c) => c.deckId === deck.id);
                const learned = deckCards.filter((c) => c.learned).length;
                const parentFolder = deck.folderId
                  ? folders.find((f) => f.id === deck.folderId)
                  : null;

                return (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    cardsCount={deckCards.length}
                    learnedCount={learned}
                    parentFolderTitle={parentFolder?.title}
                    onNavigateDeck={onNavigateDeck}
                    onStartStudy={onStartStudy}
                  />
                );
              })}
            </div>

            {filteredDecks.length > 6 && (
              <div className="text-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateAllDecks}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <span>전체 덱 {filteredDecks.length}개 모두 보기</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 저장 정보 안내 영역 */}
      <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>데이터는 브라우저의 localStorage 및 Firebase 클라우드에 안전하게 보관됩니다.</span>
        <span>FlashCards</span>
      </div>
    </div>
  );
};
