import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, isFirebaseConfigured } from '../lib/firebase';
import { bounded } from './imageSync';

/** Strict sync upload: never return a data URL as a successful cloud upload. */
export async function uploadDataImage(dataUrl: string, userId: string, active: () => boolean): Promise<string> {
  const check = () => {
    if (!active() || auth?.currentUser?.uid !== userId) throw new Error('Authentication session changed');
    if (!storage || !navigator.onLine) throw new Error('이미지 업로드 연결을 확인한 후 다시 동기화해 주세요. 원본은 보관됩니다.');
  };
  check();
  const match = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('지원하지 않는 이미지입니다. PNG/JPEG/GIF/WebP로 교체한 후 다시 동기화해 주세요.');
  const bytes = Uint8Array.from(atob(match[3].replace(/\s/g, '')), c => c.charCodeAt(0));
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('이미지를 5MB 이하로 줄인 후 다시 동기화해 주세요. 원본은 보관됩니다.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  check();
  const target = ref(storage!, `cards/${userId}/sha256_${hash}.${match[2].toLowerCase().replace('jpeg', 'jpg')}`);
  // A prior upload may have succeeded before local persistence or a request failed.
  try {
    const existing = await bounded(getDownloadURL(target), 8000);
    check();
    return existing;
  } catch (error) {
    if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
  }
  check();
  const task = uploadBytesResumable(target, bytes, { contentType: match[1].toLowerCase(), cacheControl: 'public,max-age=31536000' });
  try {
    const result = await bounded(Promise.resolve(task), 15000);
    check();
    const url = await bounded(getDownloadURL(result.ref), 8000);
    check();
    return url;
  } catch (error) { task.cancel(); throw error; }
}

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
  if (!storage || !isFirebaseConfigured || !userId || !navigator.onLine) {
    console.info('[Storage] Firebase 미설정 환경 감지: 최적화된 로컬 Base64 이미지로 즉시 변환합니다.');
    return await fileToBase64(file);
  }

  // 확장자 추출 및 파일명 생성
  const fileExt = file.name.split('.').pop() || 'webp';
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const userFolder = userId || 'public';
  const filePath = `cards/${userFolder}/${Date.now()}_${uniqueId}.${fileExt}`;

  const storageRef = ref(storage, filePath);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'image/webp', cacheControl: 'public, max-age=31536000',
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => getDownloadURL((await task).ref))(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          task.cancel();
          reject(new Error('이미지 업로드 시간 초과'));
        }, 6000);
      }),
    ]);
  } catch (error) {
    task.cancel();
    console.warn('[Storage] 업로드 실패: 로컬 이미지로 보관합니다.', error);
    return fileToBase64(file);
  } finally {
    if (timeout) clearTimeout(timeout);
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

// Files can be shared by duplicated cards and drafts on other devices. The web client
// intentionally retains detached assets. Permanent cleanup requires server-side reference checks.

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

