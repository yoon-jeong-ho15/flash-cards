import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageWithSkeletonProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  skeletonClassName?: string;
  showIcon?: boolean;
  /**
   * 테스트 및 확인용 최소 스켈레톤 유지 시간 (밀리초).
   * 로컬 Base64 이미지나 캐시 환경에서도 스켈레톤 펄스 동작을 직접 눈으로 확인할 수 있도록
   * 기본값으로 1500ms가 설정되어 있습니다. (실운영 배포 시 0으로 변경 가능)
   */
  minDelayMs?: number;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt = '',
  className,
  containerClassName,
  skeletonClassName,
  showIcon = true,
  minDelayMs = 0,
  onClick,
  title,
  loading = 'lazy',
  ...rest
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isImageReadyRef = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    isImageReadyRef.current = false;

    // 이미지가 이미 캐시되어 완료된 상태인지 확인
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        isImageReadyRef.current = true;
      } else if (src) {
        setIsLoading(false);
        setHasError(true);
        return;
      }
    }

    // minDelayMs 이후에 이미지가 준비되었으면 로딩 종료
    const timer = setTimeout(() => {
      if (isImageReadyRef.current) {
        setIsLoading(false);
      }
    }, minDelayMs);

    return () => clearTimeout(timer);
  }, [src, minDelayMs]);

  const handleImageLoad = () => {
    isImageReadyRef.current = true;
    if (minDelayMs <= 0) {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      onClick={onClick}
      title={title}
    >
      {/* 이미지 로딩 중 스켈레톤 UI */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center bg-muted animate-pulse',
            skeletonClassName
          )}
        >
          {showIcon && (
            <ImageIcon className="w-5 h-5 text-muted-foreground/40 animate-pulse" />
          )}
        </div>
      )}

      {/* 이미지 로드 실패 시 에러 폴백 UI */}
      {hasError ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center w-full h-full text-muted-foreground/50 bg-muted/40 p-2 text-center',
            skeletonClassName
          )}
          title="이미지를 불러올 수 없습니다"
        >
          <ImageOff className="w-4 h-4 text-muted-foreground/40 mb-0.5" />
          <span className="text-[10px] text-muted-foreground/60">이미지 오류</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          {...rest}
        />
      )}
    </div>
  );
};
