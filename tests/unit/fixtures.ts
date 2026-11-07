import type { Exercise, SetEntry, WorkoutSession } from '../../src/db/types';
import { BUILTIN_EXERCISES } from '../../src/data/exercises';

let n = 0;
export function set(weightKg: number | null, reps: number | null, rir: number | null = 2, extra: Partial<SetEntry> = {}): SetEntry {
  n += 1;
  return { id: `s${n}`, weightKg, reps, rir, isWarmup: false, done: true, ...extra };
}

export function session(date: string, exercises: { exerciseId: string; sets: SetEntry[] }[], extra: Partial<WorkoutSession> = {}): WorkoutSession {
  n += 1;
  return {
    id: `ws${n}`,
    date,
    programId: null,
    programDayId: null,
    dayName: 'Test',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    finishedAt: `${date}T11:00:00.000Z`,
    notes: '',
    exercises: exercises.map((e, i) => ({ id: `se${n}-${i}`, exerciseId: e.exerciseId, target: null, note: '', sets: e.sets })),
    updatedAt: `${date}T11:00:00.000Z`,
    ...extra,
  };
}

export const exMap = new Map<string, Exercise>(BUILTIN_EXERCISES.map((e) => [e.id, e]));
