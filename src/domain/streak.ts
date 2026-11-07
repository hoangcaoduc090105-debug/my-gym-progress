import type { WorkoutSession } from '../db/types';
import { addDays, startOfWeek } from '../lib/date';

export interface WeeklyStreak {
  /** Số tuần LIÊN TIẾP (tính lùi từ tuần trước) đạt đủ mục tiêu buổi/tuần. */
  weeks: number;
  /** Tuần hiện tại: số buổi đã tập và mục tiêu. */
  thisWeek: { done: number; target: number };
  /** Tuần hiện tại đã đủ mục tiêu chưa (nếu đủ thì streak hiển thị = weeks + 1). */
  thisWeekMet: boolean;
}

/**
 * Chuỗi tuần tập đều. Tuần = Thứ Hai–Chủ Nhật. Tuần hiện tại chưa kết thúc nên KHÔNG làm đứt chuỗi:
 * chuỗi đếm lùi từ tuần trước; nếu tuần này đã đủ thì cộng thêm 1 khi hiển thị.
 * `sessions` = buổi đã hoàn thành (caller lọc activeCompleted); buổi deload vẫn tính.
 */
export function weeklyStreak(sessions: Pick<WorkoutSession, 'date'>[], target: number, today: string): WeeklyStreak {
  const t = Math.max(1, Math.round(target));
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const w = startOfWeek(s.date);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const cur = startOfWeek(today);
  const done = counts.get(cur) ?? 0;
  let weeks = 0;
  for (let w = addDays(cur, -7); (counts.get(w) ?? 0) >= t; w = addDays(w, -7)) weeks++;
  return { weeks, thisWeek: { done, target: t }, thisWeekMet: done >= t };
}

/** Số tuần để hiển thị: tuần này đủ thì tính luôn. */
export const streakShown = (s: WeeklyStreak): number => s.weeks + (s.thisWeekMet ? 1 : 0);
