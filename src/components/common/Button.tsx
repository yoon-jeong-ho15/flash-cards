import React, { forwardRef } from 'react';
import { Button as ShadcnButton, ButtonProps as ShadcnButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'default' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'default';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className,
      ...props
    },
    ref
  ) => {
    // Map legacy variants to shadcn
    let mappedVariant: ShadcnButtonProps['variant'] = 'default';
    if (variant === 'primary' || variant === 'default') mappedVariant = 'default';
    else if (variant === 'danger' || variant === 'destructive') mappedVariant = 'destructive';
    else if (variant === 'secondary') mappedVariant = 'secondary';
    else if (variant === 'outline') mappedVariant = 'outline';
    else if (variant === 'ghost') mappedVariant = 'ghost';
    else if (variant === 'link') mappedVariant = 'link';

    // Map legacy sizes to shadcn
    let mappedSize: ShadcnButtonProps['size'] = 'default';
    if (size === 'sm') mappedSize = 'sm';
    else if (size === 'lg') mappedSize = 'lg';
    else if (size === 'icon') mappedSize = 'icon';
    else mappedSize = 'default';

    return (
      <ShadcnButton
        ref={ref}
        variant={mappedVariant}
        size={mappedSize}
        className={cn(fullWidth && 'w-full', className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
export { ShadcnButton };
