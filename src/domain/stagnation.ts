import type { WorkoutSession } from '../db/types';
import { estimate1RM, type OneRmFormula } from './oneRepMax';
import { isWorkingSet, splitByExercise } from './sets';

/** Số buổi gần nhất được xét. */
export const STAGNATION_WINDOW = 4;

export type Stagnation = { stagnant: true; sessions: number } | { stagnant: false; reason: 'few-sessions' | 'progress' | 'deload' };

/** Điểm sức mạnh của buổi cho một bài: e1RM tốt nhất (hiệp > 10 lần: ước lượng Epley không giới hạn để không bỏ buổi). */
function sessionScore(s: WorkoutSession, exerciseId: string, formula: OneRmFormula): number | null {
  let best: number | null = null;
  for (const part of s.exercises.flatMap(splitByExercise)) {
    if (part.exerciseId !== exerciseId) continue;
    for (const set of part.sets) {
      if (!isWorkingSet(set)) continue;
      const w = set.weightKg ?? 0;
      const r = set.reps ?? 0;
      const e = estimate1RM(w, r, formula) ?? w * (1 + r / 30);
      if (best == null || e > best) best = e;
    }
  }
  return best;
}

/**
 * Chững: xét 4 buổi HOÀN THÀNH gần nhất có hiệp làm việc của bài.
 * Mốc = e1RM tốt nhất từ buổi thứ 4 (tính từ mới nhất) trở về trước; nếu 3 buổi mới nhất không vượt mốc
 * VÀ trong 4 buổi đó không có buổi deload ⇒ { stagnant: true, sessions: 4 }. Hàm thuần.
 */
export function stagnation(sessions: WorkoutSession[], exerciseId: string, formula: OneRmFormula): Stagnation {
  const rows = sessions
    .filter((s) => s.status === 'completed' && !s.deletedAt)
    .map((s) => ({ s, score: sessionScore(s, exerciseId, formula) }))
    .filter((x): x is { s: WorkoutSession; score: number } => x.score != null)
    .sort((a, b) => a.s.date.localeCompare(b.s.date) || a.s.startedAt.localeCompare(b.s.startedAt));
  if (rows.length < STAGNATION_WINDOW) return { stagnant: false, reason: 'few-sessions' };
  const window = rows.slice(-STAGNATION_WINDOW);
  if (window.some((x) => x.s.isDeload)) return { stagnant: false, reason: 'deload' };
  const baseRows = rows.slice(0, rows.length - (STAGNATION_WINDOW - 1)).filter((x) => !x.s.isDeload);
  const baseline = Math.max(...baseRows.map((x) => x.score));
  const recent = Math.max(...rows.slice(-(STAGNATION_WINDOW - 1)).map((x) => x.score));
  return recent > baseline + 1e-9 ? { stagnant: false, reason: 'progress' } : { stagnant: true, sessions: STAGNATION_WINDOW };
}
