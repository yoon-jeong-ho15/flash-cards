import React, { memo } from 'react';
import { Card as CardType } from '../../types';
import { RichTextViewer } from '../editor/RichTextViewer';
import { Edit3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeckCardPreviewItemProps {
  card: CardType;
  index: number;
  onEdit: (cardId: string) => void;
}

export const DeckCardPreviewItem: React.FC<DeckCardPreviewItemProps> = memo(({
  card,
  index,
  onEdit,
}) => {
  const backImage = card.backImageUrl || card.imageUrl;

  return (
    <Card className="p-4 sm:p-5 hover:border-border/80 transition-all flex flex-col gap-3">
      {/* 본문 영역: 앞면 & 뒷면 */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* 좌측: 번호 & 앞면 단어 및 이미지 */}
        <div className="md:w-1/3 flex items-start gap-3">
          <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-mono font-semibold shrink-0 mt-0.5 border border-border">
            {index + 1}
          </span>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 font-semibold text-foreground text-sm sm:text-base tracking-tight">
              <RichTextViewer html={card.termRichText} textSize="base" />
            </div>
            {card.frontImageUrl && (
              <div
                className="shrink-0 w-14 h-14 rounded-lg border border-border overflow-hidden bg-muted/40 flex items-center justify-center p-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(card.frontImageUrl, '_blank')}
                title="앞면 이미지 크게 보기"
              >
                <img
                  src={card.frontImageUrl}
                  alt="앞면 첨부 이미지"
                  className="w-full h-full object-contain rounded"
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:block w-px self-stretch bg-border my-1 shrink-0" />

        {/* 중앙/우측: 뒷면 정의 & 이미지 */}
        <div className="flex-1 flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            <RichTextViewer html={card.definitionRichText} textSize="sm" />
          </div>

          {backImage && (
            <div
              className="shrink-0 w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted/40 flex items-center justify-center p-0.5 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(backImage, '_blank')}
              title="뒷면 이미지 크게 보기"
            >
              <img
                src={backImage}
                alt="뒷면 첨부 이미지"
                className="w-full h-full object-contain rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* 카드 하단: 구분선 없이 작게 수정하기 버튼 */}
      <div className="flex items-center justify-end -mb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(card.id)}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
        >
          <span>수정하기</span>
        </Button>
      </div>
    </Card>
  );
});

DeckCardPreviewItem.displayName = 'DeckCardPreviewItem';
