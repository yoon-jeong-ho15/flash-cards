import React, { memo } from 'react';
import { Deck } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, CheckCircle2, Layers, Play, Folder as FolderIcon } from 'lucide-react';

interface DeckCardProps {
  deck: Deck;
  cardsCount: number;
  learnedCount: number;
  parentFolderTitle?: string | null;
  showFolderBadge?: boolean;
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = memo(
  ({
    deck,
    cardsCount,
    learnedCount,
    parentFolderTitle,
    showFolderBadge = true,
    onNavigateDeck,
    onStartStudy,
  }) => {
    const progress = cardsCount > 0 ? Math.round((learnedCount / cardsCount) * 100) : 0;
    const complete = cardsCount > 0 && learnedCount === cardsCount;
    return (
      <Card className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:border-primary/35 hover:shadow-md">
        <button
          type="button"
          onClick={() => onNavigateDeck(deck.id)}
          aria-label={`${deck.title} 덱 열기`}
          className="flex flex-1 flex-col p-5 pb-4 text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
        >
          <span className="mb-4 flex w-full items-center justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Layers className="h-5 w-5" />
            </span>
            {showFolderBadge && (
              <Badge
                variant="outline"
                className="max-w-[70%] gap-1.5 border-border/70 font-normal text-[11px] text-muted-foreground"
              >
                <FolderIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{parentFolderTitle || '미분류'}</span>
              </Badge>
            )}
          </span>
          <span className="flex w-full items-start justify-between gap-2">
            <span className="line-clamp-2 font-semibold tracking-tight group-hover:text-primary">
              {deck.title}
            </span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </span>
          <span className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {deck.description || `카드 ${cardsCount}장 · 나만의 속도로 차근차근 학습해요.`}
          </span>
        </button>
        <div className="px-5 pb-5">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">
              {learnedCount} / {cardsCount}장 학습
            </span>
            <span className="font-medium text-primary">
              {complete ? '학습 완료' : `${progress}%`}
            </span>
          </div>
          <ProgressBar value={progress} className="mb-4" />
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <span className="text-[11px] text-muted-foreground">
              {new Date(deck.updatedAt).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              수정
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStartStudy(deck.id)}
              disabled={!cardsCount}
              leftIcon={
                complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )
              }
              className="relative z-10 h-9 hover:bg-primary hover:text-primary-foreground"
            >
              {complete ? '다시 복습' : '학습하기'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
);
DeckCard.displayName = 'DeckCard';
