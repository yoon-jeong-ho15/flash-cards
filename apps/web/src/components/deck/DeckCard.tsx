import React, { memo } from 'react';
import { Deck } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Folder as FolderIcon } from 'lucide-react';

interface DeckCardProps {
  deck: Deck;
  cardsCount: number;
  learnedCount: number;
  parentFolderTitle?: string | null;
  showFolderBadge?: boolean;
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = memo(({
  deck,
  cardsCount,
  learnedCount,
  parentFolderTitle,
  showFolderBadge = true,
  onNavigateDeck,
  onStartStudy,
}) => {
  const progress = cardsCount > 0 ? Math.round((learnedCount / cardsCount) * 100) : 0;

  return (
    <Card
      onClick={() => onNavigateDeck(deck.id)}
      className="group p-5 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {showFolderBadge && (
          <div className="mb-2.5">
            {parentFolderTitle ? (
              <Badge variant="secondary" className="truncate max-w-full gap-1 text-[11px] font-medium">
                <FolderIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate">{parentFolderTitle}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[11px] font-normal">
                미분류
              </Badge>
            )}
          </div>
        )}

        <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors line-clamp-1 mb-1 tracking-tight">
          {deck.title}
        </h3>
        {deck.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {deck.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic mb-4">설명 없음</p>
        )}
      </div>

      <div className="pt-3 border-t border-border mt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
          <span>카드 {cardsCount}개</span>
          <span className="font-semibold text-foreground font-mono">{progress}% 완료</span>
        </div>

        <ProgressBar value={progress} size="sm" className="mb-3" />

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {new Date(deck.updatedAt).toLocaleDateString()}
          </span>

          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onStartStudy(deck.id);
            }}
            disabled={cardsCount === 0}
            leftIcon={<Play className="w-3 h-3 fill-current" />}
            className="h-8 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            학습
          </Button>
        </div>
      </div>
    </Card>
  );
});

DeckCard.displayName = 'DeckCard';
