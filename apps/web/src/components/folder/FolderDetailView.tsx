import { indexCards, selectFolderCards } from '../../store/cardSelectors';
import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { FolderModal } from './FolderModal';
import { DeckCard } from '../deck/DeckCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ConfirmModal } from '../common/ConfirmModal';
import { ActionMenu } from '../common/ActionMenu';
import { Input } from '@/components/ui/input';
import { richTextToText } from '../../utils/search';
import { ArrowLeft, Search } from 'lucide-react';
import {
  Folder,
  Plus,
  Edit3,
  Trash2,
  Layers,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  Shuffle,
} from 'lucide-react';
import { DeckSortOption } from '../../types';

interface FolderDetailViewProps {
  folderId: string;
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onStartFolderStudy: (folderId: string) => void;
  onCreateDeckInFolder: (folderId: string) => void;
  onBack: () => void;
}

export const FolderDetailView: React.FC<FolderDetailViewProps> = ({
  folderId,
  onNavigateDeck,
  onStartStudy,
  onStartFolderStudy,
  onCreateDeckInFolder,
  onBack,
}) => {
  const folders = useFlashcardStore((state) => state.folders);
  const decks = useFlashcardStore((state) => state.decks);
  const cards = useFlashcardStore((state) => state.cards);
  const deleteFolder = useFlashcardStore((state) => state.deleteFolder);
  const [query, setQuery] = useState('');
  const cardIndex = useMemo(() => indexCards(cards).byDeck, [cards]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const folder = useMemo(() => folders.find((f) => f.id === folderId), [folders, folderId]);
  const folderDecks = useMemo(
    () => decks.filter((d) => d.folderId === folderId),
    [decks, folderId]
  );
  const folderCardsCount = useMemo(
    () => selectFolderCards({ decks, cards }, folderId).length,
    [decks, cards, folderId]
  );

  const [sortBy, setSortBy] = useState<DeckSortOption>(() => {
    try {
      const saved = localStorage.getItem('flashcard_folder_deck_sort') as DeckSortOption;
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
      localStorage.setItem('flashcard_folder_deck_sort', newSort);
    } catch {
      // ignore storage error
    }
  };

  const sortedDecks = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ko-KR');
    const list = folderDecks.filter(
      (deck) =>
        !q ||
        `${deck.title} ${deck.description || ''}`.toLocaleLowerCase('ko-KR').includes(q) ||
        (cardIndex.get(deck.id) || []).some((card) =>
          richTextToText(`${card.termRichText} ${card.definitionRichText}`)
            .toLocaleLowerCase('ko-KR')
            .includes(q)
        )
    );
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
  }, [folderDecks, sortBy, query, cardIndex]);

  if (!folder) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">존재하지 않는 폴더입니다.</p>
        <Button variant="default" onClick={onBack}>
          대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteFolder(folder.id, false);
    setShowDeleteConfirm(false);
    onBack();
  };

  return (
    <div className="page-container space-y-7">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-3 text-xs text-muted-foreground"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          학습 홈
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onCreateDeckInFolder(folder.id)}
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            새 학습 세트
          </Button>
          <ActionMenu
            label="폴더 관리"
            actions={[
              {
                label: '폴더 수정',
                icon: <Edit3 className="h-4 w-4" />,
                onSelect: () => setShowEditModal(true),
              },
              {
                label: '폴더 삭제',
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => setShowDeleteConfirm(true),
                destructive: true,
              },
            ]}
          />
        </div>
      </div>
      <section className="rounded-[28px] border border-[#f1e7de] bg-[#fff8f1] p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <span className="rounded-[20px] bg-[#ffeadb] p-4 text-[#ba7549]">
            <Folder className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="section-label mb-2">MY FOLDER</p>
            <h1 className="page-title break-words">{folder.title}</h1>
            {folder.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {folder.description}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              학습 세트 {folderDecks.length}개 · 전체 카드 {folderCardsCount}장
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 border-t border-[#f1e7de] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-xs leading-6 text-muted-foreground">
            폴더 속 모든 카드를 섞어 복습해 보세요.
            <br />
            이미 기억한 카드도 함께 학습해요.
          </p>
          <Button
            onClick={() => onStartFolderStudy(folder.id)}
            disabled={!folderCardsCount}
            leftIcon={<Shuffle className="h-4 w-4" />}
          >
            폴더 전체 랜덤 학습
          </Button>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          폴더의 학습 세트{' '}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {sortedDecks.length}
          </span>
        </h2>
        <select
          aria-label="카드 덱 정렬 방식"
          value={sortBy}
          onChange={(event) => handleSortChange(event.target.value as DeckSortOption)}
          className="filter-select"
        >
          <option value="date-desc">최근 수정순</option>
          <option value="date-asc">오래된 순</option>
          <option value="name-asc">이름 오름차순</option>
          <option value="name-desc">이름 내림차순</option>
        </select>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="폴더 안 세트와 카드 검색"
        placeholder="이 폴더에서 세트나 카드를 찾아보세요"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {!sortedDecks.length ? (
        <EmptyState
          icon={<Layers className="h-8 w-8 text-primary" />}
          title={query ? '검색 결과가 없어요' : '폴더에 첫 세트를 추가해 보세요'}
          description={
            query ? '다른 검색어로 다시 찾아보세요.' : '관련된 질문과 답을 한곳에 모아보세요.'
          }
          action={
            <Button
              variant={query ? 'outline' : 'default'}
              onClick={query ? () => setQuery('') : () => onCreateDeckInFolder(folder.id)}
            >
              {query ? '검색어 지우기' : '새 학습 세트 만들기'}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {sortedDecks.map((deck) => {
            const own = cardIndex.get(deck.id) || [];
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                cardsCount={own.length}
                learnedCount={own.filter((card) => card.learned).length}
                showFolderBadge={false}
                onNavigateDeck={onNavigateDeck}
                onStartStudy={onStartStudy}
              />
            );
          })}
        </div>
      )}
      {showEditModal && (
        <FolderModal folderId={folder.id} onClose={() => setShowEditModal(false)} />
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="폴더 삭제"
        message={`'${folder.title}' 폴더를 삭제할까요? 안의 학습 세트와 카드는 미분류로 이동하며 유지됩니다.`}
        confirmText="폴더 삭제"
        isDanger
      />
    </div>
  );
};
