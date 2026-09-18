import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { DeckCard } from './DeckCard';
import { StickyActionBar } from '../common/StickyActionBar';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Plus,
  Search,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { DeckSortOption } from '../../types';

interface AllDecksViewProps {
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeck: () => void;
  onBack: () => void;
}

export const AllDecksView: React.FC<AllDecksViewProps> = ({
  onNavigateDeck,
  onStartStudy,
  onCreateDeck,
  onBack,
}) => {
  const { decks, folders, cards } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');

  const [sortBy, setSortBy] = useState<DeckSortOption>(() => {
    try {
      const saved = localStorage.getItem('flashcard_all_decks_sort') as DeckSortOption;
      if (saved && ['name-asc', 'name-desc', 'date-desc', 'date-asc'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage error
    }
    return 'date-desc';
  });

  const handleSortChange = (newSort: DeckSortOption) => {
    setSortBy(newSort);
    try {
      localStorage.setItem('flashcard_all_decks_sort', newSort);
    } catch {
      // ignore storage error
    }
  };

  // 검색 및 탭 필터링
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

    // 정렬 적용
    const list = [...result];
    switch (sortBy) {
      case 'name-asc':
        return list.sort((a, b) => {
          const diff = a.title.localeCompare(b.title, 'ko', { numeric: true });
          return diff !== 0
            ? diff
            : (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });
      case 'name-desc':
        return list.sort((a, b) => {
          const diff = b.title.localeCompare(a.title, 'ko', { numeric: true });
          return diff !== 0
            ? diff
            : (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });
      case 'date-desc':
        return list.sort((a, b) => {
          const timeA = a.updatedAt || a.createdAt || 0;
          const timeB = b.updatedAt || b.createdAt || 0;
          if (timeB !== timeA) return timeB - timeA;
          return a.title.localeCompare(b.title, 'ko', { numeric: true });
        });
      case 'date-asc':
        return list.sort((a, b) => {
          const timeA = a.updatedAt || a.createdAt || 0;
          const timeB = b.updatedAt || b.createdAt || 0;
          if (timeA !== timeB) return timeA - timeB;
          return a.title.localeCompare(b.title, 'ko', { numeric: true });
        });
      default:
        return list;
    }
  }, [decks, cards, searchQuery, activeTab, sortBy]);

  return (
    <div className="relative">
      {/* 상단 Sticky 액션바 */}
      <StickyActionBar
        onBack={onBack}
        iconOnlyBack
        backTitle="대시보드로 돌아가기"
        title="모든 덱"
        description="전체 플래시카드 덱을 조회하고 학습을 시작하세요."
        right={
          <Button
            variant="default"
            size="sm"
            onClick={onCreateDeck}
            leftIcon={<Plus className="w-4 h-4" />}
            className="font-semibold shadow-xs"
          >
            <span>새 덱 만들기</span>
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
        {/* 컨트롤 영역: 검색, 탭 필터, 정렬 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                총 덱
              </span>
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

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* 정렬 드롭다운 */}
            {decks.length > 0 && (
              <div className="relative inline-flex items-center">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as DeckSortOption)}
                  className="h-8 pl-8 pr-7 rounded-lg border border-input bg-background text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer appearance-none"
                  aria-label="카드 덱 정렬 방식"
                >
                  <option value="name-asc">이름순</option>
                  <option value="name-desc">이름역순</option>
                  <option value="date-desc">날짜 최신순</option>
                  <option value="date-asc">날짜 최신역순</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {/* 검색 입력 */}
            <div className="w-full sm:w-60">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="덱 제목, 카드 단어 검색..."
                leftIcon={<Search className="w-4 h-4" />}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 카드 덱 목록 그리드 */}
        {filteredDecks.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
            title={searchQuery ? '검색 결과와 일치하는 덱이 없습니다.' : '등록된 덱이 없습니다.'}
            description={
              searchQuery
                ? '다른 검색어로 다시 시도해 보세요.'
                : '새로운 카드 덱을 생성하여 플래시카드 학습을 시작해 보세요.'
            }
            action={
              !searchQuery && (
                <Button variant="default" size="sm" onClick={onCreateDeck}>
                  새 덱 만들기
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => {
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
        )}
      </div>
    </div>
  );
};
