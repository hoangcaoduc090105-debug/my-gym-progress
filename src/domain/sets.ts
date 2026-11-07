import type { Exercise, SetEntry, WorkoutSession } from '../db/types';

/** Hiệp làm việc = đã đánh dấu hoàn thành, số lần > 0, không phải hiệp khởi động. */
export function isWorkingSet(s: SetEntry): boolean {
  return s.done && !s.isWarmup && typeof s.reps === 'number' && Number.isFinite(s.reps) && s.reps > 0;
}

export function activeCompleted(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((s) => s.status === 'completed' && !s.deletedAt)
    .sort((a, b) => (a.date === b.date ? a.startedAt.localeCompare(b.startedAt) : a.date.localeCompare(b.date)));
}

export interface FlatSet {
  id: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  sessionId: string;
  date: string;
  exerciseId: string;
  setIndex: number;
}

export function flattenWorkingSets(sessions: WorkoutSession[]): FlatSet[] {
  const out: FlatSet[] = [];
  for (const sess of sessions) {
    for (const ex of sess.exercises) {
      let idx = 0;
      for (const set of ex.sets) {
        if (!isWorkingSet(set)) continue;
        idx += 1;
        out.push({ id: set.id, weightKg: set.weightKg ?? 0, reps: set.reps ?? 0, rir: set.rir, sessionId: sess.id, date: sess.date, exerciseId: ex.exerciseId, setIndex: idx });
      }
    }
  }
  return out;
}

export type ExerciseMap = Map<string, Exercise>;
export const toExerciseMap = (list: Exercise[]): ExerciseMap => new Map(list.map((e) => [e.id, e]));
