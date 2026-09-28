import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, RefreshCw, UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { uploadCardImage } from '../../services/storageService';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  imageUrl?: string;
  onImageChange: (url?: string) => void;
  compact?: boolean;
}

type UploadStep = 'compressing' | 'uploading' | null;

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageUrl,
  onImageChange,
  compact = false,
}) => {
  const { user } = useFlashcardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>(null);

  const isProcessing = uploadStep !== null;

  const handleProcessFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_ORIGINAL_SIZE) {
      setError('원본 이미지 크기는 15MB 이하여야 합니다.');
      return;
    }

    try {
      setUploadStep('compressing');
      const compressedFile = await compressImage(file, {
        maxWidth: 1024,
        maxSizeMB: 1,
        quality: 0.8,
      });

      setUploadStep('uploading');
      const publicUrl = await uploadCardImage(compressedFile, user?.uid);

      onImageChange(publicUrl);
    } catch (err: any) {
      console.error('이미지 업로드 실패:', err);
      setError(err?.message || '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setUploadStep(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isProcessing) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={isProcessing}
        className="hidden"
        onChange={handleFileChange}
      />

      {imageUrl ? (
        <div className="relative group rounded-xl border border-border overflow-hidden bg-muted/40 flex items-center justify-center max-h-36 p-1">
          <img
            src={imageUrl}
            alt="카드 첨부 이미지"
            className="max-h-32 object-contain rounded-lg shadow-2xs"
          />

          {/* 업로드/압축 진행 중 오버레이 */}
          {isProcessing ? (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-10">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-[11px] font-medium text-foreground">
                {uploadStep === 'compressing' ? '이미지 최적화 중...' : '스토리지 업로드 중...'}
              </span>
            </div>
          ) : (
            /* 호버 시 액션 오버레이 */
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 bg-background text-foreground"
                title="이미지 교체"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onImageChange(undefined)}
                className="h-8 w-8"
                title="이미지 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : isProcessing ? (
        <div
          className={cn(
            'border border-primary/30 bg-primary/5 rounded-xl flex items-center justify-center text-center select-none',
            compact ? 'py-2 px-3' : 'py-3.5 px-4'
          )}
        >
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span>
              {uploadStep === 'compressing'
                ? '이미지 압축 중 (WebP 최적화)...'
                : '스토리지 업로드 중...'}
            </span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border border-dashed rounded-xl cursor-pointer transition-all flex items-center justify-center text-center',
            compact ? 'py-2 px-3' : 'py-3 px-4',
            isDragging
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground'
          )}
        >
          <div className="flex items-center gap-2 text-xs">
            {isDragging ? (
              <>
                <UploadCloud className="w-4 h-4 text-primary animate-bounce" />
                <span className="font-medium text-primary">여기에 놓으세요</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">이미지 첨부</span>
                <span className="text-muted-foreground text-[11px] hidden sm:inline">(WebP 압축 및 클라우드 업로드)</span>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
