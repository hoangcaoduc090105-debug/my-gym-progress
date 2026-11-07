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

describe('lastPerformances', () => {
  it('trả đúng buổi gần nhất cho 2 bài (3 ngày khác nhau + 2 buổi cùng ngày), bỏ buổi đang tập và buổi đã xóa', async () => {
    const mk = async (date: string, startedAt: string, items: [string, number][], extra: { deletedAt?: string } = {}) => {
      const s = await repo.startSession({ date });
      await repo.saveSession({
        ...s,
        startedAt,
        exercises: items.map(([exerciseId, kg], i) => ({
          id: `se${date}${startedAt}${i}`,
          exerciseId,
          target: null,
          note: '',
          sets: [{ id: `x${date}${startedAt}${i}`, weightKg: kg, reps: 10, rir: 2, isWarmup: false, done: true }],
        })),
      });
      await repo.finishSession(s.id);
      if (Object.keys(extra).length) await db.sessions.update(s.id, extra);
      return s.id;
    };
    await mk('2026-10-01', '2026-10-01T09:00:00Z', [['db-curl', 8], ['goblet-squat', 16]]);
    await mk('2026-10-05', '2026-10-05T09:00:00Z', [['db-curl', 9]]);
    await mk('2026-10-10', '2026-10-10T07:00:00Z', [['db-curl', 10]]);
    await mk('2026-10-10', '2026-10-10T18:00:00Z', [['db-curl', 11]]); // cùng ngày, muộn hơn
    await mk('2026-10-12', '2026-10-12T09:00:00Z', [['db-curl', 99]], { deletedAt: 'x' }); // đã xóa
    const r = await repo.lastPerformances(['db-curl', 'goblet-squat']);
    expect(r.get('db-curl')).toMatchObject({ date: '2026-10-10', startedAt: '2026-10-10T18:00:00Z' });
    expect(r.get('db-curl')!.exercise.sets[0]!.weightKg).toBe(11);
    expect(r.get('goblet-squat')).toMatchObject({ date: '2026-10-01' });
    expect((await repo.lastPerformances(['khong-co'])).size).toBe(0);
    // lastPerformance (1 bài) dùng cùng logic
    expect((await repo.lastPerformance('db-curl'))?.date).toBe('2026-10-10');
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
    expect(got).not.toHaveProperty('data');
    expect(got!.bytes).toBe(3);
    expect(new Uint8Array((await repo.getPhotoData(p.id))!)).toEqual(new Uint8Array([1, 2, 3]));
    await repo.purgePhoto(p.id);
    expect(await db.photos.get(p.id)).toBeUndefined();
    expect(await db.photoBlobs.get(p.id)).toBeUndefined();
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
  it('cài thực đơn Việt Nam: idempotent, áp dụng cho ra đúng tổng đạm', async () => {
    const { VN_FOODS } = await import('../../src/data/vnFoods');
    const { VN_PLANS, planMacro } = await import('../../src/data/vnMealPlans');
    const { sumLogs } = await import('../../src/domain/nutrition');
    expect(await repo.installVietnameseMenus(VN_FOODS, VN_PLANS)).toEqual({ foods: VN_FOODS.length, plans: VN_PLANS.length });
    expect(await repo.installVietnameseMenus(VN_FOODS, VN_PLANS)).toEqual({ foods: 0, plans: 0 });
    await repo.applyMealPlan('vn-plan-a', '2026-11-10');
    const logs = await db.foodLogs.where('date').equals('2026-11-10').toArray();
    expect(sumLogs(logs).proteinG).toBeCloseTo(planMacro(VN_PLANS[0]!).proteinG, 0);
    expect(logs.every((l) => l.food.isVerified)).toBe(true);
  });
  it('từ chối giá trị dinh dưỡng âm', async () => {
    await expect(
      repo.saveFood({ name: 'x', servingLabel: '1', kcal: -5, proteinG: 0, carbG: 0, fatG: 0, isVerified: false, isFavorite: false }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('buổi tập dở — kiểm tra trong giao dịch', () => {
  it('startSession gọi đồng thời (bấm đúp / hai tab) chỉ tạo đúng 1 buổi dở', async () => {
    const results = await Promise.allSettled([repo.startSession({}), repo.startSession({})]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    expect(rejected?.reason).toBeInstanceOf(AppError);
    expect(await db.sessions.where('status').equals('draft').count()).toBe(1);
  });
  it('restoreSession không khôi phục khi đã có buổi dở khác', async () => {
    const a = await repo.startSession({});
    await repo.softDeleteSession(a.id);
    const b = await repo.startSession({});
    await expect(repo.restoreSession(a.id)).rejects.toBeInstanceOf(AppError);
    expect((await db.sessions.get(a.id))?.deletedAt).not.toBeNull();
    expect((await db.sessions.get(b.id))?.deletedAt).toBeNull();
  });
});

describe('Thay bài cho cả giáo án (v1.8.0)', () => {
  it('đổi exerciseId đúng ngày; ngày khác (kể cả có cùng bài) không đổi', async () => {
    const p = (await repo.getActiveProgram())!;
    // Cho ngày C cũng có goblet-squat để chắc chắn chỉ ngày A đổi
    const withDup = structuredClone(p);
    withDup.days[2]!.exercises[0]!.exerciseId = 'goblet-squat';
    await repo.saveProgram(withDup);
    const r = await repo.replaceExerciseInProgramDay(p.id, 'day-a', 'goblet-squat', 'leg-press');
    const a = r.days.find((d) => d.id === 'day-a')!;
    expect(a.exercises[0]!.exerciseId).toBe('leg-press');
    expect(a.exercises[0]!.id).toBe(withDup.days[0]!.exercises[0]!.id);
    expect(a.exercises.slice(1)).toEqual(withDup.days[0]!.exercises.slice(1));
    expect(r.days.find((d) => d.id === 'day-b')).toEqual(withDup.days[1]);
    expect(r.days.find((d) => d.id === 'day-c')).toEqual(withDup.days[2]);
    expect((await db.programs.get(p.id))!.days[0]!.exercises[0]!.exerciseId).toBe('leg-press');
  });
  it('bài cũ không có trong ngày => báo lỗi, không ghi', async () => {
    const p = (await repo.getActiveProgram())!;
    await expect(repo.replaceExerciseInProgramDay(p.id, 'day-b', 'goblet-squat', 'leg-press')).rejects.toBeInstanceOf(AppError);
    expect((await db.programs.get(p.id))!.days).toEqual(p.days);
  });
  it('lastPerformances gán hiệp đã làm trước khi thay cho bài cũ', async () => {
    const s = await repo.startSession({});
    await repo.saveSession({
      ...s,
      status: 'completed',
      exercises: [
        {
          id: 'se-x',
          exerciseId: 'leg-press',
          replacedFrom: 'goblet-squat',
          target: null,
          note: '',
          sets: [
            { id: 'a', weightKg: 16, reps: 12, rir: 2, isWarmup: false, done: true, replacedFrom: 'goblet-squat' },
            { id: 'b', weightKg: 80, reps: 10, rir: 2, isWarmup: false, done: true },
          ],
        },
      ],
    });
    const m = await repo.lastPerformances(['goblet-squat', 'leg-press']);
    expect(m.get('goblet-squat')!.exercise.sets.map((x) => x.weightKg)).toEqual([16]);
    expect(m.get('leg-press')!.exercise.sets.map((x) => x.weightKg)).toEqual([80]);
    // Lưu qua schema không làm mất replacedFrom
    const saved = (await db.sessions.get(s.id))!;
    expect(saved.exercises[0]!.replacedFrom).toBe('goblet-squat');
    expect(saved.exercises[0]!.sets[0]!.replacedFrom).toBe('goblet-squat');
  });
});

describe('sessionsWithExercise — phân trang (v1.8.0)', () => {
  const mk = (i: number, exerciseId = 'goblet-squat', extra: Partial<import('../../src/db/types').WorkoutSession> = {}) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i));
    const date = d.toISOString().slice(0, 10);
    return {
      id: `hs-${String(i).padStart(3, '0')}`,
      date,
      programId: null,
      programDayId: null,
      dayName: `Buổi ${i}`,
      status: 'completed' as const,
      startedAt: `${date}T10:00:00.000Z`,
      finishedAt: `${date}T11:00:00.000Z`,
      notes: '',
      exercises: [{ id: `se-${i}`, exerciseId, target: null, note: '', sets: [{ id: `st-${i}`, weightKg: 20 + i, reps: 10, rir: 2, isWarmup: false, done: true }] }],
      updatedAt: `${date}T11:00:00.000Z`,
      ...extra,
    };
  };

  it('25 buổi: trang 20 + trang 5, không trùng, mới nhất trước; bỏ buổi không có bài / đã xóa', async () => {
    const { sessionsWithExercise } = await import('../../src/db/history');
    await db.sessions.bulkAdd([
      ...Array.from({ length: 25 }, (_, i) => mk(i)),
      mk(100, 'leg-press'),
      mk(101, 'goblet-squat', { deletedAt: '2026-06-01T00:00:00.000Z' }),
      mk(102, 'goblet-squat', { status: 'draft' }),
    ]);
    const p1 = await sessionsWithExercise('goblet-squat', { limit: 20 });
    expect(p1.sessions).toHaveLength(20);
    expect(p1.sessions[0]!.id).toBe('hs-024');
    expect(p1.next).not.toBeNull();
    const p2 = await sessionsWithExercise('goblet-squat', { limit: 20, before: p1.next! });
    expect(p2.sessions).toHaveLength(5);
    expect(p2.next).toBeNull();
    const ids = [...p1.sessions, ...p2.sessions].map((s) => s.id);
    expect(new Set(ids).size).toBe(25);
    expect(ids).toEqual(Array.from({ length: 25 }, (_, i) => `hs-${String(24 - i).padStart(3, '0')}`));
  });

  it('nhiều buổi cùng ngày: con trỏ không bỏ sót / không lặp; since lọc theo ngày', async () => {
    const { sessionsWithExercise } = await import('../../src/db/history');
    await db.sessions.bulkAdd(Array.from({ length: 5 }, (_, i) => ({ ...mk(i), date: '2026-02-01' })));
    await db.sessions.bulkAdd([mk(60)]);
    const all: string[] = [];
    let next: string | undefined;
    do {
      const r = await sessionsWithExercise('goblet-squat', { limit: 2, before: next });
      all.push(...r.sessions.map((s) => s.id));
      next = r.next ?? undefined;
    } while (next);
    expect(all).toHaveLength(6);
    expect(new Set(all).size).toBe(6);
    const since = await sessionsWithExercise('goblet-squat', { limit: 20, since: '2026-02-02' });
    expect(since.sessions.map((s) => s.id)).toEqual(['hs-060']);
  });

  it('prSessionIdsFor: chỉ buổi có kỷ lục của bài', async () => {
    const { prSessionIdsFor } = await import('../../src/db/history');
    await db.sessions.bulkAdd([mk(0), mk(1), mk(2)]);
    expect([...(await prSessionIdsFor('goblet-squat', 'epley'))].sort()).toEqual(['hs-001', 'hs-002']);
  });
});

describe('superset (v1.8.0)', () => {
  it('startSession / Tập lại mang groupId; giáo án lưu giữ groupId', async () => {
    const p = (await repo.getActiveProgram())!;
    const g = structuredClone(p);
    g.days[0]!.exercises[0]!.groupId = 'grp-1';
    g.days[0]!.exercises[1]!.groupId = 'grp-1';
    await repo.saveProgram(g);
    expect((await db.programs.get(p.id))!.days[0]!.exercises[1]!.groupId).toBe('grp-1');
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a' });
    expect(s.exercises.map((e) => e.groupId ?? null).slice(0, 3)).toEqual(['grp-1', 'grp-1', null]);
    await repo.saveSession({ ...s, status: 'completed', exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, weightKg: 10, reps: 10, done: true })) })) });
    const again = await repo.startRepeatSession(s.id);
    expect(again.exercises.slice(0, 2).map((e) => e.groupId)).toEqual(['grp-1', 'grp-1']);
  });
});

describe('cài đặt đĩa tạ (v1.8.0)', () => {
  it('bản ghi settings cũ (không có barbell) được điền mặc định khi đọc; lưu lại hợp lệ', async () => {
    const cur = (await db.settings.get('app'))!;
    const { barbell: _b, ...old } = cur as typeof cur & { barbell?: unknown };
    await db.settings.put(old as typeof cur);
    const s = await repo.getSettings();
    expect(s.barbell).toEqual({ barWeightKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] });
    expect(s.progression.minRIR).toBe(cur.progression.minRIR);
    const { id: _i, updatedAt: _u, ...rest } = s;
    await repo.saveSettings({ ...rest, barbell: { barWeightKg: 15, platesKg: [20, 10, 5] } });
    expect((await repo.getSettings()).barbell).toEqual({ barWeightKg: 15, platesKg: [20, 10, 5] });
  });
  it('từ chối danh sách đĩa rỗng', async () => {
    const { id: _i, updatedAt: _u, ...rest } = await repo.getSettings();
    await expect(repo.saveSettings({ ...rest, barbell: { barWeightKg: 20, platesKg: [] } })).rejects.toBeInstanceOf(AppError);
  });
});

describe('đơn vị khối lượng (v1.8.0)', () => {
  it('bản ghi cũ không có weightUnit => mặc định kg; lưu lb hợp lệ, dữ liệu vẫn kg', async () => {
    const cur = (await db.settings.get('app'))!;
    const { weightUnit: _w, ...old } = cur as typeof cur & { weightUnit?: unknown };
    await db.settings.put(old as typeof cur);
    expect((await repo.getSettings()).weightUnit).toBe('kg');
    const { id: _i, updatedAt: _u, ...rest } = await repo.getSettings();
    await repo.saveSettings({ ...rest, weightUnit: 'lb' });
    expect((await repo.getSettings()).weightUnit).toBe('lb');
  });
});

describe('deload (v1.8.0)', () => {
  it('startSession isDeload: bớt 1 hiệp mỗi bài, đánh dấu buổi', async () => {
    const p = (await repo.getActiveProgram())!;
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a', isDeload: true });
    expect(s.isDeload).toBe(true);
    s.exercises.forEach((e, i) => {
      const pe = p.days[0]!.exercises[i]!;
      expect(e.target!.sets).toBe(Math.max(1, pe.sets - 1));
      expect(e.sets).toHaveLength(Math.max(1, pe.sets - 1));
    });
  });
  it('lastPerformances bỏ qua buổi deload khi có excludeDeload', async () => {
    const mk = async (date: string, kg: number, isDeload?: boolean) => {
      const s = await repo.startSession({ date, isDeload });
      await repo.saveSession({
        ...s,
        status: 'completed',
        exercises: [{ id: `se-${date}`, exerciseId: 'goblet-squat', target: null, note: '', sets: [{ id: `st-${date}`, weightKg: kg, reps: 10, rir: 2, isWarmup: false, done: true }] }],
      });
    };
    await mk('2026-01-01', 20);
    await mk('2026-01-08', 12, true);
    expect((await repo.lastPerformances(['goblet-squat'])).get('goblet-squat')!.date).toBe('2026-01-08');
    const r = (await repo.lastPerformances(['goblet-squat'], undefined, { excludeDeload: true })).get('goblet-squat')!;
    expect(r.date).toBe('2026-01-01');
    expect(r.exercise.sets[0]!.weightKg).toBe(20);
  });
});
