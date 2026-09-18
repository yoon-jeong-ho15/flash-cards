import React from 'react';
import { CheckCircle2, Clock, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StudyProgressBarProps {
  totalUniqueCards: number;
  masteredCount: number;
  remainingQueueCount: number;
  round: number;
  className?: string;
}

export const StudyProgressBar: React.FC<StudyProgressBarProps> = ({
  totalUniqueCards,
  masteredCount,
  remainingQueueCount,
  round,
  className,
}) => {
  const percentage = totalUniqueCards > 0
    ? Math.round((masteredCount / totalUniqueCards) * 100)
    : 0;

  return (
    <Card className={cn('w-full max-w-2xl mx-auto p-4', className)}>
      {/* 상단 통계 수치 및 라운드 표시 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-medium mb-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="warning" className="gap-1.5 font-medium py-1">
            <Clock className="w-3.5 h-3.5" />
            <span>학습 중: <strong className="font-mono">{remainingQueueCount}</strong></span>
          </Badge>

          <Badge variant="success" className="gap-1.5 font-medium py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>완료: <strong className="font-mono">{masteredCount}</strong> / {totalUniqueCards}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {round > 1 && (
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <Layers className="w-3 h-3 text-primary" />
              Round {round}
            </Badge>
          )}
          <span className="text-foreground font-semibold font-mono text-xs sm:text-sm">
            {percentage}%
          </span>
        </div>
      </div>

      {/* 진행률 바 */}
      <Progress value={percentage} className="h-2" />
    </Card>
  );
};
