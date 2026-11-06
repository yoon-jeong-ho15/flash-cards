import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollectionLayout } from '../../hooks/useCollectionLayout';

export function CollectionLayoutToggle() {
  const { layout, setLayout } = useCollectionLayout();
  return (
    <div role="group" aria-label="목록 표시 방식" className="inline-flex shrink-0 flex-nowrap items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {([
        ['grid', LayoutGrid, '그리드'],
        ['list', List, '목록'],
      ] as const).map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} 보기`}
          title={`${label} 보기`}
          aria-pressed={layout === value}
          onClick={() => setLayout(value)}
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-auto md:px-2.5',
            layout === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
