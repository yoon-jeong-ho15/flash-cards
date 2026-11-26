import React, { memo } from 'react';
import { CardSet } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, Check, Layers, Play, Folder } from 'lucide-react';
import { setAccent } from '@/lib/learning';

interface SetCardProps {
  set: CardSet;
  cardsCount: number;
  learnedCount: number;
  parentFolderTitle?: string | null;
  showFolderBadge?: boolean;
  onNavigateSet: (setId: string) => void;
  onStartStudy: (setId: string) => void;
}
export const SetCard: React.FC<SetCardProps> = memo(
  ({
    set: cardSet,
    cardsCount,
    learnedCount,
    parentFolderTitle,
    showFolderBadge = true,
    onNavigateSet,
    onStartStudy,
  }) => {
    const progress = cardsCount ? Math.round((learnedCount / cardsCount) * 100) : 0;
    const complete = cardsCount > 0 && learnedCount === cardsCount;
    const accent = setAccent(cardSet.title);
    return (
      <Card
        className="group relative flex flex-col overflow-hidden transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      >
        <button
          type="button"
          onClick={() => onNavigateSet(cardSet.id)}
          aria-label={`${cardSet.title} 학습 세트 열기`}
          className="min-w-0 flex-1 p-5 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
        >
          <span className="mb-5 flex items-center justify-between gap-3">
            <span
              style={{
                backgroundColor: accent.background,
                color: accent.color,
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            >
              <Layers className="h-6 w-6" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
          </span>
          <span className="block min-w-0">
            <span className="block line-clamp-2 text-base font-bold leading-relaxed tracking-tight group-hover:text-primary">
              {cardSet.title}
            </span>
            <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{cardsCount}장</span>
              {showFolderBadge && (
                <>
                  <span className="opacity-40">·</span>
                  <Folder className="h-3 w-3" />
                  <span className="truncate">{parentFolderTitle || '미분류'}</span>
                </>
              )}
            </span>
            {cardSet.description && (
              <span className="mt-3 block min-h-10 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {cardSet.description}
              </span>
            )}
          </span>
        </button>
        <div className="px-5 pb-5">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">
              {learnedCount}/{cardsCount}장 학습
            </span>
            <span
              className={
                complete
                  ? 'inline-flex items-center gap-1 font-medium text-emerald-700'
                  : 'font-semibold text-primary'
              }
            >
              {complete && <Check className="h-3 w-3" />}
              {complete ? '학습 완료' : `${progress}%`}
            </span>
          </div>
          <ProgressBar value={progress} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              {new Date(cardSet.updatedAt).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              수정
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="relative z-10 h-9 text-xs"
              disabled={!cardsCount}
              onClick={() => onStartStudy(cardSet.id)}
              leftIcon={<Play className="h-3.5 w-3.5" />}
            >
              {complete ? '다시 복습' : '학습하기'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
);
SetCard.displayName = 'SetCard';
