import type { WorkoutSession } from '../db/types';
import { estimate1RM, type OneRmFormula } from './oneRepMax';
import { isWorkingSet, splitByExercise } from './sets';
import { fmt1 } from '../lib/format';

export interface HistorySet {
  weightKg: number;
  reps: number;
}
export interface HistoryRow {
  sessionId: string;
  date: string;
  dayName: string;
  /** Hiệp làm việc của bài trong buổi, gộp mọi lần bài xuất hiện, đúng thứ tự. */
  sets: HistorySet[];
  bestE1RM: number | null;
  isPR: boolean;
}

/** Hiệp làm việc của một bài trong một buổi (kể cả bài xuất hiện 2 lần, bỏ hiệp thuộc bài cũ trước khi thay). */
export function workingSetsOf(session: WorkoutSession, exerciseId: string): HistorySet[] {
  const out: HistorySet[] = [];
  for (const part of session.exercises.flatMap(splitByExercise)) {
    if (part.exerciseId !== exerciseId) continue;
    for (const s of part.sets) if (isWorkingSet(s)) out.push({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 });
  }
  return out;
}

/** "40×10 · 40×9 · 40×8" (số kiểu Việt: 42,5×8). `fmtW` cho phép đổi đơn vị hiển thị. */
export function formatSets(sets: HistorySet[], fmtW: (kg: number) => string = fmt1): string {
  return sets.map((s) => `${fmtW(s.weightKg)}×${s.reps}`).join(' · ');
}

/**
 * Dòng lịch sử của một bài: chỉ buổi có ít nhất 1 hiệp làm việc của bài, mới nhất trước
 * (cùng ngày: bắt đầu sau đứng trước). `prSessionIds` = buổi có PREvent của bài này.
 */
export function historyRows(sessions: WorkoutSession[], exerciseId: string, formula: OneRmFormula, prSessionIds: ReadonlySet<string> = new Set()): HistoryRow[] {
  const rows: (HistoryRow & { startedAt: string })[] = [];
  for (const s of sessions) {
    if (s.deletedAt || s.status !== 'completed') continue;
    const sets = workingSetsOf(s, exerciseId);
    if (sets.length === 0) continue;
    let best: number | null = null;
    for (const x of sets) {
      const e = estimate1RM(x.weightKg, x.reps, formula);
      if (e != null && (best == null || e > best)) best = e;
    }
    rows.push({ sessionId: s.id, date: s.date, startedAt: s.startedAt, dayName: s.dayName, sets, bestE1RM: best, isPR: prSessionIds.has(s.id) });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
  return rows.map(({ startedAt: _s, ...r }) => r);
}

/** Mốc "từ ngày" cho bộ lọc nhanh. */
export type HistoryRange = '3m' | '1y' | 'all';
export function rangeStart(range: HistoryRange, todayISO: string): string | undefined {
  if (range === 'all') return undefined;
  const d = new Date(`${todayISO}T00:00:00`);
  if (range === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
