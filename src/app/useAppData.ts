import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { defaultSettings } from '../db/defaults';
import type { Exercise, Settings } from '../db/types';

/** Cài đặt hiện tại (luôn có giá trị — dùng mặc định khi chưa lưu). */
export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('app'), []);
  const d = defaultSettings('');
  return s ? { ...d, ...s, progression: { ...d.progression, ...s.progression } } : d;
}

export function useProfile() {
  return useLiveQuery(() => db.profile.get('me'), []);
}

export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])), []);
}
