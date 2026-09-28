import React, { useState, useEffect } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Folder } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FolderModalProps {
  folderId?: string; // 없으면 신규 생성
  onClose: () => void;
  onSaved?: (folderId: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  folderId,
  onClose,
  onSaved,
}) => {
  const { folders, addFolder, updateFolder } = useFlashcardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderId) {
      const existing = folders.find((f) => f.id === folderId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description || '');
      }
    }
  }, [folderId, folders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('폴더 제목을 입력해 주세요.');
      return;
    }

    let savedId: string;
    if (folderId) {
      updateFolder(folderId, { title: trimmedTitle, description: description.trim() });
      savedId = folderId;
    } else {
      savedId = addFolder(trimmedTitle, description.trim());
    }

    if (onSaved) onSaved(savedId);
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={folderId ? '폴더 수정' : '새 폴더 생성'}
      icon={<Folder className="w-5 h-5 text-primary" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label required>폴더 이름</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder='예: "수능 영어", "한국사 필수 개념", "통합과학"'
            autoFocus
            error={error || undefined}
          />
          {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
        </div>

        <div>
          <Label>설명 (선택)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="폴더에 대한 간단한 설명"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="default" size="sm">
            {folderId ? '수정 완료' : '폴더 만들기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
