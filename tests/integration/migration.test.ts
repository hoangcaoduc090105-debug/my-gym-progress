import Dexie from 'dexie';
import { GymDB } from '../../src/db/db';

/** Schema version 1 nguyên gốc (trước v1.7.0) — để giả lập dữ liệu người dùng cũ. */
const V1_STORES = {
  profile: 'id',
  settings: 'id',
  exercises: 'id, primaryMuscle, nameVi',
  programs: 'id, updatedAt',
  schedule: 'id, date',
  sessions: 'id, date, status, updatedAt',
  bodyMetrics: 'id, date',
  photos: 'id, date',
  foods: 'id, name',
  foodLogs: 'id, date',
  mealPlans: 'id',
  meta: 'key',
};

describe('nâng cấp schema v1 → v2', () => {
  it('chuyển bytes ảnh sang photoBlobs, giữ nguyên siêu dữ liệu, thêm chỉ mục [status+date]', async () => {
    const name = `mig-${Math.random().toString(36).slice(2)}`;
    const old = new Dexie(name);
    old.version(1).stores(V1_STORES);
    await old.open();
    const meta = (id: string, date: string) => ({ id, date, pose: 'front', mimeType: 'image/jpeg', note: `ghi chú ${id}`, deletedAt: null, createdAt: `${date}T08:00:00Z` });
    await old.table('photos').bulkAdd([
      { ...meta('ph1', '2026-10-01'), data: new Uint8Array([1, 2, 3]).buffer },
      { ...meta('ph2', '2026-11-01'), data: new Uint8Array([4, 5, 6, 7]).buffer },
    ]);
    await old.table('sessions').add({ id: 's1', date: '2026-11-01', status: 'completed', updatedAt: 'x', exercises: [] });
    old.close();

    const db2 = new GymDB(name);
    await db2.open();
    expect(db2.verno).toBe(2);
    const photos = await db2.photos.orderBy('id').toArray();
    expect(photos).toHaveLength(2);
    for (const p of photos) {
      expect(p).not.toHaveProperty('data');
      expect(p.thumb).toBeNull();
    }
    expect(photos.map((p) => p.bytes)).toEqual([3, 4]);
    expect(photos[0]).toMatchObject(meta('ph1', '2026-10-01'));
    expect(photos[1]).toMatchObject(meta('ph2', '2026-11-01'));
    const blobs = await db2.photoBlobs.orderBy('id').toArray();
    expect(blobs.map((b) => b.id)).toEqual(['ph1', 'ph2']);
    expect(new Uint8Array(blobs[1]!.data)).toEqual(new Uint8Array([4, 5, 6, 7]));
    // Chỉ mục kép mới dùng được
    expect(await db2.sessions.where('[status+date]').equals(['completed', '2026-11-01']).count()).toBe(1);
    db2.close();
    await Dexie.delete(name);
  });
});

describe('ensureThumbnails', () => {
  it('tạo thumbnail còn thiếu theo lô, bỏ qua ảnh lỗi', async () => {
    const { db } = await import('../../src/db/db');
    const { ensureThumbnails } = await import('../../src/db/migrations');
    await db.open();
    await db.photos.clear();
    await db.photoBlobs.clear();
    for (let i = 0; i < 7; i++) {
      await db.photos.add({ id: `t${i}`, date: '2026-11-01', pose: 'front', mimeType: 'image/jpeg', thumb: null, bytes: 3, createdAt: 'x' });
      await db.photoBlobs.add({ id: `t${i}`, data: new Uint8Array([i]).buffer });
    }
    const n = await ensureThumbnails(async (data) => {
      if (new Uint8Array(data)[0] === 3) throw new Error('hỏng');
      return new Uint8Array([9]).buffer;
    });
    expect(n).toBe(6);
    expect(await db.photos.filter((p) => !p.thumb).count()).toBe(1);
  });
});

describe('fixKnownTypos (v1.9)', () => {
  it('sửa "CZhỉnh" trong mô tả giáo án một lần; mô tả khác giữ nguyên; lần sau không quét lại', async () => {
    const { db } = await import('../../src/db/db');
    const { fixKnownTypos, TYPO_FIX_KEY } = await import('../../src/db/migrations');
    const { resetDb } = await import('./helpers');
    await resetDb();
    const p = (await db.programs.toArray())[0]!;
    await db.programs.update(p.id, { description: 'Vòng A → B → C. CZhỉnh sửa tự do.' });
    await db.programs.add({ ...p, id: 'p2', isActive: false, description: 'Mô tả bình thường.' });
    expect(await fixKnownTypos()).toBe(1);
    expect((await db.programs.get(p.id))!.description).toBe('Vòng A → B → C. Chỉnh sửa tự do.');
    expect((await db.programs.get('p2'))!.description).toBe('Mô tả bình thường.');
    expect((await db.meta.get(TYPO_FIX_KEY))?.value).toBe(true);
    await db.programs.update(p.id, { description: 'CZhỉnh lại' });
    expect(await fixKnownTypos()).toBe(0);
  });
});
