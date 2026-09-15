import React, { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { FolderModal } from './FolderModal';
import { DeckCard } from '../deck/DeckCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Folder,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  Layers,
  Calendar,
} from 'lucide-react';

interface FolderDetailViewProps {
  folderId: string;
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeckInFolder: (folderId: string) => void;
  onBack: () => void;
}

export const FolderDetailView: React.FC<FolderDetailViewProps> = ({
  folderId,
  onNavigateDeck,
  onStartStudy,
  onCreateDeckInFolder,
  onBack,
}) => {
  const { folders, decks, cards, deleteFolder } = useFlashcardStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const folder = useMemo(() => folders.find((f) => f.id === folderId), [folders, folderId]);
  const folderDecks = useMemo(() => decks.filter((d) => d.folderId === folderId), [decks, folderId]);

  if (!folder) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">존재하지 않는 폴더입니다.</p>
        <Button variant="default" onClick={onBack}>
          대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteFolder(folder.id, false);
    setShowDeleteConfirm(false);
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-muted-foreground hover:text-foreground"
        >
          <span>대시보드로 돌아가기</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">폴더 수정</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <span className="hidden sm:inline">폴더 삭제</span>
          </Button>
        </div>
      </div>

      {/* 폴더 메인 헤더 Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Folder className="w-5 h-5 fill-primary/20" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              폴더
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {folder.title}
            </h1>
          </div>
        </div>

        {folder.description && (
          <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
            {folder.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Layers className="w-3.5 h-3.5 text-primary" />
            덱 {folderDecks.length}개
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            생성일: {new Date(folder.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card>

      {/* 소속 덱 목록 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground tracking-tight">소속 카드 덱</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {folderDecks.length}
          </Badge>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => onCreateDeckInFolder(folder.id)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          이 폴더에 새 덱 추가
        </Button>
      </div>

      {folderDecks.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-6 h-6 text-muted-foreground" />}
          title="이 폴더에 아직 덱이 없습니다."
          description="새로운 플래시카드 덱을 만들어 추가해 보세요."
          action={
            <Button
              variant="default"
              size="sm"
              onClick={() => onCreateDeckInFolder(folder.id)}
            >
              새 덱 만들기
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {folderDecks.map((deck) => {
            const deckCards = cards.filter((c) => c.deckId === deck.id);
            const learned = deckCards.filter((c) => c.learned).length;

            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                cardsCount={deckCards.length}
                learnedCount={learned}
                showFolderBadge={false}
                onNavigateDeck={onNavigateDeck}
                onStartStudy={onStartStudy}
              />
            );
          })}
        </div>
      )}

      {/* 폴더 수정 모달 */}
      {showEditModal && (
        <FolderModal
          folderId={folder.id}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* 폴더 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="폴더 삭제"
        message={`'${folder.title}' 폴더를 삭제하시겠습니까?\n폴더 안의 덱들은 삭제되지 않고 미분류(루트)로 안전하게 이동됩니다.`}
        confirmText="폴더 삭제"
        isDanger={true}
      />
    </div>
  );
};
