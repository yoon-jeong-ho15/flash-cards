import imageCompression from 'browser-image-compression';

export interface CompressImageOptions {
  maxWidth?: number;
  maxSizeMB?: number;
  quality?: number;
}

/**
 * 이미지 파일의 가로/세로 해상도를 비동기로 가져옵니다.
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 정보를 읽는 도중 오류가 발생했습니다.'));
    };
    img.src = url;
  });
}

/**
 * 이미지를 가로 최대 1024px로 제한하고 WebP 포맷으로 압축합니다.
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
  const maxSizeMB = customOptions?.maxSizeMB ?? 1;
  const quality = customOptions?.quality ?? 0.8;

  let targetMaxWidthOrHeight = maxWidth;

  try {
    const { width, height } = await getImageDimensions(file);

    // 가로가 maxWidth(1024px)보다 큰 경우
    if (width > maxWidth) {
      if (width >= height) {
        // 가로가 더 긴 경우: 긴 축이 maxWidth가 되도록 설정
        targetMaxWidthOrHeight = maxWidth;
      } else {
        // 세로가 더 긴 경우: 가로가 maxWidth가 되도록 비율 계산하여 세로 기준 maxWidthOrHeight 설정
        targetMaxWidthOrHeight = Math.round((height / width) * maxWidth);
      }
    } else {
      // 가로가 이미 1024px 이하인 경우 세로도 유지 (비율 축소 불필요)
      targetMaxWidthOrHeight = Math.max(width, height);
    }
  } catch (err) {
    console.warn('이미지 치수 계산 실패, 기본 1024px 제한 적용:', err);
    targetMaxWidthOrHeight = maxWidth;
  }

  const compressionOptions = {
    maxSizeMB,
    maxWidthOrHeight: targetMaxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: quality,
  };

  const compressedBlob = await imageCompression(file, compressionOptions);

  // 파일 확장자를 .webp로 변경하여 새 File 객체 생성
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
  const webpFileName = `${baseName}.webp`;

  return new File([compressedBlob], webpFileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
