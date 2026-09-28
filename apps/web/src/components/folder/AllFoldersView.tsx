import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { FolderCard } from './FolderCard';
import { StickyActionBar } from '../common/StickyActionBar';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Folder as FolderIcon, FolderPlus, Search } from 'lucide-react';

interface AllFoldersViewProps {
  onNavigateFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onBack: () => void;
}

export const AllFoldersView: React.FC<AllFoldersViewProps> = ({
  onNavigateFolder,
  onCreateFolder,
  onBack,
}) => {
  const { folders, decks } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');

  // 폴더 검색 필터링
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) {
      return folders;
    }
    const q = searchQuery.toLowerCase();
    return folders.filter((f) => {
      const titleMatch = f.title.toLowerCase().includes(q);
      const descMatch = f.description?.toLowerCase().includes(q);
      return titleMatch || descMatch;
    });
  }, [folders, searchQuery]);

  return (
    <div className="relative">
      {/* 상단 Sticky 액션바 */}
      <StickyActionBar
        onBack={onBack}
        iconOnlyBack
        backTitle="대시보드로 돌아가기"
        title="모든 폴더"
        description="전체 폴더 목록을 조회하고 관리합니다."
        right={
          <Button
            variant="default"
            size="sm"
            onClick={onCreateFolder}
            leftIcon={<FolderPlus className="w-4 h-4" />}
            className="font-semibold shadow-xs"
          >
            <span>새 폴더</span>
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
        {/* 검색 및 카운트 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              총 폴더
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {filteredFolders.length}
            </Badge>
          </div>

          <div className="w-full sm:max-w-xs">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="폴더 이름, 설명 검색..."
              leftIcon={<Search className="w-4 h-4" />}
              className="h-9"
            />
          </div>
        </div>

        {/* 폴더 목록 그리드 */}
        {filteredFolders.length === 0 ? (
          <EmptyState
            icon={<FolderIcon className="w-8 h-8 text-muted-foreground" />}
            title={searchQuery ? '검색 결과와 일치하는 폴더가 없습니다.' : '등록된 폴더가 없습니다.'}
            description={
              searchQuery
                ? '다른 검색어로 다시 시도해 보세요.'
                : '폴더를 생성하여 관련된 카드 덱을 체계적으로 묶어보세요.'
            }
            action={
              !searchQuery && (
                <Button variant="default" size="sm" onClick={onCreateFolder}>
                  새 폴더 만들기
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFolders.map((f) => {
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
        )}
      </div>
    </div>
  );
};
