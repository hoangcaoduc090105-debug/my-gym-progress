import { MUSCLE_GROUPS, type MuscleGroup, type WorkoutSession } from '../db/types';
import { addDays, startOfWeek } from '../lib/date';
import { flattenWorkingSets, type ExerciseMap } from './sets';

export type MuscleSetCount = Record<MuscleGroup, number>;

export function emptyMuscleCount(): MuscleSetCount {
  return Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as MuscleSetCount;
}

/**
 * Số hiệp theo nhóm cơ: nhóm cơ chính +1/hiệp, mỗi nhóm cơ phụ +secondaryFactor/hiệp (mặc định 0,5).
 * Chỉ tính hiệp làm việc của buổi đã hoàn thành (caller lọc).
 */
export function setsByMuscle(sessions: WorkoutSession[], exercises: ExerciseMap, secondaryFactor = 0.5): MuscleSetCount {
  const out = emptyMuscleCount();
  for (const s of flattenWorkingSets(sessions)) {
    const ex = exercises.get(s.exerciseId);
    if (!ex) continue;
    out[ex.primaryMuscle] += 1;
    for (const m of ex.secondaryMuscles) {
      if (m !== ex.primaryMuscle) out[m] += secondaryFactor;
    }
  }
  return out;
}

/** Tổng khối lượng (kg) = Σ kg × lần của hiệp làm việc. Hiệp 0 kg (trọng lượng cơ thể) không cộng. */
export function totalVolume(sessions: WorkoutSession[]): number {
  let sum = 0;
  for (const s of flattenWorkingSets(sessions)) {
    if (s.weightKg > 0) sum += s.weightKg * s.reps;
  }
  return Math.round(sum * 10) / 10;
}

export function countWorkingSets(sessions: WorkoutSession[]): number {
  return flattenWorkingSets(sessions).length;
}

export interface WeekBucket {
  weekStart: string;
  sessions: number;
  sets: number;
  volumeKg: number;
  /** v1.8: số buổi deload trong tuần (vẫn được tính vào số buổi/hiệp/khối lượng). */
  deloadSessions: number;
}

/** Gom buổi đã hoàn thành theo tuần (Thứ Hai–Chủ Nhật), lấp cả tuần trống trong khoảng. */
export function weeklyBuckets(sessions: WorkoutSession[], fromISO: string, toISO: string): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const last = startOfWeek(toISO);
  for (let w = startOfWeek(fromISO); w <= last; w = addDays(w, 7)) {
    const end = addDays(w, 6);
    const inWeek = sessions.filter((s) => s.date >= w && s.date <= end);
    buckets.push({
      weekStart: w,
      sessions: inWeek.length,
      sets: countWorkingSets(inWeek),
      volumeKg: totalVolume(inWeek),
      deloadSessions: inWeek.filter((s) => s.isDeload).length,
    });
  }
  return buckets;
}

export function musclesTrained(count: MuscleSetCount): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((m) => count[m] > 0);
}
