import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StickyActionBarProps {
  onBack?: () => void;
  backLabel?: string;
  backTitle?: string;
  iconOnlyBack?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  onBack,
  backLabel = '뒤로 가기',
  backTitle,
  iconOnlyBack = false,
  title,
  description,
  left,
  right,
  children,
  className,
  contentClassName,
}) => {
  return (
    <div
      className={cn(
        'sticky top-14 sm:top-16 z-30 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-2xs',
        className
      )}
    >
      <div
        className={cn(
          'max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4',
          contentClassName
        )}
      >
        {/* 좌측 영역 */}
        {left ? (
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">{left}</div>
        ) : onBack || title ? (
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size={iconOnlyBack ? 'icon' : 'sm'}
                onClick={onBack}
                leftIcon={iconOnlyBack ? undefined : <ArrowLeft className="w-4 h-4" />}
                className={cn(
                  'text-muted-foreground hover:text-foreground shrink-0',
                  iconOnlyBack && 'h-8 w-8'
                )}
                title={backTitle || backLabel}
              >
                {iconOnlyBack ? (
                  <ArrowLeft className="w-5 h-5" />
                ) : (
                  <span>{backLabel}</span>
                )}
              </Button>
            )}

            {(title || description) && (
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                ) : (
                  title
                )}
                {description && (
                  typeof description === 'string' ? (
                    <p className="text-xs text-muted-foreground hidden sm:block truncate">
                      {description}
                    </p>
                  ) : (
                    description
                  )
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* 우측 액션 영역 */}
        {right ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{right}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
