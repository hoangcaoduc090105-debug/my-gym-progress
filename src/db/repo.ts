import type { z } from 'zod';
import { db } from './db';
import { defaultSettings } from './defaults';
import { AppError } from './errors';
import {
  bodyMetricSchema,
  exerciseSchema,
  foodLogSchema,
  foodSchema,
  formatZodError,
  mealPlanSchema,
  photoMetaSchema,
  profileSchema,
  programSchema,
  scheduleSchema,
  sessionSchema,
  settingsSchema,
} from './schemas';
import type {
  BodyMetric,
  Exercise,
  Food,
  FoodLog,
  MealPlan,
  MealSlot,
  Profile,
  Program,
  ProgressPhoto,
  ScheduledWorkout,
  SessionExercise,
  SetEntry,
  Settings,
  WorkoutSession,
} from './types';
import { nowISO, todayISO } from '../lib/date';
import { uid } from '../lib/id';
import { isWorkingSet } from '../domain/sets';

function validate<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new AppError(`Dữ liệu ${what} không hợp lệ`, formatZodError(r.error));
  return r.data;
}

// ---------------- HỒ SƠ & CÀI ĐẶT ----------------

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me');
}

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const prev = await db.profile.get('me');
  const now = nowISO();
  const p = validate(profileSchema, { ...input, id: 'me', createdAt: prev?.createdAt ?? now, updatedAt: now }, 'hồ sơ') as Profile;
  await db.profile.put(p);
  return p;
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app');
  const d = defaultSettings(nowISO());
  if (!s) return d;
  // Gộp với mặc định để bản cũ thiếu trường mới vẫn chạy.
  return { ...d, ...s, progression: { ...d.progression, ...s.progression } };
}

export async function saveSettings(s: Omit<Settings, 'id' | 'updatedAt'>): Promise<Settings> {
  const v = validate(settingsSchema, { ...s, id: 'app', updatedAt: nowISO() }, 'cài đặt') as Settings;
  await db.settings.put(v);
  return v;
}

// ---------------- BÀI TẬP ----------------

export type ExerciseInput = Omit<Exercise, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'> & { id?: string };

export async function saveCustomExercise(input: ExerciseInput): Promise<Exercise> {
  const now = nowISO();
  const prev = input.id ? await db.exercises.get(input.id) : undefined;
  if (prev && !prev.isCustom) throw new AppError('Không thể sửa bài tập gốc của thư viện. Hãy tạo bài tập mới.');
  const ex = validate(
    exerciseSchema,
    {
      ...input,
      id: prev?.id ?? uid('ex'),
      isCustom: true,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    },
    'bài tập',
  ) as Exercise;
  await db.exercises.put(ex);
  return ex;
}

export async function exerciseUsage(exerciseId: string): Promise<{ sessions: number; programs: number }> {
  const sessions = await db.sessions.filter((s) => !s.deletedAt && s.exercises.some((e) => e.exerciseId === exerciseId)).count();
  const programs = await db.programs.filter((p) => p.days.some((d) => d.exercises.some((e) => e.exerciseId === exerciseId))).count();
  return { sessions, programs };
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const ex = await db.exercises.get(id);
  if (!ex) return;
  if (!ex.isCustom) throw new AppError('Không thể xóa bài tập gốc của thư viện.');
  const usage = await exerciseUsage(id);
  if (usage.sessions > 0 || usage.programs > 0) {
    throw new AppError(
      `Bài tập đang được dùng trong ${usage.sessions} buổi tập và ${usage.programs} giáo án. Không xóa để bảo toàn lịch sử.`,
    );
  }
  await db.exercises.delete(id);
}

// ---------------- GIÁO ÁN ----------------

export async function saveProgram(p: Omit<Program, 'createdAt' | 'updatedAt'> & { createdAt?: string }): Promise<Program> {
  const now = nowISO();
  const v = validate(programSchema, { ...p, createdAt: p.createdAt ?? now, updatedAt: now }, 'giáo án') as Program;
  const known = new Set((await db.exercises.toCollection().primaryKeys()) as string[]);
  const missing = v.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((x) => !known.has(x));
  if (missing.length) throw new AppError('Giáo án chứa bài tập không tồn tại trong thư viện', missing);
  await db.transaction('rw', db.programs, async () => {
    if (v.isActive) {
      const others = await db.programs.filter((x) => x.isActive && x.id !== v.id).toArray();
      for (const o of others) await db.programs.put({ ...o, isActive: false, updatedAt: now });
    }
    await db.programs.put(v);
  });
  return v;
}

export async function setActiveProgram(id: string): Promise<void> {
  const now = nowISO();
  await db.transaction('rw', db.programs, async () => {
    const all = await db.programs.toArray();
    for (const p of all) {
      const active = p.id === id;
      if (p.isActive !== active) await db.programs.put({ ...p, isActive: active, updatedAt: now });
    }
  });
}

export async function duplicateProgram(id: string): Promise<Program> {
  const p = await db.programs.get(id);
  if (!p) throw new AppError('Không tìm thấy giáo án.');
  const copy: Program = {
    ...structuredClone(p),
    id: uid('prog'),
    name: `${p.name} (bản sao)`,
    isActive: false,
    days: p.days.map((d) => ({ ...d, id: uid('day'), exercises: d.exercises.map((e) => ({ ...e, id: uid('pe') })) })),
  };
  return saveProgram(copy);
}

/** Xóa giáo án không xóa lịch sử buổi tập (buổi tập giữ tên buổi). Lịch đặt trước của giáo án bị gỡ. */
export async function deleteProgram(id: string): Promise<void> {
  await db.transaction('rw', db.programs, db.schedule, async () => {
    await db.programs.delete(id);
    const ids = (await db.schedule.filter((s) => s.programId === id).primaryKeys()) as string[];
    await db.schedule.bulkDelete(ids);
  });
}

export async function getActiveProgram(): Promise<Program | null> {
  return (await db.programs.filter((p) => p.isActive).first()) ?? null;
}

// ---------------- LỊCH TẬP ----------------

export async function addSchedule(input: Omit<ScheduledWorkout, 'id' | 'createdAt'>): Promise<ScheduledWorkout> {
  const v = validate(scheduleSchema, { ...input, id: uid('sch'), createdAt: nowISO() }, 'lịch tập') as ScheduledWorkout;
  await db.schedule.add(v);
  return v;
}

export async function removeSchedule(id: string): Promise<void> {
  await db.schedule.delete(id);
}

// ---------------- BUỔI TẬP ----------------

export async function getDraftSession(): Promise<WorkoutSession | undefined> {
  return db.sessions.where('status').equals('draft').filter((s) => !s.deletedAt).first();
}

/** Lần tập gần nhất (đã hoàn thành) của một bài, trừ buổi hiện tại. */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string): Promise<{ date: string; exercise: SessionExercise } | null> {
  const list = await db.sessions
    .where('status')
    .equals('completed')
    .filter((s) => !s.deletedAt && s.id !== excludeSessionId && s.exercises.some((e) => e.exerciseId === exerciseId && e.sets.some(isWorkingSet)))
    .toArray();
  list.sort((a, b) => (a.date === b.date ? b.startedAt.localeCompare(a.startedAt) : b.date.localeCompare(a.date)));
  const s = list[0];
  if (!s) return null;
  const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some(isWorkingSet));
  return ex ? { date: s.date, exercise: ex } : null;
}

export function emptySet(): SetEntry {
  return { id: uid('set'), weightKg: null, reps: null, rir: null, isWarmup: false, done: false };
}

export async function startSession(params: {
  programId?: string | null;
  programDayId?: string | null;
  scheduleId?: string | null;
  date?: string;
}): Promise<WorkoutSession> {
  const existing = await getDraftSession();
  if (existing) throw new AppError('Bạn đang có một buổi tập chưa hoàn thành. Hãy tiếp tục hoặc hủy buổi đó trước.');
  const now = nowISO();
  let dayName = 'Buổi tự do';
  let exercises: SessionExercise[] = [];
  if (params.programId && params.programDayId) {
    const program = await db.programs.get(params.programId);
    const day = program?.days.find((d) => d.id === params.programDayId);
    if (!program || !day) throw new AppError('Không tìm thấy buổi tập trong giáo án.');
    dayName = `${day.name} · ${program.name}`;
    exercises = day.exercises.map((pe) => ({
      id: uid('se'),
      exerciseId: pe.exerciseId,
      target: { sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, targetRIR: pe.targetRIR, restSec: pe.restSec },
      note: '',
      sets: Array.from({ length: pe.sets }, emptySet),
    }));
  }
  const s: WorkoutSession = {
    id: uid('ws'),
    date: params.date ?? todayISO(),
    programId: params.programId ?? null,
    programDayId: params.programDayId ?? null,
    scheduleId: params.scheduleId ?? null,
    dayName,
    status: 'draft',
    startedAt: now,
    finishedAt: null,
    notes: '',
    exercises,
    deletedAt: null,
    updatedAt: now,
  };
  await db.sessions.add(validate(sessionSchema, s, 'buổi tập') as WorkoutSession);
  return s;
}

/** Tạo buổi mới lặp lại cấu trúc (bài tập, mục tiêu, số hiệp) của một buổi cũ; số liệu để trống. */
export async function startRepeatSession(sourceId: string, date?: string): Promise<WorkoutSession> {
  const src = await db.sessions.get(sourceId);
  if (!src) throw new AppError('Không tìm thấy buổi tập gốc.');
  const s = await startSession({ programId: src.programId, programDayId: null, date });
  const copy: WorkoutSession = {
    ...s,
    programId: src.programId,
    programDayId: src.programDayId,
    dayName: src.dayName,
    exercises: src.exercises.map((e) => ({
      id: uid('se'),
      exerciseId: e.exerciseId,
      target: e.target,
      note: '',
      sets: Array.from({ length: Math.max(1, e.sets.filter((x) => !x.isWarmup).length) }, emptySet),
    })),
  };
  return saveSession(copy);
}

export async function saveSession(s: WorkoutSession): Promise<WorkoutSession> {
  const v = validate(sessionSchema, { ...s, updatedAt: nowISO() }, 'buổi tập') as WorkoutSession;
  await db.sessions.put(v);
  return v;
}

export async function finishSession(id: string): Promise<WorkoutSession> {
  const s = await db.sessions.get(id);
  if (!s) throw new AppError('Không tìm thấy buổi tập.');
  const working = s.exercises.reduce((n, e) => n + e.sets.filter(isWorkingSet).length, 0);
  if (working === 0) throw new AppError('Buổi tập chưa có hiệp nào được đánh dấu hoàn thành (✓).');
  return saveSession({ ...s, status: 'completed', finishedAt: s.finishedAt ?? nowISO() });
}

/** Hủy buổi đang tập dở: chuyển vào thùng rác (khôi phục được), không xóa hẳn. */
export async function softDeleteSession(id: string): Promise<void> {
  await db.sessions.update(id, { deletedAt: nowISO(), updatedAt: nowISO() });
}

export async function restoreSession(id: string): Promise<void> {
  const s = await db.sessions.get(id);
  if (!s) return;
  if (s.status === 'draft' && (await getDraftSession())) {
    throw new AppError('Đang có buổi tập dở khác. Hoàn thành hoặc hủy buổi đó trước khi khôi phục.');
  }
  await db.sessions.update(id, { deletedAt: null, updatedAt: nowISO() });
}

export async function purgeSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

// ---------------- SỐ ĐO CƠ THỂ ----------------

export type BodyMetricInput = Omit<BodyMetric, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string };

export async function saveBodyMetric(input: BodyMetricInput): Promise<BodyMetric> {
  const now = nowISO();
  const prev = input.id ? await db.bodyMetrics.get(input.id) : undefined;
  const clean: Record<string, unknown> = { ...input };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  const v = validate(
    bodyMetricSchema,
    { ...clean, id: prev?.id ?? uid('bm'), createdAt: prev?.createdAt ?? now, updatedAt: now, deletedAt: null },
    'số đo',
  ) as BodyMetric;
  await db.bodyMetrics.put(v);
  return v;
}

export async function softDeleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.update(id, { deletedAt: nowISO() });
}
export async function restoreBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.update(id, { deletedAt: null });
}
export async function purgeBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id);
}

// ---------------- ẢNH TIẾN ĐỘ ----------------

export async function addPhoto(input: Omit<ProgressPhoto, 'id' | 'createdAt' | 'deletedAt'>): Promise<ProgressPhoto> {
  const { data, ...meta } = input;
  const now = nowISO();
  const m = validate(photoMetaSchema, { ...meta, id: uid('ph'), createdAt: now, deletedAt: null }, 'ảnh');
  if (!(data instanceof ArrayBuffer) || data.byteLength === 0) throw new AppError('Tệp ảnh rỗng hoặc không đọc được.');
  const p = { ...m, data } as ProgressPhoto;
  await db.photos.add(p);
  return p;
}
export async function softDeletePhoto(id: string): Promise<void> {
  await db.photos.update(id, { deletedAt: nowISO() });
}
export async function restorePhoto(id: string): Promise<void> {
  await db.photos.update(id, { deletedAt: null });
}
export async function purgePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

// ---------------- DINH DƯỠNG ----------------

export type FoodInput = Omit<Food, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export async function saveFood(input: FoodInput): Promise<Food> {
  const now = nowISO();
  const prev = input.id ? await db.foods.get(input.id) : undefined;
  const v = validate(foodSchema, { ...input, id: prev?.id ?? uid('food'), createdAt: prev?.createdAt ?? now, updatedAt: now }, 'thực phẩm') as Food;
  await db.foods.put(v);
  return v;
}

/** Nhật ký cũ giữ bản chụp (snapshot) giá trị dinh dưỡng nên xóa thực phẩm không làm sai lịch sử. */
export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

/**
 * Cài bộ thực phẩm + thực đơn Việt Nam mẫu (id cố định → chạy lại không nhân đôi, không ghi đè bản người dùng đã sửa).
 */
export async function installVietnameseMenus(
  foods: (Omit<FoodInput, 'isFavorite' | 'id'> & { id: string })[],
  plans: { id: string; name: string; meals: { meal: MealSlot; items: { foodId: string; grams: number }[] }[] }[],
): Promise<{ foods: number; plans: number }> {
  const now = nowISO();
  let nf = 0;
  let np = 0;
  await db.transaction('rw', db.foods, db.mealPlans, async () => {
    for (const f of foods) {
      if (await db.foods.get(f.id)) continue;
      const { id, ...rest } = f;
      const clean = { id, name: rest.name, servingLabel: rest.servingLabel, servingGrams: rest.servingGrams, kcal: rest.kcal, proteinG: rest.proteinG, carbG: rest.carbG, fatG: rest.fatG, isVerified: rest.isVerified, source: rest.source, isFavorite: false, createdAt: now, updatedAt: now };
      await db.foods.put(validate(foodSchema, clean, 'thực phẩm') as Food);
      nf++;
    }
    for (const p of plans) {
      if (await db.mealPlans.get(p.id)) continue;
      const plan = {
        id: p.id,
        name: p.name,
        items: p.meals.flatMap((m) => m.items.map((it) => ({ foodId: it.foodId, meal: m.meal, servings: Math.round((it.grams / 100) * 100) / 100 }))),
        createdAt: now,
        updatedAt: now,
      };
      await db.mealPlans.put(validate(mealPlanSchema, plan, 'thực đơn') as MealPlan);
      np++;
    }
  });
  return { foods: nf, plans: np };
}

export async function toggleFavoriteFood(id: string): Promise<void> {
  const f = await db.foods.get(id);
  if (f) await db.foods.put({ ...f, isFavorite: !f.isFavorite, updatedAt: nowISO() });
}

export async function addFoodLog(params: { date: string; meal: MealSlot; foodId: string; servings: number }): Promise<FoodLog> {
  const f = await db.foods.get(params.foodId);
  if (!f) throw new AppError('Không tìm thấy thực phẩm.');
  const log = validate(
    foodLogSchema,
    {
      id: uid('fl'),
      date: params.date,
      meal: params.meal,
      foodId: f.id,
      servings: params.servings,
      food: { name: f.name, servingLabel: f.servingLabel, kcal: f.kcal, proteinG: f.proteinG, carbG: f.carbG, fatG: f.fatG, isVerified: f.isVerified },
      createdAt: nowISO(),
    },
    'nhật ký ăn',
  ) as FoodLog;
  await db.foodLogs.add(log);
  return log;
}

export async function updateFoodLogServings(id: string, servings: number): Promise<void> {
  const l = await db.foodLogs.get(id);
  if (!l) return;
  validate(foodLogSchema, { ...l, servings }, 'nhật ký ăn');
  await db.foodLogs.update(id, { servings });
}

export async function deleteFoodLog(id: string): Promise<void> {
  await db.foodLogs.delete(id);
}

export async function saveMealPlan(input: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MealPlan> {
  const now = nowISO();
  const prev = input.id ? await db.mealPlans.get(input.id) : undefined;
  const v = validate(mealPlanSchema, { ...input, id: prev?.id ?? uid('mp'), createdAt: prev?.createdAt ?? now, updatedAt: now }, 'thực đơn') as MealPlan;
  await db.mealPlans.put(v);
  return v;
}

export async function deleteMealPlan(id: string): Promise<void> {
  await db.mealPlans.delete(id);
}

/** Thêm toàn bộ món trong thực đơn vào nhật ký ngày. Món đã bị xóa khỏi danh sách thực phẩm sẽ bị bỏ qua. */
export async function applyMealPlan(planId: string, date: string): Promise<{ added: number; skipped: number }> {
  const plan = await db.mealPlans.get(planId);
  if (!plan) throw new AppError('Không tìm thấy thực đơn.');
  let added = 0;
  let skipped = 0;
  await db.transaction('rw', db.foods, db.foodLogs, async () => {
    for (const it of plan.items) {
      if (await db.foods.get(it.foodId)) {
        await addFoodLog({ date, meal: it.meal, foodId: it.foodId, servings: it.servings });
        added++;
      } else skipped++;
    }
  });
  return { added, skipped };
}

// ---------------- THÙNG RÁC ----------------

export async function trashCounts() {
  const [sessions, metrics, photos] = await Promise.all([
    db.sessions.filter((s) => !!s.deletedAt).count(),
    db.bodyMetrics.filter((s) => !!s.deletedAt).count(),
    db.photos.filter((s) => !!s.deletedAt).count(),
  ]);
  return { sessions, metrics, photos };
}
