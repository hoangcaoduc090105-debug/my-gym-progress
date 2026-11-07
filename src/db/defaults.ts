import { DEFAULT_PROGRESSION } from '../domain/progression';
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
    updatedAt: now,
  };
}
