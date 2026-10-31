import { indexCards } from '../../store/cardSelectors';
import React, { useState, useMemo, useDeferredValue } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { LibraryHeader } from '../common/LibraryHeader';
import { cn } from '@/lib/utils';
import { LayoutGrid, List } from 'lucide-react';
import { DeckCard } from './DeckCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search } from 'lucide-react';
import { DeckSortOption } from '../../types';
import { richTextToText } from '../../utils/search';

interface AllDecksViewProps {
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeck: () => void;
  onBack: () => void;
  onNavigateAllFolders?: () => void;
}

export const AllDecksView: React.FC<AllDecksViewProps> = ({
  onNavigateDeck,
  onStartStudy,
  onCreateDeck,
  onBack,
  onNavigateAllFolders,
}) => {
  const decks = useFlashcardStore((state) => state.decks);
  const folders = useFlashcardStore((state) => state.folders);
  const cards = useFlashcardStore((state) => state.cards);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [layout, setLayout] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('flashcard_library_layout') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const changeLayout = (value: 'grid' | 'list') => {
    setLayout(value);
    try {
      localStorage.setItem('flashcard_library_layout', value);
    } catch {
      /* The view still works without storage. */
    }
  };
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');
  const [studyFilter, setStudyFilter] = useState('all');
  const cardIndex = useMemo(() => indexCards(cards).byDeck, [cards]);
  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
    setStudyFilter('all');
  };

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

    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      result = result.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        const cardMatch = (cardIndex.get(d.id) || []).some(
          (c) =>
            richTextToText(c.termRichText).toLowerCase().includes(q) ||
            richTextToText(c.definitionRichText).toLowerCase().includes(q)
        );
        return titleMatch || descMatch || cardMatch;
      });
    }

    if (studyFilter !== 'all') {
      result = result.filter((deck) => {
        const deckCards = cardIndex.get(deck.id) || [];
        const completed = deckCards.length > 0 && deckCards.every((card) => card.learned);
        return studyFilter === 'completed' ? completed : deckCards.some((card) => !card.learned);
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
  }, [decks, cardIndex, deferredQuery, activeTab, sortBy, studyFilter]);

  return (
    <div className="page-container space-y-6">
      <LibraryHeader
        active="decks"
        onFolders={onNavigateAllFolders || onBack}
        onCreate={onCreateDeck}
      />
      <div className="surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="세트 제목, 설명, 카드 내용 검색"
              placeholder="제목이나 카드 속 단어로 찾아보세요"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            aria-label="카드 덱 정렬 방식"
            value={sortBy}
            onChange={(event) => handleSortChange(event.target.value as DeckSortOption)}
            className="filter-select sm:w-40"
          >
            <option value="date-desc">최근 수정순</option>
            <option value="date-asc">오래된 순</option>
            <option value="name-asc">이름 오름차순</option>
            <option value="name-desc">이름 내림차순</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['all', '전체 세트'],
            ['in-progress', '학습 중'],
            ['completed', '학습 완료'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="filter-chip"
              aria-pressed={studyFilter === value}
              onClick={() => setStudyFilter(value)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <button
            type="button"
            className="filter-chip"
            aria-pressed={activeTab === 'root'}
            onClick={() => setActiveTab(activeTab === 'root' ? 'all' : 'root')}
          >
            미분류만 보기
          </button>
          {(searchQuery || activeTab !== 'all' || studyFilter !== 'all') && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto min-h-10 px-2 text-xs text-muted-foreground hover:text-primary"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="text-xs text-muted-foreground">
          전체 {decks.length}개 중{' '}
          <strong className="font-semibold text-foreground">{filteredDecks.length}개</strong> 표시
        </p>
        <div
          className="flex rounded-xl border border-border bg-card p-1"
          aria-label="목록 표시 방식"
        >
          {(
            [
              ['grid', LayoutGrid, '격자 보기'],
              ['list', List, '목록 보기'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={layout === value}
              onClick={() => changeLayout(value)}
              className={cn(
                'rounded-lg p-2 transition-colors',
                layout === value
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      {!filteredDecks.length ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-primary" />}
          title={decks.length ? '조건에 맞는 세트가 없어요' : '첫 학습 세트를 만들어 보세요'}
          description={
            decks.length
              ? '다른 단어로 검색하거나 학습 상태를 바꿔보세요.'
              : '질문과 답을 카드에 담고, 나만의 속도로 기억해요.'
          }
          action={
            <Button
              variant={decks.length ? 'outline' : 'default'}
              onClick={decks.length ? clearFilters : onCreateDeck}
            >
              {decks.length ? '검색 및 필터 초기화' : '새 학습 세트 만들기'}
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            'grid gap-4',
            layout === 'grid' ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'
          )}
          aria-busy={searchQuery !== deferredQuery}
        >
          {filteredDecks.map((deck) => {
            const own = cardIndex.get(deck.id) || [];
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                cardsCount={own.length}
                learnedCount={own.filter((card) => card.learned).length}
                parentFolderTitle={folders.find((folder) => folder.id === deck.folderId)?.title}
                layout={layout}
                onNavigateDeck={onNavigateDeck}
                onStartStudy={onStartStudy}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
