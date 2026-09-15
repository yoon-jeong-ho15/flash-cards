import React, { memo, useRef, useEffect } from 'react';
import { RichTextEditor } from '../editor/RichTextEditor';
import { ImageUploader } from '../editor/ImageUploader';
import { ChevronUp, ChevronDown, Copy, Trash2, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CardFormItem {
  id?: string;
  termRichText: string;
  definitionRichText: string;
  imageUrl?: string;
  learned?: boolean;
}

interface DeckCardEditorItemProps {
  index: number;
  card: CardFormItem;
  totalCards: number;
  autoFocusFront?: boolean;
  onUpdate: (index: number, field: keyof CardFormItem, value: any) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
}

export const DeckCardEditorItem: React.FC<DeckCardEditorItemProps> = memo(({
  index,
  card,
  totalCards,
  autoFocusFront,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}) => {
  const dragControls = useDragControls();
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (autoFocusFront && itemRef.current) {
      const timer = setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocusFront]);

  return (
    <Reorder.Item
      ref={itemRef}
      value={card}
      id={card.id || `card-${index}`}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      whileDrag={{
        scale: 1.015,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.12)',
        zIndex: 50,
      }}
      transition={{ duration: 0.2 }}
      className="relative bg-card rounded-xl border border-border shadow-xs p-4 sm:p-6 transition-colors hover:border-border/80"
    >
      {/* 카드 헤더 (번호 및 조작 버튼) */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
        <div className="flex items-center gap-2">
          {/* 드래그 핸들 버튼 (잡아서 순서 이동) */}
          <button
            type="button"
            className="p-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-grab active:cursor-grabbing touch-none transition-colors"
            onPointerDown={(e) => dragControls.start(e)}
            title="드래그하여 순서 변경"
            tabIndex={-1}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="w-6 h-6 rounded-md bg-muted text-foreground flex items-center justify-center text-xs font-mono font-bold border border-border">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">Card {index + 1}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="위로 이동"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={() => onMoveDown(index)}
            disabled={index === totalCards - 1}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="아래로 이동"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={() => onDuplicate(index)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="카드 복제"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={() => onRemove(index)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="카드 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 카드 입력부: 앞면(단어) & 뒷면(정의) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 앞면 에디터 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>앞면 (단어 / 질문)</span>
            <Badge variant="secondary" className="text-[10px] font-medium py-0">개념</Badge>
          </div>
          <RichTextEditor
            value={card.termRichText}
            onChange={(html) => onUpdate(index, 'termRichText', html)}
            placeholder="단어, 질문 또는 핵심 키워드를 입력하세요..."
            minHeight="100px"
            autoFocus={autoFocusFront}
          />
        </div>

        {/* 뒷면 에디터 & 이미지 첨부 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>뒷면 (정의 / 해설)</span>
            <Badge variant="warning" className="text-[10px] font-medium py-0">정의</Badge>
          </div>
          <RichTextEditor
            value={card.definitionRichText}
            onChange={(html) => onUpdate(index, 'definitionRichText', html)}
            placeholder="상세 설명, 해설, 예시 코드를 입력하세요..."
            minHeight="100px"
          />

          {/* 이미지 업로더 */}
          <div className="pt-2">
            <ImageUploader
              imageUrl={card.imageUrl}
              onImageChange={(url) => onUpdate(index, 'imageUrl', url)}
              compact
            />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
});

DeckCardEditorItem.displayName = 'DeckCardEditorItem';
