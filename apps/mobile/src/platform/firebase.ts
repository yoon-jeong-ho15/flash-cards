import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configured = Boolean(config.apiKey && config.projectId && !config.apiKey.startsWith('your_'));
const app = configured ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const auth = app ? (() => {
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch (error) { if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(app); throw error; }
})() : null;
export const db = app ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : null;
export const storage = app ? getStorage(app) : null;
