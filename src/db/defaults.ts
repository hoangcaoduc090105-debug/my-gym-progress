import { DEFAULT_PROGRESSION } from '../domain/progression';
import { DEFAULT_BAR_KG, DEFAULT_PLATES_KG } from '../domain/plates';
import type { Settings } from './types';

export function defaultSettings(now: string): Settings {
  return {
    id: 'app',
    progression: { ...DEFAULT_PROGRESSION },
    restTimerDefaultSec: 90,
    secondaryMuscleFactor: 0.5,
    oneRmFormula: 'epley',
    measurementReminderDays: 14,
    timerSound: true,
    timerVibrate: true,
    barbell: { barWeightKg: DEFAULT_BAR_KG, platesKg: [...DEFAULT_PLATES_KG] },
    weightUnit: 'kg',
    updatedAt: now,
  };
}

/** Gộp bản ghi settings đã lưu với mặc định — bản ghi cũ thiếu trường mới (v1.8) vẫn chạy. */
export function withSettingsDefaults(s: Partial<Settings> | undefined, now: string): Settings {
  const d = defaultSettings(now);
  if (!s) return d;
  return {
    ...d,
    ...s,
    progression: { ...d.progression, ...s.progression },
    barbell: { ...d.barbell, ...s.barbell, platesKg: s.barbell?.platesKg?.length ? [...s.barbell.platesKg] : d.barbell.platesKg },
  } as Settings;
}
