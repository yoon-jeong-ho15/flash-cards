import { StateCreator } from 'zustand';
import { signInWithPopup, signOut } from 'firebase/auth';
import { FlashcardStoreState, AuthSlice, EMPTY_PENDING_SYNC } from '../types';
import { auth, googleProvider } from '../../lib/firebase';
import { UserProfile } from '../../types';

export const createAuthSlice: StateCreator<
  FlashcardStoreState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  user: null,
  isAuthInitialized: false,
  authError: null,

  setUser: (user) => {
    set({ user, isAuthInitialized: true });
  },

  setAuthError: (error) => {
    set({ authError: error });
  },

  loginWithGoogle: async () => {
    if (!auth) {
      const errorMsg = 'Firebase Auth가 초기화되지 않았습니다. .env 환경 변수를 확인해주세요.';
      set({ authError: errorMsg });
      throw new Error(errorMsg);
    }

    set({ authError: null });

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };

      set({ user: userProfile, isAuthInitialized: true, authError: null });
      // 로그인 완료 후 해당 사용자의 클라우드 데이터 동기화
      await get().initCloudSync();
    } catch (err: any) {
      console.error('Google 로그인 상세 오류:', err);
      let userFriendlyMessage = `로그인 실패 (${err.code || '알 수 없음'}): ${err.message || err}`;

      if (err.code === 'auth/unauthorized-domain') {
        userFriendlyMessage =
          '현재 도메인이 Firebase 인증 도메인에 등록되어 있지 않습니다. http://localhost:5173 으로 접속 중인지 확인해주세요.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = '로그인 팝업창이 닫혔습니다.';
      } else if (err.code === 'auth/popup-blocked') {
        userFriendlyMessage = '브라우저에서 팝업창이 차단되었습니다. 주소창에서 팝업을 허용해주세요.';
      } else if (err.code === 'auth/operation-not-allowed') {
        userFriendlyMessage =
          'Firebase 콘솔에서 Google 로그인이 활성화되지 않았습니다.';
      }

      set({ authError: userFriendlyMessage });
      throw err;
    }
  },

  logout: async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('로그아웃 에러:', err);
    } finally {
      get().resetUserData();
    }
  },

  resetUserData: () => {
    set({
      user: null,
      folders: [],
      decks: [],
      cards: [],
      pendingSync: EMPTY_PENDING_SYNC,
      syncStatus: 'offline',
      lastSyncedAt: null,
      syncError: null,
      authError: null,
    });
  },
});
