import { db } from '../../src/db/db';
import * as repo from '../../src/db/repo';
import { countConflicts, exportAll, importBackup, parseBackupText, validateBackup } from '../../src/backup/backup';
import { resetDb } from './helpers';

beforeEach(resetDb);

async function seedUserData() {
  await repo.saveProfile({ sex: 'male', heightCm: 174, goals: 'x', proteinTargetMinG: 105, proteinTargetMaxG: 130 });
  await repo.saveBodyMetric({ date: '2026-11-07', weightKg: 65, waistCm: 76 });
  await repo.addPhoto({ date: '2026-11-07', pose: 'front', mimeType: 'image/png', data: new Uint8Array([9, 8, 7, 6]).buffer });
  const p = (await repo.getActiveProgram())!;
  const s = await repo.startSession({ programId: p.id, programDayId: 'day-a', date: '2026-11-07' });
  s.exercises[0]!.sets[0] = { ...s.exercises[0]!.sets[0]!, weightKg: 16, reps: 10, done: true };
  await repo.saveSession(s);
  await repo.finishSession(s.id);
  const f = await repo.saveFood({ name: 'Trứng', servingLabel: '1 quả', kcal: 70, proteinG: 6, carbG: 0.5, fatG: 5, isVerified: false, isFavorite: false });
  await repo.addFoodLog({ date: '2026-11-07', meal: 'breakfast', foodId: f.id, servings: 2 });
}

describe('export / import', () => {
  it('khứ hồi: xuất → xóa hết → nhập (replace) cho dữ liệu y hệt, kể cả ảnh', async () => {
    await seedUserData();
    const backup = await exportAll({ includePhotos: true, appVersion: 'test' });
    const json = JSON.stringify(backup);
    const before = {
      sessions: await db.sessions.toArray(),
      metrics: await db.bodyMetrics.toArray(),
      profile: await db.profile.toArray(),
    };
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
    const parsed = parseBackupText(json);
    expect(parsed.ok).toBe(true);
    await importBackup(parsed.backup!, 'replace');
    expect(await db.sessions.toArray()).toEqual(before.sessions);
    expect(await db.bodyMetrics.toArray()).toEqual(before.metrics);
    expect(await db.profile.toArray()).toEqual(before.profile);
    const photo = (await db.photos.toArray())[0]!;
    expect(new Uint8Array(photo.data)).toEqual(new Uint8Array([9, 8, 7, 6]));
    expect(await db.foodLogs.count()).toBe(1);
  });

  it('xuất không kèm ảnh + replace không xóa ảnh đang có', async () => {
    await seedUserData();
    const backup = await exportAll({ includePhotos: false, appVersion: 'test' });
    expect(backup.data.photos).toHaveLength(0);
    await importBackup(validateBackup(JSON.parse(JSON.stringify(backup))).backup!, 'replace');
    expect(await db.photos.count()).toBe(1);
  });

  it('merge giữ dữ liệu hiện có, ghi đè bản ghi trùng id', async () => {
    await seedUserData();
    const backup = JSON.parse(JSON.stringify(await exportAll({ includePhotos: false, appVersion: 't' })));
    backup.data.bodyMetrics[0].weightKg = 66;
    await repo.saveBodyMetric({ date: '2026-11-08', weightKg: 65.5 });
    const v = validateBackup(backup);
    expect(await countConflicts(v.backup!)).toBeGreaterThan(0);
    await importBackup(v.backup!, 'merge');
    const all = await db.bodyMetrics.orderBy('date').toArray();
    expect(all.map((m) => m.weightKg)).toEqual([66, 65.5]);
  });

  it('tệp không hợp lệ bị từ chối với thông báo rõ ràng, DB không thay đổi', async () => {
    await seedUserData();
    const countBefore = await db.sessions.count();
    expect(parseBackupText('{not json').errors[0]).toMatch(/JSON/);
    expect(validateBackup([]).ok).toBe(false);
    expect(validateBackup({ app: 'other', formatVersion: 1, data: {} }).errors.join()).toMatch(/không phải bản sao lưu/);
    expect(validateBackup({ app: 'my-gym-progress', formatVersion: 99, data: {} }).errors.join()).toMatch(/phiên bản mới hơn/);
    const bad = {
      app: 'my-gym-progress',
      formatVersion: 1,
      data: { bodyMetrics: [{ id: 'x', date: '2026-99-01', weightKg: 'nặng', createdAt: 'a', updatedAt: 'a' }], unknownTable: [] },
    };
    const res = validateBackup(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('Số đo cơ thể #1'))).toBe(true);
    expect(res.errors.some((e) => e.includes('unknownTable'))).toBe(true);
    await expect(importBackup(bad as never, 'replace')).rejects.toThrow(/không hợp lệ/);
    expect(await db.sessions.count()).toBe(countBefore);
  });

  it('phát hiện id trùng trong tệp', () => {
    const row = { id: 'a', date: '2026-11-07', weightKg: 65, createdAt: 'x', updatedAt: 'x' };
    const r = validateBackup({ app: 'my-gym-progress', formatVersion: 1, data: { bodyMetrics: [row, row] } });
    expect(r.errors.join()).toMatch(/trùng id/);
  });

  it('loại bỏ trường lạ khi nhập', async () => {
    const r = validateBackup({
      app: 'my-gym-progress',
      formatVersion: 1,
      data: { bodyMetrics: [{ id: 'a', date: '2026-11-07', weightKg: 65, createdAt: 'x', updatedAt: 'x', evil: '<script>' }] },
    });
    await importBackup(r.backup!, 'merge');
    expect(await db.bodyMetrics.get('a')).not.toHaveProperty('evil');
  });
});
