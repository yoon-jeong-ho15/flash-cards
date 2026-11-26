import { CollectionLayoutToggle } from '../common/CollectionLayoutToggle';
import { useCollectionLayout } from '../../hooks/useCollectionLayout';
import { useSetSortPreference } from '../../hooks/useSetSortPreference';
import { indexCards } from '../../store/cardSelectors';
import React, { useState, useMemo, useDeferredValue } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { LibraryHeader } from '../common/LibraryHeader';
import { SetCard } from './SetCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search } from 'lucide-react';
import type { SetSortOption } from '../../types';
import { sortSets } from '../../utils/setSort';
import { richTextToText } from '../../utils/search';

interface AllSetsViewProps {
  onNavigateSet: (setId: string) => void;
  onStartStudy: (setId: string) => void;
  onCreateSet: () => void;
  onBack: () => void;
  onNavigateAllFolders?: () => void;
}

export const AllSetsView: React.FC<AllSetsViewProps> = ({
  onNavigateSet,
  onStartStudy,
  onCreateSet,
  onBack,
  onNavigateAllFolders,
}) => {
  const { collectionClassName } = useCollectionLayout();
  const sets = useFlashcardStore((state) => state.sets);
  const folders = useFlashcardStore((state) => state.folders);
  const cards = useFlashcardStore((state) => state.cards);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');
  const [studyFilter, setStudyFilter] = useState('all');
  const cardIndex = useMemo(() => indexCards(cards).bySet, [cards]);
  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
    setStudyFilter('all');
  };

  const [sortBy, handleSortChange] = useSetSortPreference('flashcard_all_sets_sort');

  // 검색 및 탭 필터링
  const filteredSets = useMemo(() => {
    let result = sets;

    if (activeTab === 'root') {
      result = result.filter((s) => !s.folderId);
    }

    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const titleMatch = s.title.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        const cardMatch = (cardIndex.get(s.id) || []).some(
          (c) =>
            richTextToText(c.termRichText).toLowerCase().includes(q) ||
            richTextToText(c.definitionRichText).toLowerCase().includes(q)
        );
        return titleMatch || descMatch || cardMatch;
      });
    }

    if (studyFilter !== 'all') {
      result = result.filter((cardSet) => {
        const setCards = cardIndex.get(cardSet.id) || [];
        const completed = setCards.length > 0 && setCards.every((card) => card.learned);
        return studyFilter === 'completed' ? completed : setCards.some((card) => !card.learned);
      });
    }

    return sortSets(result, sortBy);
  }, [sets, cardIndex, deferredQuery, activeTab, sortBy, studyFilter]);

  return (
    <div className="page-container space-y-6">
      <LibraryHeader
        active="sets"
        onFolders={onNavigateAllFolders || onBack}
        onCreate={onCreateSet}
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
            aria-label="학습 세트 정렬 방식"
            value={sortBy}
            onChange={(event) => handleSortChange(event.target.value as SetSortOption)}
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
        <p role="status" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          전체 {sets.length}개 중{' '}
          <strong className="font-semibold text-foreground">{filteredSets.length}개</strong> 표시
        </p>
        <CollectionLayoutToggle />
      </div>
      {!filteredSets.length ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-primary" />}
          title={sets.length ? '조건에 맞는 세트가 없어요' : '첫 학습 세트를 만들어 보세요'}
          description={
            sets.length
              ? '다른 단어로 검색하거나 학습 상태를 바꿔보세요.'
              : '질문과 답을 카드에 담고, 나만의 속도로 기억해요.'
          }
          action={
            <Button
              variant={sets.length ? 'outline' : 'default'}
              onClick={sets.length ? clearFilters : onCreateSet}
            >
              {sets.length ? '검색 및 필터 초기화' : '새 학습 세트 만들기'}
            </Button>
          }
        />
      ) : (
        <div
          className={collectionClassName}
          aria-busy={searchQuery !== deferredQuery}
        >
          {filteredSets.map((cardSet) => {
            const own = cardIndex.get(cardSet.id) || [];
            return (
              <SetCard
                key={cardSet.id}
                set={cardSet}
                cardsCount={own.length}
                learnedCount={own.filter((card) => card.learned).length}
                parentFolderTitle={folders.find((folder) => folder.id === cardSet.folderId)?.title}
                onNavigateSet={onNavigateSet}
                onStartStudy={onStartStudy}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
