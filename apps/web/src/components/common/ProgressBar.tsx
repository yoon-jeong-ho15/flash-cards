import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0 ~ 100
  size?: 'sm' | 'md' | 'lg';
  color?: 'indigo' | 'emerald' | 'amber' | 'gradient';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'sm',
  color = 'indigo',
  showLabel = false,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  const sizeClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }[size];

  const colorClass = {
    indigo: 'bg-primary',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    gradient: 'bg-gradient-to-r from-primary to-indigo-500',
  }[color];

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-1.5">
          <span>진행률</span>
          <span className="text-foreground font-mono">{clampedValue}%</span>
        </div>
      )}
      <Progress
        value={clampedValue}
        className={sizeClass}
        indicatorClassName={colorClass}
      />
    </div>
  );
};
