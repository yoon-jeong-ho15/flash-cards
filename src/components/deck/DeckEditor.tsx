import React from 'react';
import { DeckCardEditorItem } from './DeckCardEditorItem';
import { useDeckEditor } from '../../hooks/useDeckEditor';
import {
  Plus,
  Save,
  Folder as FolderIcon,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { StickyActionBar } from '../common/StickyActionBar';
import { Reorder, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeckEditorProps {
  deckId?: string;
  initialFolderId?: string;
  focusCardId?: string;
  onClose: () => void;
  onSaved: (savedDeckId: string) => void;
}

export const DeckEditor: React.FC<DeckEditorProps> = ({
  deckId,
  initialFolderId,
  focusCardId,
  onClose,
  onSaved,
}) => {
  const {
    folders,
    title,
    setTitle,
    description,
    setDescription,
    selectedFolderId,
    setSelectedFolderId,
    cardItems,
    newlyAddedCardId,
    errors,
    setErrors,
    handleAddCard,
    handleInsertCard,
    handleRemoveCard,
    handleDuplicateCard,
    handleMoveUp,
    handleMoveDown,
    handleReorderCards,
    handleUpdateCard,
    handleSave,
  } = useDeckEditor({ deckId, initialFolderId, focusCardId, onSaved });

  return (
    <div className="relative">
      {/* 상단 Sticky 메뉴바 */}
      <StickyActionBar
        onBack={onClose}
        iconOnlyBack
        backTitle="취소하고 뒤로 가기"
        title={deckId ? '덱 수정하기' : '새 플래시카드 덱 만들기'}
        description="앞면에는 핵심 키워드/단어, 뒷면에는 상세 설명과 이미지를 등록하세요."
        right={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save className="w-4 h-4" />}
              className="font-semibold shadow-xs"
            >
              <span>저장하기</span>
            </Button>
          </>
        }
      />

      {/* 본문 콘텐츠 컨테이너 */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">

      {errors.general && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* 덱 메타데이터 설정 (제목, 설명, 폴더) */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <Label required>덱 제목</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder='예: "수능 한국사 빈출 개념", "생명과학 I 핵심 요약", "수능 필수 영단어"'
            error={errors.title}
            autoFocus={!focusCardId && !deckId}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive font-medium">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>설명 (선택)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="덱에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5 text-muted-foreground" />
              소속 폴더 (선택)
            </Label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value ? e.target.value : null)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
            >
              <option value="">미분류 (루트 대시보드)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 카드 리스트 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground tracking-tight">카드 목록</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {cardItems.length}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCard}
            leftIcon={<Plus className="w-4 h-4 text-primary" />}
          >
            <span>카드 추가</span>
          </Button>
        </div>

        <Reorder.Group
          axis="y"
          values={cardItems}
          onReorder={handleReorderCards}
          className="space-y-0"
        >
          <AnimatePresence initial={false}>
            {cardItems.map((card, index) => (
              <DeckCardEditorItem
                key={card.id || `temp-${index}`}
                index={index}
                card={card}
                totalCards={cardItems.length}
                autoFocusFront={card.id === focusCardId || card.id === newlyAddedCardId}
                isTargetFocus={card.id === focusCardId}
                onUpdate={handleUpdateCard}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDuplicate={handleDuplicateCard}
                onRemove={handleRemoveCard}
                onInsertAfter={(idx) => handleInsertCard(idx + 1)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* 하단 카드 추가 큰 버튼 */}
        <button
          type="button"
          onClick={handleAddCard}
          className="w-full py-4 rounded-xl border border-dashed border-border hover:border-primary/50 bg-card hover:bg-muted/30 text-primary font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ 새 카드 추가하기</span>
        </button>
      </div>

      {/* 하단 저장 바 */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
        <Button
          variant="outline"
          size="default"
          onClick={onClose}
        >
          취소
        </Button>
        <Button
          variant="default"
          size="default"
          onClick={handleSave}
          leftIcon={<Save className="w-4 h-4" />}
          className="font-semibold shadow-xs"
        >
          <span>{deckId ? '변경사항 저장하기' : '덱 만들기 완료'}</span>
        </Button>
      </div>

      {/* 팁 안내문 */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2.5 leading-relaxed">
        <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">작성 팁:</span> 앞면에는 핵심 단어나 문제를,
          뒷면에는 정답과 상세한 해설을 적어보세요. 서식 툴바를 이용해 굵은 글씨, 형광펜, 목록 등을
          활용하면 복습 효율이 극대화됩니다.
        </div>
      </div>
    </div>
  </div>
);
};
