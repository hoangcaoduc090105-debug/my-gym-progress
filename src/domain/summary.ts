import type { WorkoutSession } from '../db/types';
import { flattenWorkingSets, type FlatSet } from './sets';

/** So sánh một bài giữa buổi này và buổi trước: mức tạ cao nhất (kg) và khối lượng (kg). */
export interface ExerciseDelta {
  exerciseId: string;
  topKg: number;
  prevTopKg: number;
  volumeKg: number;
  prevVolumeKg: number;
  /** 'up' = tạ cao nhất tăng; 'down' = giảm; 'same' = bằng. */
  trend: 'up' | 'down' | 'same';
}

export interface SessionSummary {
  volumeKg: number;
  sets: number;
  /** Buổi được so sánh (cùng ngày giáo án, hoặc cùng tên buổi), null nếu là lần đầu. */
  previous: { id: string; date: string; volumeKg: number; sets: number } | null;
  /** % chênh lệch khối lượng so với buổi trước (null khi không có buổi trước hoặc buổi trước 0). */
  volumePct: number | null;
  setsDiff: number | null;
  /** Bài có trong cả hai buổi, theo thứ tự trong buổi hiện tại. */
  deltas: ExerciseDelta[];
  /** Bài mới (có trong buổi này, không có trong buổi trước). */
  newExerciseIds: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function perExercise(sets: FlatSet[]): Map<string, { topKg: number; volumeKg: number }> {
  const m = new Map<string, { topKg: number; volumeKg: number }>();
  for (const s of sets) {
    const cur = m.get(s.exerciseId) ?? { topKg: 0, volumeKg: 0 };
    cur.topKg = Math.max(cur.topKg, s.weightKg);
    if (s.weightKg > 0) cur.volumeKg = round1(cur.volumeKg + s.weightKg * s.reps);
    m.set(s.exerciseId, cur);
  }
  return m;
}

/**
 * Buổi trước để so sánh: buổi HOÀN THÀNH gần nhất trước buổi này (theo ngày rồi startedAt), không deload,
 * cùng programDayId (nếu có) hoặc cùng dayName; bỏ qua buổi không có hiệp làm việc.
 */
export function previousComparable(current: WorkoutSession, all: WorkoutSession[]): WorkoutSession | null {
  const key = (s: WorkoutSession) => `${s.date}|${s.startedAt}`;
  const before = all
    .filter((s) => s.id !== current.id && s.status === 'completed' && !s.deletedAt && !s.isDeload && key(s) < key(current))
    .filter((s) => (current.programDayId ? s.programDayId === current.programDayId : s.dayName === current.dayName))
    .filter((s) => flattenWorkingSets([s]).length > 0)
    .sort((a, b) => key(b).localeCompare(key(a)));
  return before[0] ?? null;
}

/** Tổng kết buổi tập so với buổi trước. Hàm thuần. */
export function sessionSummary(current: WorkoutSession, all: WorkoutSession[]): SessionSummary {
  const curSets = flattenWorkingSets([current]);
  const volumeKg = round1(curSets.reduce((a, s) => a + (s.weightKg > 0 ? s.weightKg * s.reps : 0), 0));
  const prev = previousComparable(current, all);
  if (!prev) {
    return { volumeKg, sets: curSets.length, previous: null, volumePct: null, setsDiff: null, deltas: [], newExerciseIds: [...new Set(curSets.map((s) => s.exerciseId))] };
  }
  const prevSets = flattenWorkingSets([prev]);
  const prevVolume = round1(prevSets.reduce((a, s) => a + (s.weightKg > 0 ? s.weightKg * s.reps : 0), 0));
  const cur = perExercise(curSets);
  const old = perExercise(prevSets);
  const deltas: ExerciseDelta[] = [];
  const newExerciseIds: string[] = [];
  for (const [id, c] of cur) {
    const o = old.get(id);
    if (!o) {
      newExerciseIds.push(id);
      continue;
    }
    deltas.push({ exerciseId: id, topKg: c.topKg, prevTopKg: o.topKg, volumeKg: c.volumeKg, prevVolumeKg: o.volumeKg, trend: c.topKg > o.topKg ? 'up' : c.topKg < o.topKg ? 'down' : 'same' });
  }
  return {
    volumeKg,
    sets: curSets.length,
    previous: { id: prev.id, date: prev.date, volumeKg: prevVolume, sets: prevSets.length },
    volumePct: prevVolume > 0 ? Math.round(((volumeKg - prevVolume) / prevVolume) * 100 + 1e-9) : null,
    setsDiff: curSets.length - prevSets.length,
    deltas,
    newExerciseIds,
  };
}
