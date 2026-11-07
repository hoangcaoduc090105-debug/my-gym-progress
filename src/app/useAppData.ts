import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { defaultSettings } from '../db/defaults';
import type { Exercise, Settings } from '../db/types';

/** Cài đặt hiện tại (luôn có giá trị — dùng mặc định khi chưa lưu). */
export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('app'), []);
  // useMemo: trả cùng một object khi dữ liệu không đổi, để form dùng useEffect([settings])
  // (Cài đặt → Tập luyện) không bị reset mất chỉnh sửa mỗi khi trang render lại.
  return useMemo(() => {
    const d = defaultSettings('');
    return s ? { ...d, ...s, progression: { ...d.progression, ...s.progression } } : d;
  }, [s]);
}

export function useProfile() {
  return useLiveQuery(() => db.profile.get('me'), []);
}

export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])), []);
}
