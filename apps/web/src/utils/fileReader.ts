/**
 * File 객체를 Base64 Data URL 문자열로 비동기 변환합니다.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 파일 유효성 검사 (이미지 형식 확인)
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
      return;
    }

    // 파일 크기 제한 (localStorage 용량 고려하여 3MB 제한)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      reject(new Error('이미지 파일 크기는 3MB 이하여야 합니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지 변환에 실패했습니다.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('파일 읽기 오류'));
    reader.readAsDataURL(file);
  });
}
