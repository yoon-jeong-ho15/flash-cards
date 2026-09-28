import React, { useState } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Folder, FolderX, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MoveDeckModalProps {
  deckId: string;
  currentFolderId?: string | null;
  onClose: () => void;
}

export const MoveDeckModal: React.FC<MoveDeckModalProps> = ({
  deckId,
  currentFolderId,
  onClose,
}) => {
  const { folders, moveDeck } = useFlashcardStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);

  const handleSave = () => {
    moveDeck(deckId, selectedFolderId);
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="덱 폴더 이동"
      icon={<Folder className="w-5 h-5 text-primary" />}
      maxWidth="md"
    >
      <p className="text-sm text-muted-foreground mb-4">
        덱을 보관할 폴더를 선택하세요. 미분류를 선택하면 루트 대시보드에 위치합니다.
      </p>

      <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-1">
        {/* 미분류 (루트) 옵션 */}
        <button
          type="button"
          onClick={() => setSelectedFolderId(null)}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-lg border text-sm text-left transition-all cursor-pointer',
            selectedFolderId === null
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border hover:border-border/80 hover:bg-muted/50 text-foreground'
          )}
        >
          <div className="flex items-center gap-2.5">
            <FolderX className="w-4 h-4 text-muted-foreground" />
            <span>미분류 (루트 대시보드)</span>
          </div>
          {selectedFolderId === null && <Check className="w-4 h-4 text-primary" />}
        </button>

        {/* 등록된 폴더 목록 */}
        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg border text-sm text-left transition-all cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border hover:border-border/80 hover:bg-muted/50 text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Folder className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{f.title}</span>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button variant="default" size="sm" onClick={handleSave}>
          이동 완료
        </Button>
      </div>
    </Modal>
  );
};
