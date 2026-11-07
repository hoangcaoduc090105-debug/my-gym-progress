import type { WorkoutSession } from '../db/types';
import { estimate1RM, type OneRmFormula } from './oneRepMax';
import { flattenWorkingSets, type FlatSet } from './sets';

export interface ExerciseRecord {
  exerciseId: string;
  heaviest: { weightKg: number; reps: number; date: string } | null;
  bestE1RM: { value: number; weightKg: number; reps: number; date: string } | null;
  bestSetVolume: { value: number; weightKg: number; reps: number; date: string } | null;
  mostReps: { reps: number; weightKg: number; date: string } | null;
  totalSets: number;
}

export function recordsByExercise(sessions: WorkoutSession[], formula: OneRmFormula): Map<string, ExerciseRecord> {
  const map = new Map<string, ExerciseRecord>();
  for (const s of flattenWorkingSets(sessions)) {
    let r = map.get(s.exerciseId);
    if (!r) {
      r = { exerciseId: s.exerciseId, heaviest: null, bestE1RM: null, bestSetVolume: null, mostReps: null, totalSets: 0 };
      map.set(s.exerciseId, r);
    }
    r.totalSets += 1;
    if (s.weightKg > 0 && (!r.heaviest || s.weightKg > r.heaviest.weightKg || (s.weightKg === r.heaviest.weightKg && s.reps > r.heaviest.reps))) {
      r.heaviest = { weightKg: s.weightKg, reps: s.reps, date: s.date };
    }
    const e = estimate1RM(s.weightKg, s.reps, formula);
    if (e != null && (!r.bestE1RM || e > r.bestE1RM.value)) {
      r.bestE1RM = { value: e, weightKg: s.weightKg, reps: s.reps, date: s.date };
    }
    const v = s.weightKg * s.reps;
    if (v > 0 && (!r.bestSetVolume || v > r.bestSetVolume.value)) {
      r.bestSetVolume = { value: v, weightKg: s.weightKg, reps: s.reps, date: s.date };
    }
    if (!r.mostReps || s.reps > r.mostReps.reps) r.mostReps = { reps: s.reps, weightKg: s.weightKg, date: s.date };
  }
  return map;
}

export interface PREvent {
  date: string;
  sessionId: string;
  exerciseId: string;
  type: 'weight' | 'e1rm';
  value: number;
  previous: number;
  set: FlatSet;
}

/**
 * Dòng thời gian kỷ lục: lần đầu tập bài nào đó KHÔNG tính là PR (chưa có mốc so sánh).
 * sessions phải sắp xếp tăng dần theo ngày.
 */
export function prTimeline(sessions: WorkoutSession[], formula: OneRmFormula): PREvent[] {
  const best = new Map<string, { w: number; e: number }>();
  const events: PREvent[] = [];
  for (const sess of sessions) {
    const sets = flattenWorkingSets([sess]);
    const perEx = new Map<string, FlatSet[]>();
    for (const s of sets) perEx.set(s.exerciseId, [...(perEx.get(s.exerciseId) ?? []), s]);
    for (const [exId, list] of perEx) {
      const prev = best.get(exId);
      const topW = list.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
      let topE: FlatSet | null = null;
      let topEVal = 0;
      for (const s of list) {
        const e = estimate1RM(s.weightKg, s.reps, formula);
        if (e != null && e > topEVal) {
          topEVal = e;
          topE = s;
        }
      }
      if (prev) {
        if (topW.weightKg > prev.w && topW.weightKg > 0) {
          events.push({ date: sess.date, sessionId: sess.id, exerciseId: exId, type: 'weight', value: topW.weightKg, previous: prev.w, set: topW });
        }
        if (topE && topEVal > prev.e && prev.e > 0) {
          events.push({ date: sess.date, sessionId: sess.id, exerciseId: exId, type: 'e1rm', value: topEVal, previous: prev.e, set: topE });
        }
      }
      best.set(exId, { w: Math.max(prev?.w ?? 0, topW.weightKg), e: Math.max(prev?.e ?? 0, topEVal) });
    }
  }
  return events;
}

export interface StrengthPoint {
  date: string;
  e1rm: number | null;
  maxWeight: number;
  volume: number;
}

export function strengthSeries(sessions: WorkoutSession[], exerciseId: string, formula: OneRmFormula): StrengthPoint[] {
  const out: StrengthPoint[] = [];
  for (const sess of sessions) {
    const sets = flattenWorkingSets([sess]).filter((s) => s.exerciseId === exerciseId);
    if (sets.length === 0) continue;
    let e: number | null = null;
    for (const s of sets) {
      const v = estimate1RM(s.weightKg, s.reps, formula);
      if (v != null && (e == null || v > e)) e = v;
    }
    out.push({
      date: sess.date,
      e1rm: e,
      maxWeight: Math.max(...sets.map((s) => s.weightKg)),
      volume: Math.round(sets.reduce((a, s) => a + Math.max(0, s.weightKg) * s.reps, 0) * 10) / 10,
    });
  }
  return out;
}
