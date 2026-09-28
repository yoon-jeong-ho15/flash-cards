import React, { forwardRef } from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      leftIcon,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}

        <ShadcnInput
          ref={ref}
          id={inputId}
          required={required}
          leftIcon={leftIcon}
          error={error}
          className={cn(className)}
          {...rest}
        />

        {error ? (
          <p className="text-xs text-destructive font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { ShadcnInput };
