import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { auth } from './firebase';

// Load native Google Sign-In only on demand; guest mode also works in Expo Go.
export async function login() {
  if (!auth) throw new Error('Firebase 및 Google 로그인 설정이 필요합니다. README의 환경 변수 설정을 확인해 주세요.');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID를 설정해 주세요.');
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) return;
  if (!result.data.idToken) throw new Error('Google 인증 토큰을 받지 못했습니다. OAuth 클라이언트 설정을 확인해 주세요.');
  await signInWithCredential(auth, GoogleAuthProvider.credential(result.data.idToken));
}
export async function logout() {
  if (auth) await signOut(auth);
  try { const { GoogleSignin } = await import('@react-native-google-signin/google-signin'); await GoogleSignin.signOut(); }
  catch { /* Firebase sign-out is authoritative, including guest-only Expo Go sessions. */ }
}
