import { db } from './db';
import { AppError } from './errors';
import { loadSchemas } from './repo';
import type { Exercise, WorkoutSession } from './types';
import { splitDuplicates } from '../backup/workoutImport';
import { notifyStorageChanged } from '../lib/storage';

export const CSV_NAME_MAP_KEY = 'csvNameMap';

export async function readCsvNameMap(): Promise<Record<string, string>> {
  const m = await db.meta.get(CSV_NAME_MAP_KEY);
  return m && typeof m.value === 'object' && m.value ? (m.value as Record<string, string>) : {};
}

/**
 * Ghi buổi tập nhập từ CSV + bài tự tạo mới + bảng ghép tên trong MỘT giao dịch.
 * Kiểm tra schema TRƯỚC giao dịch (loadSchemas). Buổi trùng (cùng ngày + tên buổi + số hiệp) bị bỏ qua.
 */
export async function importWorkouts(input: {
  sessions: WorkoutSession[];
  newExercises: Exercise[];
  nameMap: Record<string, string>;
}): Promise<{ written: number; skipped: number }> {
  const S = await loadSchemas();
  const check = <T,>(schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: (string | number)[]; message: string }[] } } }, v: T, what: string): T => {
    const r = schema.safeParse(v);
    if (!r.success) {
      const i = r.error!.issues[0]!;
      throw new AppError(`${what} không hợp lệ: ${i.path.join('.') || '(gốc)'} — ${i.message}`);
    }
    return r.data as T;
  };
  const exercises = input.newExercises.map((e) => check(S.exerciseSchema, e, `Bài tập "${e.nameVi}"`));
  const sessions = input.sessions.map((s) => check(S.sessionSchema, s, `Buổi ${s.date} "${s.dayName}"`));
  if (sessions.length === 0) return { written: 0, skipped: 0 };
  const dates = sessions.map((s) => s.date).sort();
  const result = await db.transaction('rw', db.sessions, db.exercises, db.meta, async () => {
    const known = new Set((await db.exercises.toCollection().primaryKeys()) as string[]);
    for (const e of exercises) known.add(e.id);
    const missing = sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)).filter((id) => !known.has(id));
    if (missing.length) throw new AppError('Có bài tập chưa được ghép.', [...new Set(missing)]);
    const existing = await db.sessions.where('date').between(dates[0]!, dates[dates.length - 1]!, true, true).toArray();
    const { fresh, skipped } = splitDuplicates(sessions, existing);
    if (exercises.length) await db.exercises.bulkPut(exercises);
    if (fresh.length) await db.sessions.bulkAdd(fresh);
    const prev = await db.meta.get(CSV_NAME_MAP_KEY);
    await db.meta.put({ key: CSV_NAME_MAP_KEY, value: { ...((prev?.value as Record<string, string>) ?? {}), ...input.nameMap } });
    return { written: fresh.length, skipped };
  });
  notifyStorageChanged();
  return result;
}
