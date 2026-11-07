import { BUILTIN_EXERCISES, SEED_VERSION } from '../data/exercises';
import { createDefaultProgram } from '../data/defaultProgram';
import { nowISO } from '../lib/date';
import { db } from './db';
import { defaultSettings } from './defaults';

/**
 * Nạp thư viện bài tập gốc và giáo án mặc định. Idempotent:
 * - Bài tập gốc: chỉ thêm/cập nhật bài isCustom=false; không đụng bài người dùng tạo.
 * - Giáo án mặc định chỉ tạo ở lần đầu tiên (không tạo lại nếu người dùng đã xóa).
 * - Không tạo bất kỳ dữ liệu cá nhân nào (hồ sơ, cân nặng...) — người dùng tự nhập khi mở app.
 */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.exercises, db.programs, db.settings, db.meta, async () => {
    const meta = await db.meta.get('seedVersion');
    const current = typeof meta?.value === 'number' ? meta.value : 0;
    if (current >= SEED_VERSION) return;
    const now = nowISO();
    const existing = await db.exercises.bulkGet(BUILTIN_EXERCISES.map((e) => e.id));
    const toPut = BUILTIN_EXERCISES.filter((_e, i) => {
      const ex = existing[i];
      return !ex || !ex.isCustom;
    });
    await db.exercises.bulkPut(toPut);
    if (current === 0) {
      if ((await db.programs.count()) === 0) await db.programs.add(createDefaultProgram(now));
      if (!(await db.settings.get('app'))) await db.settings.add(defaultSettings(now));
    }
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}
