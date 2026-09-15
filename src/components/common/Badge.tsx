import React from 'react';
import { Badge as ShadcnBadge, BadgeProps as ShadcnBadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'secondary' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
  ...rest
}) => {
  let mappedVariant: ShadcnBadgeProps['variant'] = 'default';
  if (variant === 'indigo') mappedVariant = 'indigo';
  else if (variant === 'emerald') mappedVariant = 'success';
  else if (variant === 'amber') mappedVariant = 'warning';
  else if (variant === 'rose') mappedVariant = 'destructive';
  else if (variant === 'slate') mappedVariant = 'slate';
  else if (variant === 'secondary') mappedVariant = 'secondary';
  else if (variant === 'outline') mappedVariant = 'outline';
  else mappedVariant = 'default';

  return (
    <ShadcnBadge
      variant={mappedVariant}
      icon={icon}
      className={cn(
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
      {...rest}
    >
      {children}
    </ShadcnBadge>
  );
};
export { ShadcnBadge };
