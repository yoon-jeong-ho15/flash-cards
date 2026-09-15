import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        maxWidth={maxWidth}
        onClose={onClose}
        showClose={showCloseButton}
      >
        <DialogHeader>
          <DialogTitle>
            {icon}
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
