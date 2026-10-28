// Firebase publishes this function in its React Native runtime but omits it from
// the firebase/auth wrapper's shared declaration entry point.
import 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import type { Storage } from '../core/types';
declare module 'firebase/auth' { export function getReactNativePersistence(storage: Storage): Persistence; }
