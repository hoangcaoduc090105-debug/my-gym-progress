import type { ExerciseTarget } from '../db/types';
import { nearestLoadable } from './plates';

/** Buổi nhẹ (deload): tạ ≈ 60% mức buổi trước, bớt 1 hiệp. */
export const DELOAD_FACTOR = 0.6;

/** Mức tạ gợi ý cho buổi deload: 60% rồi làm tròn (tạ đòn: mức gắn được gần nhất; khác: bội số 0,5 kg). */
export function deloadWeight(lastKg: number, barbell?: { barWeightKg: number; platesKg: number[] } | null): number {
  const raw = lastKg * DELOAD_FACTOR;
  if (raw <= 0) return 0;
  if (barbell && barbell.platesKg.length) return nearestLoadable(raw, barbell.barWeightKg, barbell.platesKg).nearest;
  return Math.round(raw * 2) / 2;
}

/** Mục tiêu buổi deload: bớt 1 hiệp (tối thiểu 1), giữ nguyên phần còn lại. */
export function deloadTarget<T extends ExerciseTarget>(t: T): T {
  return { ...t, sets: Math.max(1, t.sets - 1) };
}
