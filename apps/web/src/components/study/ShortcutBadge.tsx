import React from 'react';
import { Keyboard } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ShortcutBadgeProps {
  className?: string;
}

export const ShortcutBadge: React.FC<ShortcutBadgeProps> = ({ className }) => {
  const kbdClass =
    'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground shadow-2xs';

  return (
    <div
      className={cn(
        'hidden md:flex flex-wrap items-center justify-center gap-4 py-3 text-xs text-muted-foreground select-none',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">단축키:</span>
      </div>

      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>Space</kbd>
        <span>뒤집기</span>
      </div>

      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>←</kbd>
        <span>알아요</span>
      </div>

      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>→</kbd>
        <span>몰라요</span>
      </div>

      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>Esc</kbd>
        <span>종료</span>
      </div>
    </div>
  );
};
