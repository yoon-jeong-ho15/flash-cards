import React, { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, FileText, GripVertical } from 'lucide-react';
import { Reorder, useDragControls, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardFormItem } from './DeckCardEditorItem';
import { cn } from '@/lib/utils';

interface DeckEditorOutlineProps {
  cards: CardFormItem[];
  activeIndex?: number;
  activeCardId?: string;
  onSelectCard: (index: number) => void;
  onReorderCards?: (newCards: CardFormItem[]) => void;
  onGrabCardHandle?: (index: number, cardId?: string) => void;
  onAddCard: () => void;
  onRemoveCard: (index: number) => void;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
}

// HTML 태그 제거 및 순수 텍스트 추출 헬퍼 (정규식 기반 고성능 텍스트 추출)
function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

interface DeckEditorOutlineItemProps {
  card: CardFormItem;
  index: number;
  isCurrentActive: boolean;
  canRemove: boolean;
  onSelectCard: (index: number) => void;
  onRemoveCard: (index: number) => void;
  onGrabCardHandle?: (index: number, cardId?: string) => void;
}

const DeckEditorOutlineItem: React.FC<DeckEditorOutlineItemProps> = React.memo(
  ({ card, index, isCurrentActive, canRemove, onSelectCard, onRemoveCard, onGrabCardHandle }) => {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);

    const frontText = stripHtml(card.termRichText);
    const backText = stripHtml(card.definitionRichText);
    const hasImage = Boolean(card.frontImageUrl || card.backImageUrl || card.imageUrl);

    return (
      <Reorder.Item
        value={card}
        id={`outline-card-${index}`}
        data-card-id={card.id}
        dragListener={false}
        dragControls={dragControls}
        onDragStart={() => {
          setIsDragging(true);
          onGrabCardHandle?.(index, card.id);
        }}
        onDragEnd={() => setIsDragging(false)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileDrag={{
          scale: 1.02,
          zIndex: 50,
        }}
        transition={{
          layout: { type: 'spring', stiffness: 450, damping: 35 },
          opacity: { duration: 0.15 },
        }}
        onClick={() => onSelectCard(index)}
        className={cn(
          'group relative flex items-start gap-1.5 p-2 rounded-lg cursor-pointer transition-colors border text-left list-none select-none',
          isDragging && 'shadow-lg border-primary/50 bg-card ring-1 ring-primary/30 z-50',
          isCurrentActive && !isDragging
            ? 'bg-primary/10 border-primary/40 text-foreground font-medium shadow-2xs'
            : !isDragging &&
                'border-transparent hover:bg-muted/70 hover:border-border text-muted-foreground'
        )}
      >
        {/* 드래그 핸들 & 순번 배지 */}
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          <button
            type="button"
            tabIndex={-1}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground/40 hover:text-foreground group-hover:text-muted-foreground rounded transition-colors touch-none"
            onPointerDown={(e) => {
              onGrabCardHandle?.(index, card.id);
              dragControls.start(e);
            }}
            title="드래그하여 순서 변경"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <div
            className={cn(
              'w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center shrink-0 transition-colors',
              isCurrentActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground'
            )}
          >
            {index + 1}
          </div>
        </div>

        {/* 카드 텍스트 요약 */}
        <div className="flex-1 min-w-0 pr-4">
          <p
            className={cn(
              'text-xs truncate leading-snug',
              frontText ? 'font-medium text-foreground' : 'text-muted-foreground/60 italic'
            )}
          >
            {frontText || '(앞면 비어있음)'}
          </p>

          <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
            {backText || '(뒷면 비어있음)'}
          </p>

          {/* 미니 메타 인디케이터 (이미지 첨부 여부 등) */}
          {hasImage && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-primary/80">
              <ImageIcon className="w-2.5 h-2.5" />
              <span>이미지 첨부됨</span>
            </div>
          )}
        </div>

        {/* 삭제 버튼 (호버 시 노출) */}
        {canRemove && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCard(index);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors absolute right-1.5 top-2"
            title="카드 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </Reorder.Item>
    );
  }
);

DeckEditorOutlineItem.displayName = 'DeckEditorOutlineItem';

export const DeckEditorOutline: React.FC<DeckEditorOutlineProps> = React.memo(
  ({
    cards,
    activeIndex,
    activeCardId,
    onSelectCard,
    onReorderCards,
    onGrabCardHandle,
    onAddCard,
    onRemoveCard,
    className,
  }) => {
    return (
      <aside
        className={cn(
          'w-56 xl:w-64 shrink-0 h-[calc(100dvh-8.5rem)] flex flex-col bg-card rounded-3xl border border-border p-3.5 shadow-xs select-none',
          className
        )}
      >
        {/* 목차 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground tracking-tight">카드 목차</h3>
            <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-4">
              {cards.length}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onAddCard}
            leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
            className="h-7 text-xs px-2"
            title="새 카드 추가"
          >
            추가
          </Button>
        </div>

        {/* 카드 인덱스 스크롤 리스트 */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1 text-xs">
          {cards.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs leading-relaxed">
              카드가 없습니다.
              <br />
              <button
                type="button"
                tabIndex={-1}
                onClick={onAddCard}
                className="text-primary hover:underline font-semibold mt-1 inline-block cursor-pointer"
              >
                + 첫 번째 카드 추가
              </button>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={cards}
              onReorder={onReorderCards || (() => {})}
              className="space-y-1.5"
            >
              <AnimatePresence initial={false}>
                {cards.map((card, index) => {
                  const isCurrentActive =
                    (activeCardId && card.id ? card.id === activeCardId : false) ||
                    (activeIndex !== undefined && activeIndex === index);

                  return (
                    <DeckEditorOutlineItem
                      key={card.id || `outline-card-${index}`}
                      card={card}
                      index={index}
                      isCurrentActive={isCurrentActive}
                      canRemove={cards.length > 1}
                      onSelectCard={onSelectCard}
                      onRemoveCard={onRemoveCard}
                      onGrabCardHandle={onGrabCardHandle}
                    />
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>

        {/* 목차 하단 빠른 퀵 액션 */}
        <div className="pt-2 border-t border-border/70 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={onAddCard}
            className="w-full py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs font-semibold text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 카드 추가하기</span>
          </button>
        </div>
      </aside>
    );
  }
);

DeckEditorOutline.displayName = 'DeckEditorOutline';
