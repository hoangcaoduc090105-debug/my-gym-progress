import Dexie from 'dexie';
import type { z } from 'zod';
import { db } from './db';
import { defaultSettings } from './defaults';
import { AppError } from './errors';
import type * as SchemasModule from './schemas';
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
import { isArrayBuffer } from '../lib/image';
import { checkFreeSpace, notifyStorageChanged, SPACE_FACTOR } from '../lib/storage';

/**
 * Schema Zod (kèm thư viện zod ~12 KB gzip) được tải lười để chunk chính nhỏ.
 * Mọi hàm ghi gọi `await loadSchemas()` TRƯỚC khi mở giao dịch Dexie (không được await promise ngoài Dexie bên trong giao dịch).
 */
type Schemas = typeof SchemasModule;
let S: Schemas | null = null;
let loadingSchemas: Promise<Schemas> | null = null;
export function loadSchemas(): Promise<Schemas> {
  if (S) return Promise.resolve(S);
  loadingSchemas ??= import('./schemas').then((m) => (S = m));
  return loadingSchemas;
}

function validate<T>(pick: (s: Schemas) => z.ZodType<T>, value: unknown, what: string): T {
  if (!S) throw new Error('Schema chưa được tải (gọi loadSchemas() trước).');
  const r = pick(S).safeParse(value);
  if (!r.success) throw new AppError(`Dữ liệu ${what} không hợp lệ`, S.formatZodError(r.error));
  return r.data;
}

// ---------------- HỒ SƠ & CÀI ĐẶT ----------------

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me');
}

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  await loadSchemas();
  const prev = await db.profile.get('me');
  const now = nowISO();
  const p = validate((x) => x.profileSchema, { ...input, id: 'me', createdAt: prev?.createdAt ?? now, updatedAt: now }, 'hồ sơ') as Profile;
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
  await loadSchemas();
  const v = validate((x) => x.settingsSchema, { ...s, id: 'app', updatedAt: nowISO() }, 'cài đặt') as Settings;
  await db.settings.put(v);
  return v;
}

// ---------------- BÀI TẬP ----------------

export type ExerciseInput = Omit<Exercise, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'> & { id?: string };

export async function saveCustomExercise(input: ExerciseInput): Promise<Exercise> {
  await loadSchemas();
  const now = nowISO();
  const prev = input.id ? await db.exercises.get(input.id) : undefined;
  if (prev && !prev.isCustom) throw new AppError('Không thể sửa bài tập gốc của thư viện. Hãy tạo bài tập mới.');
  const ex = validate(
    (x) => x.exerciseSchema,
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
  await loadSchemas();
  const now = nowISO();
  const v = validate((x) => x.programSchema, { ...p, createdAt: p.createdAt ?? now, updatedAt: now }, 'giáo án') as Program;
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
  await loadSchemas();
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
  await loadSchemas();
  const v = validate((x) => x.scheduleSchema, { ...input, id: uid('sch'), createdAt: nowISO() }, 'lịch tập') as ScheduledWorkout;
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

export interface LastPerformance {
  date: string;
  startedAt: string;
  exercise: SessionExercise;
}

/**
 * Lần tập gần nhất (đã hoàn thành, có hiệp làm việc) cho NHIỀU bài, quét chỉ mục [status+date] từ mới đến cũ MỘT lần.
 * Dừng khi mọi bài đã tìm thấy và đã đi qua ngày của chúng (cùng ngày thì so startedAt).
 */
export async function lastPerformances(exerciseIds: string[], excludeSessionId?: string): Promise<Map<string, LastPerformance>> {
  const want = new Set(exerciseIds);
  const best = new Map<string, LastPerformance>();
  if (want.size === 0) return best;
  const done = (date: string) => {
    for (const id of want) {
      const b = best.get(id);
      if (!b || date >= b.date) return false;
    }
    return true;
  };
  await db.sessions
    .where('[status+date]')
    .between(['completed', Dexie.minKey], ['completed', Dexie.maxKey])
    .reverse()
    .until((s) => done(s.date))
    .each((s) => {
      if (s.deletedAt || s.id === excludeSessionId) return;
      for (const e of s.exercises) {
        if (!want.has(e.exerciseId) || !e.sets.some(isWorkingSet)) continue;
        const cur = best.get(e.exerciseId);
        if (!cur || s.date > cur.date || (s.date === cur.date && s.startedAt > cur.startedAt)) {
          best.set(e.exerciseId, { date: s.date, startedAt: s.startedAt, exercise: e });
        }
      }
    });
  return best;
}

/** Lần tập gần nhất của một bài, trừ buổi hiện tại. */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string): Promise<{ date: string; exercise: SessionExercise } | null> {
  const r = (await lastPerformances([exerciseId], excludeSessionId)).get(exerciseId);
  return r ? { date: r.date, exercise: r.exercise } : null;
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
  await loadSchemas();
  // Kiểm tra "đã có buổi dở" và ghi buổi mới trong CÙNG một giao dịch,
  // để bấm đúp hoặc mở hai tab không tạo ra hai buổi dở.
  return db.transaction('rw', db.sessions, db.programs, async () => {
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
    await db.sessions.add(validate((x) => x.sessionSchema, s, 'buổi tập') as WorkoutSession);
    return s;
  });
}

/** Tạo buổi mới lặp lại cấu trúc (bài tập, mục tiêu, số hiệp) của một buổi cũ; số liệu để trống. */
export async function startRepeatSession(sourceId: string, date?: string): Promise<WorkoutSession> {
  await loadSchemas();
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
  await loadSchemas();
  const v = validate((x) => x.sessionSchema, { ...s, updatedAt: nowISO() }, 'buổi tập') as WorkoutSession;
  await db.sessions.put(v);
  return v;
}

export async function finishSession(id: string): Promise<WorkoutSession> {
  await loadSchemas();
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
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id);
    if (!s) return;
    if (s.status === 'draft' && (await getDraftSession())) {
      throw new AppError('Đang có buổi tập dở khác. Hoàn thành hoặc hủy buổi đó trước khi khôi phục.');
    }
    await db.sessions.update(id, { deletedAt: null, updatedAt: nowISO() });
  });
}

export async function purgeSession(id: string): Promise<void> {
  await db.sessions.delete(id);
  notifyStorageChanged();
}

// ---------------- SỐ ĐO CƠ THỂ ----------------

export type BodyMetricInput = Omit<BodyMetric, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string };

export async function saveBodyMetric(input: BodyMetricInput): Promise<BodyMetric> {
  await loadSchemas();
  const now = nowISO();
  const prev = input.id ? await db.bodyMetrics.get(input.id) : undefined;
  const clean: Record<string, unknown> = { ...input };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  const v = validate(
    (x) => x.bodyMetricSchema,
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
  notifyStorageChanged();
}

// ---------------- ẢNH TIẾN ĐỘ ----------------

export async function addPhoto(
  input: Omit<ProgressPhoto, 'id' | 'createdAt' | 'deletedAt' | 'bytes' | 'thumb'> & { data: ArrayBuffer; thumb?: ArrayBuffer | null },
): Promise<ProgressPhoto> {
  await loadSchemas();
  const { data, thumb, ...meta } = input;
  const now = nowISO();
  const m = validate((x) => x.photoMetaSchema, { ...meta, id: uid('ph'), createdAt: now, deletedAt: null }, 'ảnh');
  if (!isArrayBuffer(data) || data.byteLength === 0) throw new AppError('Tệp ảnh rỗng hoặc không đọc được.');
  // Kiểm tra chỗ trống TRƯỚC giao dịch (không await promise ngoài Dexie bên trong transaction).
  const needed = data.byteLength + (isArrayBuffer(thumb) ? thumb.byteLength : 0);
  const space = await checkFreeSpace(needed, SPACE_FACTOR);
  if (space) throw new AppError(space);
  const p = { ...m, thumb: isArrayBuffer(thumb) ? thumb : null, bytes: data.byteLength } as ProgressPhoto;
  // Ghi siêu dữ liệu và bytes trong MỘT giao dịch.
  await db.transaction('rw', db.photos, db.photoBlobs, async () => {
    await db.photos.add(p);
    await db.photoBlobs.add({ id: p.id, data });
  });
  notifyStorageChanged();
  return p;
}

/** Bytes ảnh gốc — chỉ tải khi xem lớn hoặc so sánh. */
export async function getPhotoData(id: string): Promise<ArrayBuffer | undefined> {
  return (await db.photoBlobs.get(id))?.data;
}
export async function softDeletePhoto(id: string): Promise<void> {
  await db.photos.update(id, { deletedAt: nowISO() });
}
export async function restorePhoto(id: string): Promise<void> {
  await db.photos.update(id, { deletedAt: null });
}
export async function purgePhoto(id: string): Promise<void> {
  await db.transaction('rw', db.photos, db.photoBlobs, async () => {
    await db.photos.delete(id);
    await db.photoBlobs.delete(id);
  });
  notifyStorageChanged();
}

// ---------------- DINH DƯỠNG ----------------

export type FoodInput = Omit<Food, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export async function saveFood(input: FoodInput): Promise<Food> {
  await loadSchemas();
  const now = nowISO();
  const prev = input.id ? await db.foods.get(input.id) : undefined;
  const v = validate((x) => x.foodSchema, { ...input, id: prev?.id ?? uid('food'), createdAt: prev?.createdAt ?? now, updatedAt: now }, 'thực phẩm') as Food;
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
  plans: { id: string; name: string; meals: { meal: MealSlot; items: { foodId: string; grams?: number; portions?: number }[] }[] }[],
): Promise<{ foods: number; plans: number }> {
  await loadSchemas();
  const now = nowISO();
  let nf = 0;
  let np = 0;
  await db.transaction('rw', db.foods, db.mealPlans, async () => {
    for (const f of foods) {
      if (await db.foods.get(f.id)) continue;
      const { id, ...rest } = f;
      const clean = { id, name: rest.name, servingLabel: rest.servingLabel, servingGrams: rest.servingGrams, kcal: rest.kcal, proteinG: rest.proteinG, carbG: rest.carbG, fatG: rest.fatG, isVerified: rest.isVerified, source: rest.source, isFavorite: false, createdAt: now, updatedAt: now };
      await db.foods.put(validate((x) => x.foodSchema, clean, 'thực phẩm') as Food);
      nf++;
    }
    for (const p of plans) {
      if (await db.mealPlans.get(p.id)) continue;
      const plan = {
        id: p.id,
        name: p.name,
        items: p.meals.flatMap((m) => m.items.map((it) => ({ foodId: it.foodId, meal: m.meal, servings: Math.round((it.portions ?? (it.grams ?? 0) / 100) * 100) / 100 }))),
        createdAt: now,
        updatedAt: now,
      };
      await db.mealPlans.put(validate((x) => x.mealPlanSchema, plan, 'thực đơn') as MealPlan);
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
  if (!S) await loadSchemas(); // có thể chạy trong giao dịch của applyMealPlan: chỉ await khi chưa tải
  const f = await db.foods.get(params.foodId);
  if (!f) throw new AppError('Không tìm thấy thực phẩm.');
  const log = validate(
    (x) => x.foodLogSchema,
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
  await loadSchemas();
  const l = await db.foodLogs.get(id);
  if (!l) return;
  validate((x) => x.foodLogSchema, { ...l, servings }, 'nhật ký ăn');
  await db.foodLogs.update(id, { servings });
}

export async function deleteFoodLog(id: string): Promise<void> {
  await db.foodLogs.delete(id);
}

export async function saveMealPlan(input: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MealPlan> {
  await loadSchemas();
  const now = nowISO();
  const prev = input.id ? await db.mealPlans.get(input.id) : undefined;
  const v = validate((x) => x.mealPlanSchema, { ...input, id: prev?.id ?? uid('mp'), createdAt: prev?.createdAt ?? now, updatedAt: now }, 'thực đơn') as MealPlan;
  await db.mealPlans.put(v);
  return v;
}

export async function deleteMealPlan(id: string): Promise<void> {
  await db.mealPlans.delete(id);
}

/** Thêm toàn bộ món trong thực đơn vào nhật ký ngày. Món đã bị xóa khỏi danh sách thực phẩm sẽ bị bỏ qua. */
export async function applyMealPlan(planId: string, date: string): Promise<{ added: number; skipped: number }> {
  await loadSchemas();
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
