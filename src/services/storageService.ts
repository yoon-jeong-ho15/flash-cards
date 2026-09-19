import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';

/**
 * 파일을 읽어 Base64 Data URL 문자열로 변환합니다. (로컬/오프라인 폴백용)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 파일을 Firebase Storage에 업로드하고 영구 Public URL(다운로드 URL)을 반환합니다.
 * Firebase가 설정되어 있지 않거나 네트워크 지연/권한 오류 시 즉시 로컬 Base64로 안전하게 폴백합니다.
 */
export async function uploadCardImage(file: File, userId?: string): Promise<string> {
  // 1. Firebase 미구성 환경 감지 시 로컬 WebP Base64로 즉시 반환 (무한 대기 방지)
  if (!storage || !isFirebaseConfigured) {
    console.info('[Storage] Firebase 미설정 환경 감지: 최적화된 로컬 Base64 이미지로 즉시 변환합니다.');
    return await fileToBase64(file);
  }

  // 확장자 추출 및 파일명 생성
  const fileExt = file.name.split('.').pop() || 'webp';
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const userFolder = userId || 'public';
  const filePath = `cards/${userFolder}/${Date.now()}_${uniqueId}.${fileExt}`;

  const storageRef = ref(storage, filePath);

  try {
    // 5초 타임아웃 프로미스 레이스
    const uploadTask = (async () => {
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/webp',
        cacheControl: 'public, max-age=31536000', // 1년 캐시
      });
      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutTask = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('스토리지 업로드 타임아웃 (네트워크 지연)')), 6000)
    );

    return await Promise.race([uploadTask, timeoutTask]);
  } catch (error: any) {
    console.warn('[Storage] Firebase 업로드 실패 또는 시간 초과, 로컬 이미지로 안전하게 대체합니다:', error?.message || error);
    // 업로드 실패 시 에러로 에디터를 멈추지 않고 Base64로 즉시 표시
    return await fileToBase64(file);
  }
}

/**
 * 주어진 URL이 Firebase Storage에서 호스팅되는 URL인지 판별합니다.
 * (외부 이미지나 base64는 삭제 대상에서 제외하기 위함)
 */
export function isFirebaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('/v0/b/');
}

/**
 * Firebase Storage 다운로드 URL을 받아 해당 파일을 스토리지에서 영구 삭제합니다.
 * 외부 URL이나 base64 데이터, 이미 삭제된 파일은 안전하게 무시합니다.
 */
export async function deleteImageByUrl(downloadUrl: string): Promise<void> {
  if (!storage || !isFirebaseConfigured || !downloadUrl) {
    return;
  }

  // Firebase Storage에 업로드된 URL인 경우에만 삭제 시도
  if (!isFirebaseStorageUrl(downloadUrl)) {
    return;
  }

  try {
    const { deleteObject } = await import('firebase/storage');
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
    console.log('[Storage] 이미지 삭제 성공:', downloadUrl);
  } catch (error: any) {
    // 이미 삭제되었거나 없는 파일(object-not-found)은 에러로 중단되지 않게 경고만 기록
    if (error?.code === 'storage/object-not-found') {
      console.warn('[Storage] 이미 삭제되었거나 존재하지 않는 이미지입니다:', downloadUrl);
      return;
    }
    console.warn('[Storage] 이미지 삭제 중 경고 발생:', error?.message || error);
  }
}

/**
 * 여러 개의 이미지 URL을 받아 Firebase Storage에서 일괄 삭제합니다.
 */
export async function deleteImagesByUrls(urls: (string | undefined | null)[]): Promise<void> {
  const validUrls = Array.from(
    new Set(
      urls.filter((url): url is string => Boolean(url && isFirebaseStorageUrl(url)))
    )
  );

  if (validUrls.length === 0) return;

  await Promise.allSettled(validUrls.map((url) => deleteImageByUrl(url)));
}

/**
 * HTML 문자열에서 모든 <img src="..."> URL을 추출합니다.
 */
export function extractImageUrlsFromHtml(html?: string | null): string[] {
  if (!html) return [];
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  const urls: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }
  return urls;
}

/**
 * 카드 객체 또는 HTML들로부터 사용 중인 모든 Firebase Storage 이미지 URL을 추출합니다.
 */
export function extractAllFirebaseImageUrlsFromCard(card: {
  termRichText?: string;
  definitionRichText?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  imageUrl?: string;
}): string[] {
  const urls: string[] = [];

  // 앞면/뒷면 HTML 본문 내 이미지 추출
  urls.push(...extractImageUrlsFromHtml(card.termRichText));
  urls.push(...extractImageUrlsFromHtml(card.definitionRichText));

  // 별도 이미지 첨부 필드 추출
  if (card.frontImageUrl) urls.push(card.frontImageUrl);
  if (card.backImageUrl) urls.push(card.backImageUrl);
  if (card.imageUrl) urls.push(card.imageUrl);

  // Firebase Storage URL만 필터링 및 중복 제거
  return Array.from(new Set(urls.filter(isFirebaseStorageUrl)));
}

