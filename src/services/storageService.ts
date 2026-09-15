import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';

/**
 * 이미지 파일을 Firebase Storage에 업로드하고 영구 Public URL(다운로드 URL)을 반환합니다.
 * 사용자별로 cards/{userId}/ 경로에 격리 저장됩니다.
 */
export async function uploadCardImage(file: File, userId?: string): Promise<string> {
  if (!storage || !isFirebaseConfigured) {
    throw new Error('Firebase Storage 설정이 구성되지 않았습니다. .env 환경 변수를 확인해주세요.');
  }

  // 확장자 추출 및 파일명 생성
  const fileExt = file.name.split('.').pop() || 'webp';
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const userFolder = userId || 'public';
  const filePath = `cards/${userFolder}/${Date.now()}_${uniqueId}.${fileExt}`;

  const storageRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/webp',
      cacheControl: 'public, max-age=31536000', // 1년 캐시
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.error('Firebase Storage 업로드 실패:', error);
    throw new Error(`이미지 업로드에 실패했습니다: ${error?.message || error}`);
  }
}
