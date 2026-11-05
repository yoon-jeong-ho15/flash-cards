import type { Storage } from './types';

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark';
  uiScale: number;
  questionSize: number;
  answerSize: number;
}
export const defaultAppearance: AppearanceSettings = { theme: 'system', uiScale: 1, questionSize: 24, answerSize: 18 };
export const appearanceKey = 'flashcards_mobile_appearance_v1';
export function normalizeAppearance(value: Partial<AppearanceSettings>): AppearanceSettings {
  const bounded = (number: unknown, fallback: number, min: number, max: number) =>
    typeof number === 'number' && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  return {
    theme: ['system', 'light', 'dark'].includes(value.theme || '') ? value.theme! : 'system',
    uiScale: bounded(value.uiScale, 1, 0.8, 1.5),
    questionSize: bounded(value.questionSize, 24, 12, 40),
    answerSize: bounded(value.answerSize, 18, 12, 40),
  };
}
/** Device settings are independent of account data and are never cloud-synced. */
export class AppearanceStore {
  private state = { ...defaultAppearance, ready: false };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private loading?: Promise<void>;
  constructor(private storage: Storage) {}
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(value: AppearanceSettings) { this.state = { ...value, ready: true }; this.listeners.forEach(fn => fn()); }
  load = () => this.loading ||= (async () => {
    try {
      const saved = await this.storage.getItem(appearanceKey);
      this.publish(normalizeAppearance(saved ? JSON.parse(saved) || {} : {}));
    } catch { this.publish(defaultAppearance); }
  })();
  update = (value: Partial<AppearanceSettings>) => {
    const job = this.queue.then(async () => {
      await this.load();
      const next = normalizeAppearance({ ...this.state, ...value });
      await this.storage.setItem(appearanceKey, JSON.stringify(next));
      this.publish(next);
    });
    this.queue = job.catch(() => {});
    return job;
  };
}
