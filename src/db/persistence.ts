import { db } from './db';
import { requestAndRecordPersistence } from '../lib/storage';

/** Đọc kết quả xin lưu trữ bền vững lần gần nhất (meta.persisted). undefined = chưa xin lần nào. */
export async function readPersisted(): Promise<boolean | null | undefined> {
  const m = await db.meta.get('persisted');
  return m ? (m.value as boolean | null) : undefined;
}

/** Gọi sau khi hoàn thành một buổi: nếu đây là buổi hoàn thành đầu tiên và chưa được cấp thì xin lại. */
export async function persistAfterFirstWorkout(): Promise<boolean | null | undefined> {
  try {
    if ((await readPersisted()) === true) return true;
    const done = await db.sessions.where('status').equals('completed').count();
    if (done !== 1) return undefined;
    return await requestAndRecordPersistence();
  } catch {
    return null;
  }
}
