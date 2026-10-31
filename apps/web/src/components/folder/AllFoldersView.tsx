import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { FolderCard } from './FolderCard';
import { LibraryHeader } from '../common/LibraryHeader';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder as FolderIcon, Search } from 'lucide-react';

interface AllFoldersViewProps {
  onNavigateFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onBack: () => void;
  onNavigateAllDecks?: () => void;
}

export const AllFoldersView: React.FC<AllFoldersViewProps> = ({
  onNavigateFolder,
  onCreateFolder,
  onBack,
  onNavigateAllDecks,
}) => {
  const folders = useFlashcardStore((state) => state.folders);
  const decks = useFlashcardStore((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');

  // 폴더 검색 필터링 및 이름순 정렬
  const filteredFolders = useMemo(() => {
    let result = folders;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = folders.filter((f) => {
        const titleMatch = f.title.toLowerCase().includes(q);
        const descMatch = f.description?.toLowerCase().includes(q);
        return titleMatch || descMatch;
      });
    }
    return [...result].sort((a, b) => {
      const diff = a.title.localeCompare(b.title, 'ko', { numeric: true });
      return diff !== 0 ? diff : (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [folders, searchQuery]);

  return (
    <div className="page-container space-y-6">
      <LibraryHeader
        active="folders"
        onDecks={onNavigateAllDecks || onBack}
        onCreate={onCreateFolder}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="text-sm text-muted-foreground">
          내 폴더{' '}
          <strong className="ml-1 font-semibold text-foreground">{filteredFolders.length}개</strong>
        </p>
        <div className="w-full sm:max-w-sm">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="폴더 이름이나 설명으로 찾아보세요"
            aria-label="폴더 이름, 설명 검색"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>
      {!filteredFolders.length ? (
        <EmptyState
          icon={<FolderIcon className="h-8 w-8 text-[#ba7549]" />}
          title={searchQuery ? '검색 결과가 없어요' : '주제별로 배움을 모아보세요'}
          description={
            searchQuery
              ? '다른 단어나 더 짧은 검색어로 찾아보세요.'
              : '관련된 학습 세트를 하나의 폴더에 모아 정리할 수 있어요.'
          }
          action={
            <Button
              variant={searchQuery ? 'outline' : 'default'}
              onClick={searchQuery ? () => setSearchQuery('') : onCreateFolder}
            >
              {searchQuery ? '검색어 지우기' : '첫 폴더 만들기'}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              decksCount={decks.filter((deck) => deck.folderId === folder.id).length}
              onClick={() => onNavigateFolder(folder.id)}
            />
          ))}
          {!searchQuery && (
            <button
              type="button"
              onClick={onCreateFolder}
              className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-input text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <FolderIcon className="h-7 w-7" />새 폴더 만들기
            </button>
          )}
        </div>
      )}
    </div>
  );
};
