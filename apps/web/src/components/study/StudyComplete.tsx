import React from 'react';
import { Check, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { Deck } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StudyCompleteProps {
  deck: Pick<Deck, 'title'>;
  sourceType?: '덱' | '폴더';
  totalCards: number;
  difficultCardsCount: number;
  roundCount: number;
  onRestartAll: () => void;
  onRestartDifficultOnly: () => void;
  onBackToDeck: () => void;
  onContinue?: () => void;
}
export const StudyComplete: React.FC<StudyCompleteProps> = ({
  deck,
  sourceType = '덱',
  totalCards,
  difficultCardsCount,
  roundCount,
  onRestartAll,
  onRestartDifficultOnly,
  onBackToDeck,
  onContinue,
}) => {
  const known = Math.max(0, totalCards - difficultCardsCount);
  const progress = totalCards ? Math.round((known / totalCards) * 100) : 0;
  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-center sm:py-16">
      <div className="mx-auto mb-7 flex h-24 w-24 -rotate-6 items-center justify-center rounded-[32px] bg-secondary text-primary">
        <Check className="h-12 w-12" />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {deck.title} · {roundCount}회차
      </p>
      <h1 className="page-title">
        {difficultCardsCount ? '오늘도 한 걸음 나아갔어요' : '모두 기억했어요!'}
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        반복할수록 더 오래 기억할 수 있어요.
        <br />
        이번 회차에서 쌓은 배움을 확인해 보세요.
      </p>
      <Card className="my-8 p-7">
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#6155e8 ${progress}%, #eeecff 0)`,
          }}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold">
            {progress}
            <span className="ml-0.5 text-xs text-muted-foreground">%</span>
          </span>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">이번 회차 카드 {totalCards}장</p>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div>
            <p className="text-3xl font-bold tabular-nums text-emerald-700">{known}</p>
            <p className="mt-2 text-xs text-muted-foreground">기억했어요</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-[#ba7549]">{difficultCardsCount}</p>
            <p className="mt-2 text-xs text-muted-foreground">다시 볼 카드</p>
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {difficultCardsCount > 0 && (
          <Button
            size="lg"
            className="w-full"
            onClick={onRestartDifficultOnly}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            미학습 카드 다시 학습
          </Button>
        )}
        <Button
          size="lg"
          variant={difficultCardsCount ? 'secondary' : 'default'}
          className="w-full"
          onClick={onRestartAll}
          leftIcon={<RotateCcw className="h-4 w-4" />}
        >
          전체 카드 다시 학습
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onBackToDeck}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          {sourceType === '폴더' ? '폴더' : '학습 세트'}로 돌아가기
        </Button>
        {onContinue && (
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            onClick={onContinue}
          >
            마지막 카드 다시 확인하기
          </Button>
        )}
      </div>
    </div>
  );
};
