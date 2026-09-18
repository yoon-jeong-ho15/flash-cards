import React from 'react';
import { Card as CardType } from '../../types';
import { RichTextViewer } from '../editor/RichTextViewer';
import { RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FlashcardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  card,
  isFlipped,
  onFlip,
}) => {
  const backImage = card.backImageUrl || card.imageUrl;

  return (
    <div
      className="perspective-1200 w-full max-w-2xl h-[420px] sm:h-[460px] mx-auto select-none cursor-pointer group"
      onClick={onFlip}
    >
      <div
        className={`relative w-full h-full duration-300 ease-out transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* 앞면 (Term / 단어 & 이미지) */}
        <div className="card-face-front bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 transition-colors p-6 sm:p-8 flex flex-col justify-between">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between shrink-0">
            <Badge variant="secondary" className="text-xs font-medium">
              앞면 · 개념 / 질문
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              뒤집기
            </Button>
          </div>

          {/* 중앙 내용 (앞면) - my-auto prevents top content clipping when overflowing */}
          <div className="flex-1 flex flex-col px-4 overflow-y-auto max-h-[300px] w-full">
            <div className="my-auto w-full text-center">
              {card.frontImageUrl && (
                <div
                  className="mb-4 max-h-40 inline-block rounded-xl overflow-hidden border border-border bg-muted/40 p-1 cursor-zoom-in hover:opacity-90 transition-opacity mx-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(card.frontImageUrl, '_blank');
                  }}
                  title="클릭하여 원본 이미지 보기"
                >
                  <img
                    src={card.frontImageUrl}
                    alt="앞면 문제/개념 이미지"
                    className="max-h-36 object-contain rounded-lg mx-auto"
                  />
                </div>
              )}

              <div className="w-full text-center">
                <RichTextViewer
                  html={card.termRichText}
                  textSize="2xl"
                  className="text-center font-bold tracking-tight text-foreground"
                />
              </div>
            </div>
          </div>

          {/* 하단 힌트 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-3 border-t border-border/80 shrink-0">
            <span>
              {card.frontImageUrl ? (
                <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                  <ImageIcon className="w-3 h-3" /> 이미지 첨부됨
                </span>
              ) : (
                <span />
              )}
            </span>
            <span>
              <span className="md:hidden">터치하여 정답 확인</span>
              <span className="hidden md:inline">
                클릭하거나{' '}
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Space
                </kbd>
                를 눌러 정답 확인
              </span>
            </span>
          </div>
        </div>

        {/* 뒷면 (Definition / 정의 & 이미지) */}
        <div className="card-face-back bg-card rounded-2xl border border-primary/40 shadow-sm hover:border-primary/60 transition-colors p-6 sm:p-8 flex flex-col justify-between">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between shrink-0">
            <Badge variant="warning" className="text-xs font-medium">
              뒷면 · 정의 / 해설
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              앞면 보기
            </Button>
          </div>

          {/* 중앙 내용 (뒷면 텍스트 & 이미지) - my-auto prevents top clipping */}
          <div className="flex-1 flex flex-col px-4 overflow-y-auto max-h-[300px] w-full">
            <div className="my-auto w-full text-center">
              {backImage && (
                <div
                  className="mb-4 max-h-40 inline-block rounded-xl overflow-hidden border border-border bg-muted/40 p-1 cursor-zoom-in hover:opacity-90 transition-opacity mx-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(backImage, '_blank');
                  }}
                  title="클릭하여 원본 이미지 보기"
                >
                  <img
                    src={backImage}
                    alt="카드 설명 이미지"
                    className="max-h-36 object-contain rounded-lg mx-auto"
                  />
                </div>
              )}

              <div className="w-full text-center">
                <RichTextViewer
                  html={card.definitionRichText}
                  textSize="lg"
                  className="text-foreground leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* 하단 힌트 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-3 border-t border-border/80 shrink-0">
            <span>
              {backImage ? (
                <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                  <ImageIcon className="w-3 h-3" /> 이미지 첨부됨
                </span>
              ) : (
                <span />
              )}
            </span>
            <span>다시 클릭하여 앞면으로 뒤집기</span>
          </div>
        </div>
      </div>
    </div>
  );
};
