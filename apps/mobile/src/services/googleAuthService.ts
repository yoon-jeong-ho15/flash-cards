import type { UserProfile } from '@flashcards/types';
import { CURRENT_USER } from '../store/userInitialData';

const FIREBASE_API_KEY = 'AIzaSyAab6zzXjd1IG2p4_-LbXW1eqOaO-A1G1k';

export const GOOGLE_OAUTH_CONFIG = {
  iosClientId: '119489560534-4oa737q6ejm5b2h1si2us6snm25ba2hu.apps.googleusercontent.com',
  androidClientId: '119489560534-mtigctg1uq7gd2l8fued2ivfbbcedkqh.apps.googleusercontent.com',
  webClientId: '119489560534-mtigctg1uq7gd2l8fued2ivfbbcedkqh.apps.googleusercontent.com',
};

export interface GoogleAuthResponse {
  user: UserProfile;
  idToken?: string;
  refreshToken?: string;
}

/**
 * JWT 페이로드 디코딩 유틸 (Google id_token 파싱용)
 */
function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

export const googleAuthService = {
  /**
   * Google OAuth id_token을 Firebase Auth에 전달하여 실제 사용자 프로필과 세션 토큰을 발급받습니다.
   */
  async exchangeGoogleIdTokenWithFirebase(idToken: string): Promise<GoogleAuthResponse> {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postBody: `id_token=${idToken}&providerId=google.com`,
            requestUri: 'https://yoon-apps.firebaseapp.com',
            returnSecureToken: true,
            returnIdpCredential: true,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Firebase 계정 연동 실패');
      }

      const user: UserProfile = {
        uid: data.localId,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || '사용자',
        photoURL: data.photoUrl || null,
      };

      return {
        user,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
      };
    } catch (err: any) {
      // 오프라인이거나 Firebase 통신 지연 시 토큰 자체에서 프로필 추출
      const payload = parseJwtPayload(idToken);
      if (payload && payload.email) {
        const uid =
          payload.email.toLowerCase() === CURRENT_USER.email?.toLowerCase()
            ? CURRENT_USER.uid
            : payload.sub || `google-${Date.now()}`;

        return {
          user: {
            uid,
            email: payload.email,
            displayName: payload.name || payload.email.split('@')[0],
            photoURL: payload.picture || null,
          },
          idToken,
        };
      }
      throw err;
    }
  },

  /**
   * 이메일을 직접 입력하여 로그인할 경우 (테스트 및 개발 환경용)
   */
  async signInWithCustomEmail(email: string, displayName?: string): Promise<GoogleAuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const normalizedEmail = email.trim().toLowerCase();
    const isPrimaryUser = normalizedEmail === CURRENT_USER.email?.toLowerCase();

    const user: UserProfile = {
      uid: isPrimaryUser ? CURRENT_USER.uid : `user-${Date.now()}`,
      email: email.trim(),
      displayName: displayName?.trim() || (isPrimaryUser ? CURRENT_USER.displayName : email.split('@')[0]),
      photoURL: isPrimaryUser ? CURRENT_USER.photoURL : null,
    };

    return {
      user,
    };
  },
};
