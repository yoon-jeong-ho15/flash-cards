import React from 'react';
import { Home, Layers, Folder, Plus } from 'lucide-react';
import type { ViewMode } from '../../types';
import { cn } from '@/lib/utils';

export function BottomNavigation({
  currentView,
  onHome,
  onDecks,
  onFolders,
  onCreate,
}: {
  currentView: ViewMode;
  onHome: () => void;
  onDecks: () => void;
  onFolders: () => void;
  onCreate: () => void;
}) {
  const active =
    currentView.type === 'dashboard'
      ? 'home'
      : ['folder', 'all-folders'].includes(currentView.type)
        ? 'folders'
        : 'decks';
  return (
    <nav
      aria-label="빠른 탐색"
      className="mobile-nav fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card/95 px-3 pt-2 backdrop-blur-xl lg:hidden"
    >
      {[
        { id: 'home', label: '홈', icon: Home, action: onHome },
        { id: 'decks', label: '라이브러리', icon: Layers, action: onDecks },
        { id: 'folders', label: '폴더', icon: Folder, action: onFolders },
        { id: 'create', label: '만들기', icon: Plus, action: onCreate },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.action}
          aria-current={active === item.id ? 'page' : undefined}
          className="flex min-h-14 min-w-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium"
        >
          <span
            className={cn(
              'flex h-8 w-12 items-center justify-center rounded-xl',
              item.id === 'create'
                ? 'bg-primary text-white'
                : active === item.id
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
          </span>
          <span className={active === item.id ? 'font-bold text-primary' : 'text-muted-foreground'}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
