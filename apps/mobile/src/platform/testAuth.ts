import { isRunningInExpoGo } from 'expo';
import type { UserProfile } from '../core/types';

// Mock identity is available only while developing in Expo Go.
export const mockAuthEnabled = __DEV__ && isRunningInExpoGo();
export const mockUser: UserProfile = {
  uid: '__flashcards_local_test_user__',
  displayName: '테스트 사용자',
  email: 'tester@example.test',
  photoURL: null,
};
