import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const DialogTitleContext = React.createContext<string | undefined>(undefined);

export interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const titleId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  useDialogFocus(containerRef, open, () => onOpenChange?.(false));

  if (!open) return null;

  return createPortal(
    <DialogTitleContext.Provider value={titleId}>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        {children}
      </div>
    </DialogTitleContext.Provider>,
    document.body
  );
};

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClose?: () => void;
    showClose?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, children, onClose, showClose = true, maxWidth = 'md', ...props }, ref) => {
  const titleId = React.useContext(DialogTitleContext);
  const maxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'relative z-50 grid max-h-[calc(100dvh-2rem)] w-full gap-4 overflow-y-auto overscroll-contain border border-border bg-card p-6 shadow-xl rounded-2xl',
        maxWidthMap[maxWidth],
        className
      )}
      {...props}
    >
      {children}
      {showClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-opacity hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left pr-8', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2 gap-2 sm:gap-0',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const titleId = React.useContext(DialogTitleContext);
  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-foreground flex items-center gap-2',
        className
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';
