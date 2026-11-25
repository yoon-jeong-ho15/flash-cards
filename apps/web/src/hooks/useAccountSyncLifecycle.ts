import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { accountStorageKey } from '../store/accountStorage';

/** Subscribes to account storage refresh, Firebase Auth state, and online/offline sync lifecycle events. */
export function useAccountSyncLifecycle() {
  const initCloudSync = useFlashcardStore((state) => state.initCloudSync);
  const setSyncStatus = useFlashcardStore((state) => state.setSyncStatus);
  const setUser = useFlashcardStore((state) => state.setUser);
  const user = useFlashcardStore((state) => state.user);

  useEffect(() => {
    const refresh = () => void useFlashcardStore.getState().refreshAccount();
    const onStorage = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === null ||
          event.key === accountStorageKey(useFlashcardStore.getState().user?.uid))
      ) {
        refresh();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', onVisible);
    refresh();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Firebase Auth 인증 상태 감지 및 자동 동기화
  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        initCloudSync();
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, initCloudSync]);

  useEffect(() => {
    // 브라우저 네트워크 온라인 복구 시 자동 동기화 트리거
    const handleOnline = () => {
      if (user) {
        initCloudSync();
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initCloudSync, setSyncStatus, user]);
}
