import { db } from '../../src/db/db';
import { ensureSeed } from '../../src/db/seed';
import * as repo from '../../src/db/repo';
import { AppError } from '../../src/db/errors';
import { BUILTIN_EXERCISES } from '../../src/data/exercises';
import { resetDb } from './helpers';

beforeEach(resetDb);

describe('seed', () => {
  it('nạp thư viện và giáo án mặc định, không tạo hồ sơ/dữ liệu cá nhân', async () => {
    expect(await db.exercises.count()).toBe(BUILTIN_EXERCISES.length);
    expect(await db.programs.count()).toBe(1);
    expect(await db.profile.count()).toBe(0);
    expect(await db.bodyMetrics.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
  });
  it('idempotent: chạy lại không nhân đôi, không tạo lại giáo án đã xóa', async () => {
    const p = await repo.getActiveProgram();
    await repo.deleteProgram(p!.id);
    await ensureSeed();
    expect(await db.programs.count()).toBe(0);
    expect(await db.exercises.count()).toBe(BUILTIN_EXERCISES.length);
  });
  it('nâng cấp từ bản cũ (seed v1): cập nhật nội dung bài gốc, giữ bài tự tạo và giáo án của người dùng', async () => {
    const custom = await repo.saveCustomExercise({
      nameVi: 'Bài riêng', nameEn: '', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'other', region: 'core',
      isBodyweight: true, instructions: [], commonMistakes: [], alternativeIds: [],
    });
    const p = (await repo.getActiveProgram())!;
    await repo.saveProgram({ ...p, name: 'Giáo án đã sửa' });
    const old = (await db.exercises.get('goblet-squat'))!;
    const { setup: _s, breathing: _b, feel: _f, tips: _t, ...withoutGuide } = old;
    void _s, _b, _f, _t;
    await db.exercises.put(withoutGuide);
    await db.meta.put({ key: 'seedVersion', value: 1 });
    await ensureSeed();
    expect((await db.exercises.get('goblet-squat'))?.setup?.length).toBeGreaterThan(0);
    expect(await db.exercises.get(custom.id)).toBeDefined();
    expect((await db.programs.toArray()).map((x) => x.name)).toEqual(['Giáo án đã sửa']);
  });
  it('mọi bài trong giáo án mặc định có hướng dẫn chi tiết cho người mới', async () => {
    const p = (await repo.getActiveProgram())!;
    for (const d of p.days)
      for (const x of d.exercises) {
        const e = (await db.exercises.get(x.exerciseId))!;
        expect(e.setup?.length, e.id).toBeGreaterThan(0);
        expect(e.breathing, e.id).toBeTruthy();
        expect(e.feel, e.id).toBeTruthy();
        expect(e.tips?.length, e.id).toBeGreaterThan(0);
      }
  });
  it('mọi bài thay thế và bài trong giáo án đều tồn tại', async () => {
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id));
    for (const e of BUILTIN_EXERCISES) for (const a of e.alternativeIds) expect(ids.has(a), `${e.id} → ${a}`).toBe(true);
    const p = await repo.getActiveProgram();
    for (const d of p!.days) for (const x of d.exercises) expect(ids.has(x.exerciseId)).toBe(true);
  });
});

describe('profile & settings', () => {
  it('lưu và đọc lại hồ sơ, kiểm tra hợp lệ', async () => {
    await repo.saveProfile({ sex: 'male', heightCm: 174, goals: 'Tăng cơ', proteinTargetMinG: 105, proteinTargetMaxG: 130 });
    expect((await repo.getProfile())?.heightCm).toBe(174);
    await expect(repo.saveProfile({ sex: 'male', heightCm: 50, goals: '', proteinTargetMinG: 105, proteinTargetMaxG: 130 })).rejects.toBeInstanceOf(AppError);
    await expect(repo.saveProfile({ sex: 'male', heightCm: 174, goals: '', proteinTargetMinG: 140, proteinTargetMaxG: 130 })).rejects.toBeInstanceOf(AppError);
  });
  it('cài đặt mặc định và cập nhật', async () => {
    const s = await repo.getSettings();
    expect(s.oneRmFormula).toBe('epley');
    await repo.saveSettings({ ...s, restTimerDefaultSec: 120 });
    expect((await repo.getSettings()).restTimerDefaultSec).toBe(120);
  });
});

describe('exercises', () => {
  it('thêm, sửa bài tự tạo; không sửa/xóa bài gốc', async () => {
    const e = await repo.saveCustomExercise({
      nameVi: 'Bài của tôi',
      nameEn: 'My move',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      equipment: 'cable',
      region: 'upper',
      isBodyweight: false,
      instructions: ['a'],
      commonMistakes: [],
      alternativeIds: [],
    });
    expect(e.isCustom).toBe(true);
    const e2 = await repo.saveCustomExercise({ ...e, nameVi: 'Đổi tên' });
    expect(e2.id).toBe(e.id);
    expect((await db.exercises.get(e.id))?.nameVi).toBe('Đổi tên');
    await expect(repo.saveCustomExercise({ ...BUILTIN_EXERCISES[0]! })).rejects.toThrow(/bài tập gốc/);
    await expect(repo.deleteCustomExercise('db-bench-press')).rejects.toThrow();
    await repo.deleteCustomExercise(e.id);
    expect(await db.exercises.get(e.id)).toBeUndefined();
  });
  it('không xóa bài tự tạo đang có trong lịch sử', async () => {
    const e = await repo.saveCustomExercise({
      nameVi: 'X', nameEn: '', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'other', region: 'core',
      isBodyweight: true, instructions: [], commonMistakes: [], alternativeIds: [],
    });
    const s = await repo.startSession({});
    await repo.saveSession({ ...s, exercises: [{ id: 'a', exerciseId: e.id, target: null, note: '', sets: [] }] });
    await expect(repo.deleteCustomExercise(e.id)).rejects.toThrow(/bảo toàn lịch sử/);
  });
});

describe('programs', () => {
  it('chỉ một giáo án active', async () => {
    const p = (await repo.getActiveProgram())!;
    const copy = await repo.duplicateProgram(p.id);
    expect(copy.isActive).toBe(false);
    await repo.setActiveProgram(copy.id);
    const active = await db.programs.filter((x) => x.isActive).toArray();
    expect(active.map((x) => x.id)).toEqual([copy.id]);
  });
  it('từ chối giáo án chứa bài không tồn tại hoặc rep range sai', async () => {
    const p = (await repo.getActiveProgram())!;
    const bad = structuredClone(p);
    bad.days[0]!.exercises[0]!.exerciseId = 'khong-ton-tai';
    await expect(repo.saveProgram(bad)).rejects.toThrow(/không tồn tại/);
    const bad2 = structuredClone(p);
    bad2.days[0]!.exercises[0]!.repMax = 5;
    await expect(repo.saveProgram(bad2)).rejects.toBeInstanceOf(AppError);
  });
});

describe('workout sessions', () => {
  it('bắt đầu từ giáo án: tạo đủ bài và hiệp theo mục tiêu', async () => {
    const p = (await repo.getActiveProgram())!;
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a', date: '2026-11-07' });
    expect(s.status).toBe('draft');
    expect(s.exercises).toHaveLength(p.days[0]!.exercises.length);
    expect(s.exercises[0]!.sets).toHaveLength(3);
    expect(await repo.getDraftSession()).toBeDefined();
  });
  it('không cho 2 buổi đang tập cùng lúc', async () => {
    await repo.startSession({});
    await expect(repo.startSession({})).rejects.toThrow(/chưa hoàn thành/);
  });
  it('lưu từng hiệp, hoàn thành, lịch sử còn nguyên sau khi mở lại DB', async () => {
    const p = (await repo.getActiveProgram())!;
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a', date: '2026-11-07' });
    const ex0 = s.exercises[0]!;
    ex0.sets[0] = { ...ex0.sets[0]!, weightKg: 16, reps: 12, rir: 2, done: true };
    await repo.saveSession(s);
    await expect(repo.finishSession('khong-co')).rejects.toThrow();
    const done = await repo.finishSession(s.id);
    expect(done.status).toBe('completed');
    db.close();
    await db.open();
    const again = await db.sessions.get(s.id);
    expect(again?.exercises[0]?.sets[0]).toMatchObject({ weightKg: 16, reps: 12, done: true });
    const last = await repo.lastPerformance(ex0.exerciseId);
    expect(last?.date).toBe('2026-11-07');
  });
  it('không hoàn thành khi chưa có hiệp nào ✓', async () => {
    const s = await repo.startSession({});
    await expect(repo.finishSession(s.id)).rejects.toThrow(/chưa có hiệp/);
  });
  it('xóa mềm, khôi phục, xóa hẳn', async () => {
    const s = await repo.startSession({});
    await repo.softDeleteSession(s.id);
    expect(await repo.getDraftSession()).toBeUndefined();
    expect((await repo.trashCounts()).sessions).toBe(1);
    await repo.restoreSession(s.id);
    expect(await repo.getDraftSession()).toBeDefined();
    await repo.purgeSession(s.id);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('body metrics & photos', () => {
  it('lưu số đo, cần ít nhất 1 chỉ số, sửa giữ id', async () => {
    const m = await repo.saveBodyMetric({ date: '2026-11-07', weightKg: 65 });
    const m2 = await repo.saveBodyMetric({ id: m.id, date: '2026-11-07', weightKg: 65.2, waistCm: 76 });
    expect(m2.id).toBe(m.id);
    expect(await db.bodyMetrics.count()).toBe(1);
    await expect(repo.saveBodyMetric({ date: '2026-11-07' })).rejects.toMatchObject({ details: [expect.stringContaining('ít nhất một')] });
    await expect(repo.saveBodyMetric({ date: '2026-13-01', weightKg: 65 })).rejects.toBeInstanceOf(AppError);
    await expect(repo.saveBodyMetric({ date: '2026-11-07', weightKg: -1 })).rejects.toBeInstanceOf(AppError);
  });
  it('ảnh: lưu ArrayBuffer, từ chối định dạng lạ', async () => {
    const p = await repo.addPhoto({ date: '2026-11-07', pose: 'front', mimeType: 'image/jpeg', data: new Uint8Array([1, 2, 3]).buffer });
    const got = await db.photos.get(p.id);
    expect(new Uint8Array(got!.data)).toEqual(new Uint8Array([1, 2, 3]));
    await expect(repo.addPhoto({ date: '2026-11-07', pose: 'front', mimeType: 'image/gif', data: new ArrayBuffer(3) })).rejects.toBeInstanceOf(AppError);
  });
});

describe('nutrition', () => {
  it('thêm thực phẩm, ghi nhật ký với snapshot, áp dụng thực đơn', async () => {
    const f = await repo.saveFood({
      name: 'Ức gà luộc', servingLabel: '100 g', servingGrams: 100, kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6,
      isVerified: false, isFavorite: true,
    });
    const l = await repo.addFoodLog({ date: '2026-11-07', meal: 'lunch', foodId: f.id, servings: 2 });
    expect(l.food.proteinG).toBe(31);
    await repo.saveFood({ ...f, proteinG: 25 });
    expect((await db.foodLogs.get(l.id))?.food.proteinG).toBe(31);
    await repo.updateFoodLogServings(l.id, 1.5);
    expect((await db.foodLogs.get(l.id))?.servings).toBe(1.5);
    await expect(repo.updateFoodLogServings(l.id, 0)).rejects.toBeInstanceOf(AppError);
    const plan = await repo.saveMealPlan({ name: 'Ngày tập', items: [{ foodId: f.id, meal: 'dinner', servings: 1 }, { foodId: 'gone', meal: 'snack', servings: 1 }] });
    const r = await repo.applyMealPlan(plan.id, '2026-11-08');
    expect(r).toEqual({ added: 1, skipped: 1 });
    await repo.deleteFoodLog(l.id);
    expect(await db.foodLogs.count()).toBe(1);
  });
  it('từ chối giá trị dinh dưỡng âm', async () => {
    await expect(
      repo.saveFood({ name: 'x', servingLabel: '1', kcal: -5, proteinG: 0, carbG: 0, fatG: 0, isVerified: false, isFavorite: false }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
