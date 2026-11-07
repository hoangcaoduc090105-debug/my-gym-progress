import { SEED_VERSION } from '../data/seedVersion';
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
  // Đã cập nhật => không tải dữ liệu thư viện (giữ chunk chính nhỏ). Cần nạp => import động TRƯỚC giao dịch
  // (await một promise không phải của Dexie bên trong giao dịch sẽ làm giao dịch đóng sớm).
  const seen = await db.meta.get('seedVersion');
  if (typeof seen?.value === 'number' && seen.value >= SEED_VERSION) return;
  const [{ BUILTIN_EXERCISES }, { createDefaultProgram }] = await Promise.all([import('../data/exercises'), import('../data/defaultProgram')]);
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
