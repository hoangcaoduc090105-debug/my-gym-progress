import Dexie from 'dexie';
import { db } from './db';
import type { WorkoutSession } from './types';
import { isWorkingSet, splitByExercise } from '../domain/sets';
import { prTimeline } from '../domain/records';
import type { OneRmFormula } from '../domain/oneRepMax';
import { stagnation, type Stagnation } from '../domain/stagnation';

/**
 * Các buổi ĐÃ HOÀN THÀNH có bài `exerciseId` (có ít nhất 1 hiệp làm việc), mới nhất trước — quét ngược chỉ mục
 * [status+date], dừng sớm khi đủ `limit` (không đọc cả bảng).
 * Phân trang bằng con trỏ `before` = giá trị `next` của trang trước ("YYYY-MM-DD|id"); `since` = chỉ lấy từ ngày này.
 * Thứ tự trong cùng một ngày theo id giảm dần (thứ tự của chỉ mục) để con trỏ ổn định.
 */
export async function sessionsWithExercise(
  exerciseId: string,
  opts: { before?: string; limit: number; since?: string; excludeSessionId?: string },
): Promise<{ sessions: WorkoutSession[]; next: string | null }> {
  const [cDate, cId] = opts.before ? (opts.before.split('|') as [string, string | undefined]) : [undefined, undefined];
  const has = (s: WorkoutSession) =>
    s.exercises.flatMap(splitByExercise).some((e) => e.exerciseId === exerciseId && e.sets.some(isWorkingSet));
  const rows = await db.sessions
    .where('[status+date]')
    .between(['completed', opts.since ?? Dexie.minKey], ['completed', cDate ?? Dexie.maxKey], true, true)
    .reverse()
    .filter((s) => {
      if (s.deletedAt || s.id === opts.excludeSessionId) return false;
      if (cDate && s.date === cDate && cId != null && s.id >= cId) return false;
      return has(s);
    })
    .limit(opts.limit + 1)
    .toArray();
  const more = rows.length > opts.limit;
  const page = rows.slice(0, opts.limit);
  const last = page[page.length - 1];
  return { sessions: page, next: more && last ? `${last.date}|${last.id}` : null };
}

/**
 * Id các buổi có kỷ lục (PREvent) của một bài. Đọc tuần tự (each) theo chỉ mục, chỉ giữ buổi có bài này
 * (rút gọn còn đúng bài đó) rồi dùng lại prTimeline.
 */
export async function prSessionIdsFor(exerciseId: string, formula: OneRmFormula): Promise<Set<string>> {
  const mine: WorkoutSession[] = [];
  await db.sessions
    .where('[status+date]')
    .between(['completed', Dexie.minKey], ['completed', Dexie.maxKey])
    .each((s) => {
      if (s.deletedAt) return;
      const parts = s.exercises.flatMap(splitByExercise).filter((e) => e.exerciseId === exerciseId);
      if (parts.some((e) => e.sets.some(isWorkingSet))) mine.push({ ...s, exercises: parts });
    });
  mine.sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
  return new Set(prTimeline(mine, formula).map((e) => e.sessionId));
}

/**
 * Trạng thái chững cho NHIỀU bài, đọc tuần tự (each) chỉ mục [status+date] MỘT lần; chỉ giữ phần bài cần xét.
 * Buổi `excludeSessionId` (buổi đang tập) bị bỏ qua.
 */
export async function stagnationFor(exerciseIds: string[], formula: OneRmFormula, excludeSessionId?: string): Promise<Map<string, Stagnation>> {
  const want = new Set(exerciseIds);
  const per = new Map<string, WorkoutSession[]>();
  await db.sessions
    .where('[status+date]')
    .between(['completed', Dexie.minKey], ['completed', Dexie.maxKey])
    .each((s) => {
      if (s.deletedAt || s.id === excludeSessionId) return;
      const parts = s.exercises.flatMap(splitByExercise).filter((e) => want.has(e.exerciseId) && e.sets.some(isWorkingSet));
      for (const id of new Set(parts.map((p) => p.exerciseId))) {
        const list = per.get(id) ?? [];
        list.push({ ...s, exercises: parts.filter((p) => p.exerciseId === id) });
        per.set(id, list);
      }
    });
  const out = new Map<string, Stagnation>();
  for (const id of want) out.set(id, stagnation(per.get(id) ?? [], id, formula));
  return out;
}
