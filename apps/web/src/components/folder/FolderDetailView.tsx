import { CollectionLayoutToggle } from '../common/CollectionLayoutToggle';
import { useCollectionLayout } from '../../hooks/useCollectionLayout';
import { useSetSortPreference } from '../../hooks/useSetSortPreference';
import { indexCards, selectFolderCards } from '../../store/cardSelectors';
import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { FolderModal } from './FolderModal';
import { SetCard } from '../set/SetCard';
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
import type { SetSortOption } from '../../types';
import { sortSets } from '../../utils/setSort';

interface FolderDetailViewProps {
  folderId: string;
  onNavigateSet: (setId: string) => void;
  onStartStudy: (setId: string) => void;
  onStartFolderStudy: (folderId: string) => void;
  onCreateSetInFolder: (folderId: string) => void;
  onBack: () => void;
}

export const FolderDetailView: React.FC<FolderDetailViewProps> = ({
  folderId,
  onNavigateSet,
  onStartStudy,
  onStartFolderStudy,
  onCreateSetInFolder,
  onBack,
}) => {
  const { collectionClassName } = useCollectionLayout();
  const folders = useFlashcardStore((state) => state.folders);
  const sets = useFlashcardStore((state) => state.sets);
  const cards = useFlashcardStore((state) => state.cards);
  const deleteFolder = useFlashcardStore((state) => state.deleteFolder);
  const [query, setQuery] = useState('');
  const cardIndex = useMemo(() => indexCards(cards).bySet, [cards]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const folder = useMemo(() => folders.find((f) => f.id === folderId), [folders, folderId]);
  const folderSets = useMemo(
    () => sets.filter((s) => s.folderId === folderId),
    [sets, folderId]
  );
  const folderCardsCount = useMemo(
    () => selectFolderCards({ sets, cards }, folderId).length,
    [sets, cards, folderId]
  );

  const [sortBy, handleSortChange] = useSetSortPreference('flashcard_folder_set_sort');

  const sortedSets = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ko-KR');
    const list = folderSets.filter(
      (cardSet) =>
        !q ||
        `${cardSet.title} ${cardSet.description || ''}`.toLocaleLowerCase('ko-KR').includes(q) ||
        (cardIndex.get(cardSet.id) || []).some((card) =>
          richTextToText(`${card.termRichText} ${card.definitionRichText}`)
            .toLocaleLowerCase('ko-KR')
            .includes(q)
        )
    );
    return sortSets(list, sortBy);
  }, [folderSets, sortBy, query, cardIndex]);

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

  const handleDelete = async () => {
    try { await deleteFolder(folder.id, false); } catch { return; }
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
            onClick={() => onCreateSetInFolder(folder.id)}
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
              학습 세트 {folderSets.length}개 · 전체 카드 {folderCardsCount}장
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
            {sortedSets.length}
          </span>
        </h2>
        <select
          aria-label="학습 세트 정렬 방식"
          value={sortBy}
          onChange={(event) => handleSortChange(event.target.value as SetSortOption)}
          className="filter-select"
        >
          <option value="date-desc">최근 수정순</option>
          <option value="date-asc">오래된 순</option>
          <option value="name-asc">이름 오름차순</option>
          <option value="name-desc">이름 내림차순</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="폴더 안 세트와 카드 검색"
            placeholder="이 폴더에서 세트나 카드를 찾아보세요"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <CollectionLayoutToggle />
      </div>
      {!sortedSets.length ? (
        <EmptyState
          icon={<Layers className="h-8 w-8 text-primary" />}
          title={query ? '검색 결과가 없어요' : '폴더에 첫 세트를 추가해 보세요'}
          description={
            query ? '다른 검색어로 다시 찾아보세요.' : '관련된 질문과 답을 한곳에 모아보세요.'
          }
          action={
            <Button
              variant={query ? 'outline' : 'default'}
              onClick={query ? () => setQuery('') : () => onCreateSetInFolder(folder.id)}
            >
              {query ? '검색어 지우기' : '새 학습 세트 만들기'}
            </Button>
          }
        />
      ) : (
        <div className={collectionClassName}>
          {sortedSets.map((cardSet) => {
            const own = cardIndex.get(cardSet.id) || [];
            return (
              <SetCard
                key={cardSet.id}
                set={cardSet}
                cardsCount={own.length}
                learnedCount={own.filter((card) => card.learned).length}
                showFolderBadge={false}
                onNavigateSet={onNavigateSet}
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
