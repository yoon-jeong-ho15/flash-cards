import React, { useState, useCallback, useEffect } from 'react';
import { DeckCardEditorItem } from './DeckCardEditorItem';
import { DeckEditorOutline } from './DeckEditorOutline';
import {
  useDeckEditor,
  formatDraftTime,
  formatDraftFullDateTime,
} from '../../hooks/useDeckEditor';
import {
  Plus,
  Save,
  Folder as FolderIcon,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { StickyActionBar } from '../common/StickyActionBar';
import { ConfirmModal } from '../common/ConfirmModal';
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
    hasExternalChanges,
    reloadOriginal,
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
    handleInsertCardAfter,
    handleRemoveCard,
    handleDuplicateCard,
    handleMoveUp,
    handleMoveDown,
    handleReorderCards,
    handleUpdateCard,
    handleSave,
    lastSavedAt,
    showDraftRestoreModal,
    draftSavedAt,
    handleRestoreDraft,
    handleDiscardDraft,
    clearDraft,
  } = useDeckEditor({ deckId, initialFolderId, focusCardId, onSaved });

  // 좌측 카드 목차에서 선택된 인덱스 및 활성 카드 상태
  const [activeCardId, setActiveCardId] = useState<string | undefined>(focusCardId);
  const [activeOutlineIndex, setActiveOutlineIndex] = useState<number | undefined>(() => {
    if (focusCardId) {
      const idx = cardItems.findIndex((c) => c.id === focusCardId);
      return idx !== -1 ? idx : undefined;
    }
    return undefined;
  });
  const [highlightCardId, setHighlightCardId] = useState<string | undefined>(focusCardId);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleRequestClose = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleConfirmClose = useCallback(() => {
    setShowCancelConfirm(false);
    clearDraft();
    onClose();
  }, [clearDraft, onClose]);

  // 목차 항목이 뷰포트 안에 보이도록 스크롤하는 헬퍼
  const scrollOutlineIntoView = useCallback((index: number) => {
    const outlineEl = document.getElementById(`outline-card-${index}`);
    if (outlineEl) {
      outlineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  // 카드 목록(cardItems) 변경 시(순서 이동, 추가, 삭제 등) 활성 카드의 인덱스 동기화
  useEffect(() => {
    if (activeCardId) {
      const idx = cardItems.findIndex((c) => c.id === activeCardId);
      if (idx !== -1 && idx !== activeOutlineIndex) {
        setActiveOutlineIndex(idx);
      }
    }
  }, [cardItems, activeCardId, activeOutlineIndex]);

  // 1. 목차에서 카드 클릭 시 (기존 하이라이트 및 스크롤 방식 100% 유지)
  const handleSelectCardFromOutline = useCallback((index: number) => {
    setActiveOutlineIndex(index);
    const targetCard = cardItems[index];
    if (targetCard?.id) {
      setActiveCardId(targetCard.id);
    }
    const targetEl = document.getElementById(`card-editor-${index}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (targetCard?.id) {
        setHighlightCardId(targetCard.id);
        setTimeout(() => {
          setHighlightCardId((prev) => (prev === targetCard.id ? undefined : prev));
        }, 2000);
      }
    }
  }, [cardItems]);

  // 2. 본문 카드에 포커스를 두었을 때
  const handleCardFocus = useCallback((index: number, cardId?: string) => {
    setActiveOutlineIndex((prev) => (prev === index ? prev : index));
    if (cardId) {
      setActiveCardId((prev) => (prev === cardId ? prev : cardId));
    }
    scrollOutlineIntoView(index);
  }, [scrollOutlineIntoView]);

  // 3. 순서를 움직이기 위해 핸들을 잡았을 때
  const handleCardGrab = useCallback((index: number, cardId?: string) => {
    setActiveOutlineIndex(index);
    if (cardId) {
      setActiveCardId(cardId);
    }
    scrollOutlineIntoView(index);
  }, [scrollOutlineIntoView]);

  return (
    <div className="relative">
      {/* 상단 Sticky 메뉴바 */}
      <StickyActionBar
        onBack={handleRequestClose}
        iconOnlyBack
        backTitle="취소하고 뒤로 가기"
        title={deckId ? '덱 수정하기' : '새 플래시카드 덱 만들기'}
        description={
          lastSavedAt
            ? `앞면에는 핵심 키워드/단어, 뒷면에는 상세 설명과 이미지를 등록하세요. · 자동 임시 저장됨 (${formatDraftTime(lastSavedAt)})`
            : "앞면에는 핵심 키워드/단어, 뒷면에는 상세 설명과 이미지를 등록하세요."
        }
        right={
          <>
            {lastSavedAt && (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60 mr-1 select-none"
                title="브라우저에 안전하게 임시 저장되었습니다."
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>임시 저장됨 ({formatDraftTime(lastSavedAt)})</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestClose}
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

      {/* 본문 콘텐츠 컨테이너 (데스크탑: 좌측 목차 + 우측 폼 2열 배치) */}
      <div className="page-container">
        <div className="lg:flex lg:gap-8 lg:items-start">
          {/* 좌측 카드 목차 사이드바 (데스크탑 고정 사이드바) */}
          <div className="hidden lg:block shrink-0 sticky top-[8.75rem] self-start z-20">
            <DeckEditorOutline
              cards={cardItems}
              activeIndex={activeOutlineIndex}
              activeCardId={activeCardId}
              onSelectCard={handleSelectCardFromOutline}
              onReorderCards={handleReorderCards}
              onGrabCardHandle={handleCardGrab}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
            />
          </div>

          {/* 우측 메인 에디터 (기존 카드 폼 100% 유지) */}
          <div className="flex-1 min-w-0 space-y-6">
            {errors.general && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

      {/* 덱 메타데이터 설정 (제목, 설명, 폴더) */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <Label htmlFor="deck-title" required>덱 제목</Label>
          <Input
            id="deck-title"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'deck-title-error' : undefined}
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
            <p id="deck-title-error" role="alert" className="mt-1 text-xs text-destructive font-medium">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deck-description">설명 (선택)</Label>
            <Input
              id="deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="덱에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <div>
            <Label htmlFor="deck-folder" className="flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5 text-muted-foreground" />
              소속 폴더 (선택)
            </Label>
            <select
              id="deck-folder"
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value ? e.target.value : null)}
              className="w-full h-11 rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
            >
              <option value="">미분류</option>
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

        {hasExternalChanges && (
          <div role="status" className="p-3 mb-4 rounded-lg bg-amber-50 text-amber-900 text-sm">
            다른 곳에서 덱이 변경되었습니다. 작성 중인 내용은 유지됩니다. 저장하면 현재 편집 내용이 반영됩니다.
            <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => {
              if (window.confirm('작성 중인 내용을 버리고 최신 저장 내용을 불러올까요?')) reloadOriginal();
            }}>최신 내용 불러오기</Button>
          </div>
        )}

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
                isTargetFocus={card.id === focusCardId || (Boolean(card.id) && card.id === highlightCardId)}
                onUpdate={handleUpdateCard}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDuplicate={handleDuplicateCard}
                onRemove={handleRemoveCard}
                onInsertAfter={handleInsertCardAfter}
                onFocusCard={handleCardFocus}
                onGrabCardHandle={handleCardGrab}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* 하단 카드 추가 큰 버튼 */}
        <button
          type="button"
          tabIndex={-1}
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
          onClick={handleRequestClose}
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
      </div>

      {/* 작성/수정 취소 확인 모달 */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmClose}
        title={deckId ? '덱 수정 취소' : '덱 만들기 취소'}
        message={`정말로 취소하시겠습니까?\n저장하지 않은 모든 변경사항은 복구할 수 없습니다.`}
        confirmText="취소하고 나가기"
        cancelText="계속 작성"
        isDanger={true}
      />

      {/* 작성 중이던 임시 저장본 복원 확인 모달 */}
      <ConfirmModal
        isOpen={showDraftRestoreModal}
        onClose={handleDiscardDraft}
        onConfirm={handleRestoreDraft}
        title="작성 중이던 내용 복원"
        message={`이전에 저장하지 않고 종료된 임시 저장본이 있습니다.\n(저장 일시: ${formatDraftFullDateTime(draftSavedAt)})\n\n임시 저장된 내용을 복원하여 계속 편집하시겠습니까?`}
        confirmText="복원하기"
        cancelText="새로 작성"
        isDanger={false}
      />
    </div>
  );
};
