export interface CompressImageOptions {
  maxWidth?: number;
  maxSizeMB?: number;
  quality?: number;
}

/**
 * 브라우저 네이티브 Canvas를 사용하여 이미지를 안전하고 초고속(수십 ms)으로 WebP 압축합니다.
 * 외부 라이브러리 Web Worker 지연 및 무한 대기(Hang) 문제를 방지하고 타임아웃 안전장치를 제공합니다.
 */
export async function compressImage(
  file: File,
  customOptions?: CompressImageOptions
): Promise<File> {
  // 이미지 파일 형식인지 확인
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 압축할 수 있습니다.');
  }

  const maxWidth = customOptions?.maxWidth ?? 1024;
  const quality = customOptions?.quality ?? 0.8;

  return new Promise((resolve) => {
    // 4초 안전 타임아웃: 어떤 이유로든 지연되면 원본 파일을 즉시 반환하여 멈춤 방지
    const timeoutId = setTimeout(() => {
      console.warn('[imageCompressor] 압축 타임아웃 초과, 원본 이미지 사용');
      resolve(file);
    }, 4000);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (!width || !height) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        // 가로가 maxWidth(기본 1024px)보다 크면 비율 유지 축소
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              resolve(file);
              return;
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
            const compressedFile = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      } catch (err) {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        console.warn('[imageCompressor] 캔버스 압축 중 예외 발생, 원본 파일 사용:', err);
        resolve(file);
      }
    };

    img.onerror = (err) => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      console.warn('[imageCompressor] 이미지 로드 실패, 원본 파일 사용:', err);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

