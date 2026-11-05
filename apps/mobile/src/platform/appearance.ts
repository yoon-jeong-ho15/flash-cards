import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppearanceStore } from '../core/appearance';
export const appearance = new AppearanceStore(AsyncStorage);
export const useAppearance = () => useSyncExternalStore(appearance.subscribe, appearance.getState, appearance.getState);
