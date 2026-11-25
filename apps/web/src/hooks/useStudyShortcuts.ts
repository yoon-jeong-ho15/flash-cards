import { useEffect } from 'react';

interface UseStudyShortcutsOptions {
  isFinishModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isEditModalOpen: boolean;
  canEdit: boolean;
  onCloseFinishModal: () => void;
  onCloseDeleteModal: () => void;
  onCloseEditModal: () => void;
  onOpenEditModal: () => void;
  onFlip: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleKnow: () => void;
  onExit: () => void;
}

const isEditableTarget = (target: HTMLElement | null): boolean =>
  Boolean(
    target &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
  );

const isInteractiveControl = (target: HTMLElement | null): boolean =>
  Boolean(target?.closest?.('button, a, [role="button"]'));

/** Connects browser keyboard shortcuts to study session actions and modal priority. */
export const useStudyShortcuts = ({
  isFinishModalOpen,
  isDeleteModalOpen,
  isEditModalOpen,
  canEdit,
  onCloseFinishModal,
  onCloseDeleteModal,
  onCloseEditModal,
  onOpenEditModal,
  onFlip,
  onPrevious,
  onNext,
  onToggleKnow,
  onExit,
}: UseStudyShortcutsOptions) => {
  useEffect(() => {
    const modalHandlers: Array<[boolean, () => void]> = [
      [isFinishModalOpen, onCloseFinishModal],
      [isDeleteModalOpen, onCloseDeleteModal],
      [isEditModalOpen, onCloseEditModal],
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;

      for (const [isOpen, closeModal] of modalHandlers) {
        if (!isOpen) continue;
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]')) return;
      if (isEditableTarget(target)) return;
      if ((e.key === 'Enter' || e.key === ' ') && isInteractiveControl(target)) return;

      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        onFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onToggleKnow();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (canEdit) {
          onOpenEditModal();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFinishModalOpen,
    isDeleteModalOpen,
    isEditModalOpen,
    canEdit,
    onCloseFinishModal,
    onCloseDeleteModal,
    onCloseEditModal,
    onOpenEditModal,
    onFlip,
    onPrevious,
    onNext,
    onToggleKnow,
    onExit,
  ]);
};
