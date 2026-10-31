import React from 'react';
import { Layers, Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LibraryHeader({
  active,
  onDecks,
  onFolders,
  onCreate,
}: {
  active: 'decks' | 'folders';
  onDecks?: () => void;
  onFolders?: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label mb-2">YOUR LIBRARY</p>
          <h1 className="page-title">나의 배움이 모이는 곳</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            기억하고 싶은 모든 것을 한곳에 모아보세요.
          </p>
        </div>
        <Button onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
          {active === 'decks' ? '새 학습 세트' : '새 폴더'}
        </Button>
      </div>
      <nav aria-label="라이브러리 보기" className="library-nav">
        <button
          type="button"
          aria-current={active === 'decks' ? 'page' : undefined}
          onClick={onDecks}
        >
          <Layers className="h-4 w-4" />
          학습 세트
        </button>
        <button
          type="button"
          aria-current={active === 'folders' ? 'page' : undefined}
          onClick={onFolders}
        >
          <Folder className="h-4 w-4" />
          폴더
        </button>
      </nav>
    </div>
  );
}
