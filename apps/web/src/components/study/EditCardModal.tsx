import React, { useState, useEffect } from 'react';
import { Card as CardType } from '../../types';
import { Modal } from '../common/Modal';
import { RichTextEditor } from '../editor/RichTextEditor';
import { isRichTextEmpty } from '../../utils/cardValidation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, Trash2, AlertCircle } from 'lucide-react';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType | null;
  onSave: (updates: { termRichText: string; definitionRichText: string }) => void;
  onDelete?: () => void;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({
  isOpen,
  onClose,
  card,
  onSave,
  onDelete,
}) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 모달이 열리거나 대상 카드가 바뀔 때 상태 동기화
  useEffect(() => {
    if (isOpen && card) {
      setTerm(card.termRichText || '');
      setDefinition(card.definitionRichText || '');
      setErrorMessage(null);
    }
  }, [isOpen, card]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isRichTextEmpty(term) && isRichTextEmpty(definition)) {
      setErrorMessage('앞면 또는 뒷면 내용 중 최소 하나는 입력해야 합니다.');
      return;
    }

    onSave({
      termRichText: term,
      definitionRichText: definition,
    });
  };

  if (!card) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="카드 내용 수정"
      icon={<Pencil className="w-5 h-5 text-primary" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 앞면 편집 영역 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                앞면 <span className="text-muted-foreground font-normal">(개념 / 질문)</span>
              </span>
              <Badge variant="secondary" className="text-[10px] font-medium py-0">
                앞면
              </Badge>
            </div>
            <RichTextEditor
              value={term}
              onChange={(html) => {
                setTerm(html);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="단어, 질문 또는 핵심 키워드를 입력하세요..."
              height="150px"
              autoFocus
            />
          </div>

          {/* 뒷면 편집 영역 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                뒷면 <span className="text-muted-foreground font-normal">(정의 / 해설)</span>
              </span>
              <Badge variant="warning" className="text-[10px] font-medium py-0">
                뒷면
              </Badge>
            </div>
            <RichTextEditor
              value={definition}
              onChange={(html) => {
                setDefinition(html);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="상세 설명, 해설, 정답을 입력하세요..."
              height="150px"
            />
          </div>
        </div>

        {/* 하단 모달 액션 버튼 바 */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 text-xs font-medium"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                카드 삭제
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-medium"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="h-8 text-xs font-semibold shadow-xs"
            >
              저장하기
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
