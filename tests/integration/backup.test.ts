import { db } from '../../src/db/db';
import * as repo from '../../src/db/repo';
import { countConflicts, exportAll, exportAllToBlob, importBackup, parseBackupText, validateBackup } from '../../src/backup/backup';
import { BUILTIN_EXERCISES } from '../../src/data/exercises';
import { createDefaultProgram } from '../../src/data/defaultProgram';
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
    expect(new Uint8Array((await db.photoBlobs.get(photo.id))!.data)).toEqual(new Uint8Array([9, 8, 7, 6]));
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

  it('nhập tệp v1.6 có ảnh: ảnh vào đủ 2 bảng (photos + photoBlobs)', async () => {
    const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes));
    const v16 = {
      app: 'my-gym-progress',
      formatVersion: 1,
      exportedAt: '2026-11-07T00:00:00Z',
      appVersion: '1.6.1',
      includesPhotos: true,
      data: {
        photos: [
          { id: 'p1', date: '2026-11-01', pose: 'front', mimeType: 'image/jpeg', deletedAt: null, createdAt: 'x', dataBase64: b64([1, 2, 3]) },
          { id: 'p2', date: '2026-11-02', pose: 'side', mimeType: 'image/png', deletedAt: null, createdAt: 'x', dataBase64: b64([4, 5]) },
        ],
      },
    };
    const v = validateBackup(JSON.parse(JSON.stringify(v16)));
    expect(v.ok).toBe(true);
    await importBackup(v.backup!, 'replace');
    const photos = await db.photos.orderBy('id').toArray();
    expect(photos.map((p) => [p.id, p.bytes, p.thumb])).toEqual([
      ['p1', 3, null],
      ['p2', 2, null],
    ]);
    expect(photos[0]).not.toHaveProperty('data');
    expect(new Uint8Array((await db.photoBlobs.get('p2'))!.data)).toEqual(new Uint8Array([4, 5]));
  });

  it('xuất rồi nhập lại (replace): số ảnh và bytes bằng nhau, tệp xuất đúng định dạng cũ', async () => {
    await repo.addPhoto({ date: '2026-11-01', pose: 'front', mimeType: 'image/jpeg', data: new Uint8Array([1, 2, 3, 4]).buffer, thumb: new Uint8Array([7]).buffer });
    await repo.addPhoto({ date: '2026-11-02', pose: 'back', mimeType: 'image/jpeg', data: new Uint8Array([5, 6]).buffer });
    const before = await db.photos.toArray();
    const beforeBytes = (await db.photoBlobs.toArray()).reduce((n, b) => n + b.data.byteLength, 0);
    const file = JSON.parse(JSON.stringify(await exportAll({ includePhotos: true, appVersion: 't' })));
    for (const p of file.data.photos) {
      expect(p).toHaveProperty('dataBase64');
      expect(p).not.toHaveProperty('thumb');
      expect(p).not.toHaveProperty('bytes');
    }
    await importBackup(validateBackup(file).backup!, 'replace');
    expect(await db.photos.count()).toBe(before.length);
    expect(await db.photoBlobs.count()).toBe(before.length);
    expect((await db.photoBlobs.toArray()).reduce((n, b) => n + b.data.byteLength, 0)).toBe(beforeBytes);
    expect((await db.photos.toArray()).reduce((n, p) => n + p.bytes, 0)).toBe(beforeBytes);
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

/** jsdom chưa có Blob.text() — đọc bằng FileReader. */
const readBlob = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsText(b);
  });

describe('sao lưu lớn & kiểm tra chặt (v1.7.0)', () => {
  const file = (data: Record<string, unknown[]>) => ({ app: 'my-gym-progress', formatVersion: 1, exportedAt: 'x', appVersion: 't', includesPhotos: true, data });
  const draft = (id: string) => ({
    id, date: '2026-11-07', programId: null, programDayId: null, dayName: `Dở ${id}`, status: 'draft', startedAt: 'x', finishedAt: null,
    notes: '', exercises: [], scheduleId: null, deletedAt: null, updatedAt: 'x',
  });

  it('exportAllToBlob: nội dung giống hệt exportAll (kể cả ảnh base64)', async () => {
    await seedUserData();
    const blob = await exportAllToBlob({ includePhotos: true, appVersion: 't' });
    const text = await readBlob(blob);
    const fromBlob = JSON.parse(text);
    const plain = JSON.parse(JSON.stringify(await exportAll({ includePhotos: true, appVersion: 't' })));
    delete fromBlob.exportedAt;
    delete plain.exportedAt;
    expect(fromBlob).toEqual(plain);
    expect(fromBlob.data.photos[0].dataBase64).toBe(btoa(String.fromCharCode(9, 8, 7, 6)));
    expect(validateBackup(JSON.parse(text)).ok).toBe(true);
  });

  it('ảnh base64 hỏng bị từ chối ở bước validate, không ghi gì vào DB', async () => {
    const before = await db.photos.count();
    const bad = file({ photos: [{ id: 'p1', date: '2026-11-01', pose: 'front', mimeType: 'image/jpeg', deletedAt: null, createdAt: 'x', dataBase64: '@@@không phải base64@@@' }] });
    const v = validateBackup(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/Ảnh thứ 1 hỏng/);
    await expect(importBackup(bad as never, 'replace')).rejects.toThrow(/không hợp lệ/);
    expect(await db.photos.count()).toBe(before);
    expect(await db.photoBlobs.count()).toBe(0);
  });

  it('tệp có 2 giáo án đang dùng bị từ chối', () => {
    const a = createDefaultProgram('x');
    const b = { ...a, id: 'prog-2', name: 'Khác' };
    const v = validateBackup(file({ programs: [a, b] }));
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/2 giáo án đang dùng/);
  });

  it('tệp có 2 buổi dở chưa xóa bị từ chối', () => {
    const v = validateBackup(file({ sessions: [draft('d1'), draft('d2')] }));
    expect(v.errors.join()).toMatch(/2 buổi tập dở/);
  });

  it('tham chiếu tới bài tập không tồn tại bị từ chối', () => {
    const p = createDefaultProgram('x');
    p.days[0]!.exercises[0]!.exerciseId = 'bai-khong-co';
    expect(validateBackup(file({ programs: [p] })).errors.join()).toMatch(/bài-khong-co|bai-khong-co/);
  });

  it('merge khi máy đang có buổi dở khác: DB chỉ còn 1 buổi dở chưa xóa, có thông báo', async () => {
    const mine = await repo.startSession({});
    const r = await importBackup(validateBackup(file({ sessions: [draft('tu-tep')] })).backup!, 'merge');
    const drafts = await db.sessions.where('status').equals('draft').filter((x) => !x.deletedAt).toArray();
    expect(drafts.map((x) => x.id)).toEqual([mine.id]);
    expect((await db.sessions.get('tu-tep'))?.deletedAt).toBeTruthy();
    expect(r.notices.join()).toMatch(/Thùng rác/);
  });

  it('replace: nạp lại thư viện gốc => số bài = bài gốc + bài tự tạo trong tệp', async () => {
    const custom = {
      id: 'ex_custom', nameVi: 'Bài riêng', nameEn: '', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'other', region: 'core',
      isBodyweight: true, instructions: [], commonMistakes: [], alternativeIds: [], isCustom: true, createdAt: 'x', updatedAt: 'x',
    };
    // Tệp cũ chỉ chứa bài tự tạo + 1 bài gốc phiên bản cũ (thiếu hướng dẫn chi tiết)
    const oldBuiltin = { ...BUILTIN_EXERCISES[0]!, setup: undefined, tips: undefined };
    await importBackup(validateBackup(file({ exercises: [custom, oldBuiltin] })).backup!, 'replace');
    expect(await db.exercises.count()).toBe(BUILTIN_EXERCISES.length + 1);
    expect((await db.exercises.get(BUILTIN_EXERCISES[0]!.id))?.setup?.length).toBeGreaterThan(0);
  });
});

describe('định dạng 2 (v1.8.0)', () => {
  it('xuất formatVersion 2; khứ hồi giữ groupId (giáo án + buổi) và replacedFrom', async () => {
    const p = (await repo.getActiveProgram())!;
    const g = structuredClone(p);
    g.days[0]!.exercises[0]!.groupId = 'grp-x';
    g.days[0]!.exercises[1]!.groupId = 'grp-x';
    await repo.saveProgram(g);
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a', date: '2026-11-07' });
    s.exercises[0]!.sets[0] = { ...s.exercises[0]!.sets[0]!, weightKg: 16, reps: 10, done: true, replacedFrom: 'leg-press' };
    s.exercises[0]!.replacedFrom = 'leg-press';
    await repo.saveSession(s);
    await repo.finishSession(s.id);
    const backup = await exportAll({ includePhotos: false, appVersion: 'test' });
    expect(backup.formatVersion).toBe(2);
    const before = { sessions: await db.sessions.toArray(), programs: await db.programs.toArray() };
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
    const parsed = parseBackupText(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    await importBackup(parsed.backup!, 'replace');
    expect(await db.sessions.toArray()).toEqual(before.sessions);
    expect((await db.programs.get(p.id))!.days[0]!.exercises.slice(0, 2).map((e) => e.groupId)).toEqual(['grp-x', 'grp-x']);
    const se = (await db.sessions.get(s.id))!.exercises[0]!;
    expect([se.groupId, se.replacedFrom, se.sets[0]!.replacedFrom]).toEqual(['grp-x', 'leg-press', 'leg-press']);
  });
  it('tệp formatVersion 1 vẫn nhập được', async () => {
    await seedUserData();
    const backup = await exportAll({ includePhotos: false, appVersion: 'old' });
    const v1 = { ...backup, formatVersion: 1 };
    const parsed = parseBackupText(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    await importBackup(parsed.backup!, 'replace');
    expect(await db.sessions.count()).toBe(1);
  });
});

describe('extras.csvNameMap (v1.9)', () => {
  const map = { 'bench press barbell': 'bb-bench-press', 'leg press': 'leg-press' };

  it('xuất kèm bảng ghép tên khi có; không có thì không xuất trường extras', async () => {
    await seedUserData();
    expect((await exportAll({ includePhotos: false, appVersion: 't' })).extras).toBeUndefined();
    await db.meta.put({ key: 'csvNameMap', value: map });
    const b = await exportAll({ includePhotos: false, appVersion: 't' });
    expect(b.extras).toEqual({ csvNameMap: map });
    const text = await readBlob(await exportAllToBlob({ includePhotos: false, appVersion: 't' }));
    expect(JSON.parse(text).extras).toEqual({ csvNameMap: map });
  });

  it('nhập replace => thay toàn bộ; nhập merge => gộp, tệp đè', async () => {
    await seedUserData();
    await db.meta.put({ key: 'csvNameMap', value: map });
    const b = await exportAll({ includePhotos: false, appVersion: 't' });
    await db.meta.put({ key: 'csvNameMap', value: { 'leg press': 'hack-squat', 'squat': 'back-squat' } });
    await importBackup(validateBackup(JSON.parse(JSON.stringify(b))).backup!, 'merge');
    expect((await db.meta.get('csvNameMap'))?.value).toEqual({ 'leg press': 'leg-press', squat: 'back-squat', 'bench press barbell': 'bb-bench-press' });
    await db.meta.put({ key: 'csvNameMap', value: { squat: 'back-squat' } });
    await importBackup(validateBackup(JSON.parse(JSON.stringify(b))).backup!, 'replace');
    expect((await db.meta.get('csvNameMap'))?.value).toEqual(map);
  });

  it('extras sai kiểu bị từ chối; tệp định dạng 1 không có extras vẫn nhập được', async () => {
    await seedUserData();
    const b = await exportAll({ includePhotos: false, appVersion: 't' });
    const bad = { ...JSON.parse(JSON.stringify(b)), extras: { csvNameMap: { x: 5 } } };
    const v = validateBackup(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toContain('extras');
    const old = { ...JSON.parse(JSON.stringify(b)), formatVersion: 1 };
    delete old.extras;
    expect(validateBackup(old).ok).toBe(true);
  });
});
