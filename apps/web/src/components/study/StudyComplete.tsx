import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Deck } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StudyCompleteProps {
  deck: Deck;
  totalCards: number;
  difficultCardsCount: number;
  roundCount: number;
  onRestartAll: () => void;
  onRestartDifficultOnly: () => void;
  onBackToDeck: () => void;
}

export const StudyComplete: React.FC<StudyCompleteProps> = ({
  deck,
  totalCards,
  difficultCardsCount,
  roundCount,
  onRestartAll,
  onRestartDifficultOnly,
  onBackToDeck,
}) => {
  useEffect(() => {
    // 축하 컨페티 효과 실행
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4f46e5', '#38bdf8', '#10b981', '#f59e0b'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4f46e5', '#38bdf8', '#10b981', '#f59e0b'],
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const firstTryMastered = Math.max(0, totalCards - difficultCardsCount);
  const accuracyRate = totalCards > 0 ? Math.round((firstTryMastered / totalCards) * 100) : 100;

  return (
    <div className="max-w-xl mx-auto py-10 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* 트로피 아이콘 */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs mb-6">
        <Trophy className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
        학습을 완료했습니다! 🎉
      </h1>
      <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
        <strong>&lsquo;{deck.title}&rsquo;</strong> 덱의 모든 카드를 성공적으로 마스터했습니다.
      </p>

      {/* 통계 요약 3열 그리드 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <span className="block text-2xl font-bold font-mono text-emerald-600">
              {totalCards}
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">
              완료 카드 수
            </span>
          </CardContent>
        </Card>

        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <span className="block text-2xl font-bold font-mono text-primary">
              {accuracyRate}%
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">
              첫 시도 정답률
            </span>
          </CardContent>
        </Card>

        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <span className="block text-2xl font-bold font-mono text-amber-600">
              {roundCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">
              진행 라운드
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 액션 버튼 영역 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {difficultCardsCount > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={onRestartDifficultOnly}
            leftIcon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            className="w-full sm:w-auto border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100/80"
          >
            틀렸던 카드만 다시 풀기 ({difficultCardsCount}개)
          </Button>
        )}

        <Button
          variant="default"
          size="lg"
          onClick={onRestartAll}
          leftIcon={<RotateCcw className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          전체 다시 학습하기
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={onBackToDeck}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          덱으로 돌아가기
        </Button>
      </div>
    </div>
  );
};
