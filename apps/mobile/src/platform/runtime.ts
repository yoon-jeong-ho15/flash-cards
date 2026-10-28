import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { FlashcardStore } from '../core/store';
import { cloud } from './cloud';
export const store = new FlashcardStore(AsyncStorage, cloud, randomUUID);
export const useStore = () => useSyncExternalStore(store.subscribe, store.getState, store.getState);
