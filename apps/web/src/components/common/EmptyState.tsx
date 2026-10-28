import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-input bg-card/70 px-6 py-12 sm:p-16 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="flex items-center justify-center gap-3">{action}</div>}
    </div>
  );
};
