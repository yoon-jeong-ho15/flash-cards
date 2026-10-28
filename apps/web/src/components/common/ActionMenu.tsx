import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionMenuProps {
  label: string;
  actions: { label: string; icon: React.ReactNode; onSelect: () => void; destructive?: boolean }[];
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ label, actions }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outsideClick);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outsideClick);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
      {open && (
        <div
          id={id}
          role="group"
          aria-label={label}
          className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              tabIndex={-1}
              onClick={() => {
                triggerRef.current?.focus();
                setOpen(false);
                action.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-xs hover:bg-muted',
                action.destructive && 'text-destructive hover:bg-destructive/5'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
