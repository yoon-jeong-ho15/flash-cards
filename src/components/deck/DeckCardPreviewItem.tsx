import React, { memo } from 'react';
import { Card as CardType } from '../../types';
import { RichTextViewer } from '../editor/RichTextViewer';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeckCardPreviewItemProps {
  card: CardType;
  index: number;
  onToggleLearned: (cardId: string, currentLearned: boolean) => void;
}

export const DeckCardPreviewItem: React.FC<DeckCardPreviewItemProps> = memo(({
  card,
  index,
  onToggleLearned,
}) => {
  return (
    <Card className="p-4 sm:p-5 hover:border-border/80 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4">
      {/* 좌측: 번호 & 앞면 단어 */}
      <div className="md:w-1/3 flex items-start gap-3">
        <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-mono font-semibold shrink-0 mt-0.5 border border-border">
          {index + 1}
        </span>
        <div className="flex-1 font-semibold text-foreground text-sm sm:text-base tracking-tight">
          <RichTextViewer html={card.termRichText} textSize="base" />
        </div>
      </div>

      <div className="hidden md:block w-px self-stretch bg-border my-1 shrink-0" />

      {/* 중앙: 뒷면 정의 & 이미지 */}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 text-sm text-muted-foreground">
          <RichTextViewer html={card.definitionRichText} textSize="sm" />
        </div>

        {card.imageUrl && (
          <div
            className="shrink-0 w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted/40 flex items-center justify-center p-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(card.imageUrl, '_blank')}
            title="이미지 크게 보기"
          >
            <img
              src={card.imageUrl}
              alt="첨부 이미지"
              className="w-full h-full object-contain rounded"
            />
          </div>
        )}
      </div>

      {/* 우측: 학습 완료 여부 토글 */}
      <div className="flex items-center justify-end pt-2 md:pt-0 border-t md:border-t-0 border-border shrink-0">
        <Button
          variant={card.learned ? 'outline' : 'secondary'}
          size="sm"
          onClick={() => onToggleLearned(card.id, card.learned)}
          className={
            card.learned
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
              : 'text-muted-foreground hover:text-foreground'
          }
        >
          {card.learned ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span>{card.learned ? '마스터 완료' : '학습 대기'}</span>
        </Button>
      </div>
    </Card>
  );
});

DeckCardPreviewItem.displayName = 'DeckCardPreviewItem';
