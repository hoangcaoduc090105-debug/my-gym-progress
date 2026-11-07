import { z } from 'zod';
import { isISODate } from '../lib/date';
import { BODY_FIELDS, EQUIPMENT, MUSCLE_GROUPS } from './types';

/** Schema Zod dùng chung cho form và cho kiểm tra file sao lưu. */

/** Thông báo lỗi mặc định bằng tiếng Việt (thông báo riêng khai báo trong schema vẫn được ưu tiên). */
const viErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Bắt buộc nhập' };
      if (issue.expected === 'integer') return { message: 'Cần nhập số nguyên' };
      if (issue.expected === 'number') return { message: 'Cần nhập một số hợp lệ' };
      return { message: 'Giá trị không hợp lệ' };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: Number(issue.minimum) <= 1 ? 'Không được để trống' : `Tối thiểu ${issue.minimum} ký tự` };
      if (issue.type === 'number') return { message: `Tối thiểu ${issue.minimum}` };
      if (issue.type === 'array') return { message: `Cần ít nhất ${issue.minimum} mục` };
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Tối đa ${issue.maximum} ký tự` };
      if (issue.type === 'number') return { message: `Tối đa ${issue.maximum}` };
      if (issue.type === 'array') return { message: `Tối đa ${issue.maximum} mục` };
      break;
    case z.ZodIssueCode.not_finite:
      return { message: 'Cần nhập một số hợp lệ' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Lựa chọn không hợp lệ' };
    default:
      break;
  }
  return { message: ctx.defaultError };
};
z.setErrorMap(viErrorMap);

const isoDate = z.string().refine(isISODate, { message: 'Ngày không hợp lệ (YYYY-MM-DD)' });
const timestamp = z.string().min(1);
const id = z.string().min(1).max(100);
const nonNeg = (max: number) => z.number().finite().min(0).max(max);
const optNum = (max: number) => z.number().finite().positive().max(max).nullable().optional();

export const muscleSchema = z.enum(MUSCLE_GROUPS);

export const profileSchema = z
  .object({
    id: z.literal('me'),
    sex: z.enum(['male', 'female', 'other']),
    heightCm: z.number().finite().min(100, 'Chiều cao tối thiểu 100 cm').max(250, 'Chiều cao tối đa 250 cm'),
    age: z.number().int().min(13).max(100).nullable().optional(),
    activityLevel: z.enum(['low', 'moderate', 'high']).nullable().optional(),
    goals: z.string().max(2000),
    proteinTargetMinG: z.number().finite().min(20).max(400),
    proteinTargetMaxG: z.number().finite().min(20).max(400),
    calorieTarget: z.number().finite().min(800).max(8000).nullable().optional(),
    carbTargetG: z.number().finite().min(0).max(1500).nullable().optional(),
    fatTargetG: z.number().finite().min(0).max(500).nullable().optional(),
    mealsPerDay: z.number().int().min(1).max(8).nullable().optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .refine((p) => p.proteinTargetMaxG >= p.proteinTargetMinG, {
    message: 'Mục tiêu protein tối đa phải ≥ tối thiểu',
    path: ['proteinTargetMaxG'],
  });

export const settingsSchema = z.object({
  id: z.literal('app'),
  progression: z.object({
    minRIR: z.number().int().min(0).max(5),
    mode: z.enum(['fixed', 'percent']),
    upperIncrementKg: z.number().finite().min(0.25).max(20),
    lowerIncrementKg: z.number().finite().min(0.25).max(40),
    percent: z.number().finite().min(1).max(20),
    roundToKg: z.number().finite().min(0.25).max(10),
  }),
  restTimerDefaultSec: z.number().int().min(15).max(900),
  secondaryMuscleFactor: z.number().min(0).max(1),
  oneRmFormula: z.enum(['epley', 'brzycki']),
  measurementReminderDays: z.number().int().min(1).max(90),
  timerSound: z.boolean(),
  timerVibrate: z.boolean(),
  // Tùy chọn: bản sao lưu cũ không có — khi đọc sẽ điền mặc định.
  barbell: z
    .object({
      barWeightKg: z.number().finite().min(0).max(100),
      platesKg: z.array(z.number().finite().positive().max(100)).min(1, 'Chọn ít nhất 1 loại đĩa').max(20),
    })
    .optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  dueNotifications: z.boolean().optional(),
  updatedAt: timestamp,
});

export const exerciseSchema = z.object({
  id,
  nameVi: z.string().trim().min(1, 'Cần tên tiếng Việt').max(120),
  nameEn: z.string().trim().max(120),
  primaryMuscle: muscleSchema,
  secondaryMuscles: z.array(muscleSchema).max(10),
  equipment: z.enum(EQUIPMENT),
  region: z.enum(['upper', 'lower', 'core']),
  isBodyweight: z.boolean(),
  instructions: z.array(z.string().max(1000)).max(30),
  commonMistakes: z.array(z.string().max(1000)).max(30),
  alternativeIds: z.array(id).max(20),
  isCustom: z.boolean(),
  source: z.string().max(500).optional(),
  setup: z.array(z.string().max(1000)).max(30).optional(),
  breathing: z.string().max(1000).optional(),
  feel: z.string().max(1000).optional(),
  tips: z.array(z.string().max(1000)).max(30).optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const targetSchema = z
  .object({
    sets: z.number().int().min(1).max(20),
    repMin: z.number().int().min(1).max(100),
    repMax: z.number().int().min(1).max(100),
    targetRIR: z.number().int().min(0).max(5),
    restSec: z.number().int().min(0).max(900),
  })
  .refine((t) => t.repMax >= t.repMin, { message: 'Số lần tối đa phải ≥ tối thiểu', path: ['repMax'] });

const programExerciseSchema = z
  .object({
    id,
    exerciseId: id,
    sets: z.number().int().min(1).max(20),
    repMin: z.number().int().min(1).max(100),
    repMax: z.number().int().min(1).max(100),
    targetRIR: z.number().int().min(0).max(5),
    restSec: z.number().int().min(0).max(900),
    note: z.string().max(500).optional(),
    groupId: id.optional(),
  })
  .refine((t) => t.repMax >= t.repMin, { message: 'Số lần tối đa phải ≥ tối thiểu', path: ['repMax'] });

export const programSchema = z.object({
  id,
  name: z.string().trim().min(1, 'Cần tên giáo án').max(120),
  description: z.string().max(2000).optional(),
  isActive: z.boolean(),
  days: z
    .array(z.object({ id, name: z.string().trim().min(1, 'Cần tên buổi').max(80), exercises: z.array(programExerciseSchema).max(30) }))
    .min(1, 'Giáo án cần ít nhất 1 buổi')
    .max(14),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const scheduleSchema = z.object({
  id,
  date: isoDate,
  programId: id,
  programDayId: id,
  note: z.string().max(500).optional(),
  createdAt: timestamp,
});

export const setEntrySchema = z.object({
  id,
  weightKg: nonNeg(1000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  rir: z.number().int().min(0).max(10).nullable(),
  isWarmup: z.boolean(),
  done: z.boolean(),
  replacedFrom: id.optional(),
});

export const sessionSchema = z.object({
  id,
  date: isoDate,
  programId: id.nullable(),
  programDayId: id.nullable(),
  dayName: z.string().max(120),
  status: z.enum(['draft', 'completed']),
  startedAt: timestamp,
  finishedAt: timestamp.nullable(),
  notes: z.string().max(5000),
  exercises: z
    .array(
      z.object({
        id,
        exerciseId: id,
        target: targetSchema.nullable(),
        note: z.string().max(2000),
        sets: z.array(setEntrySchema).max(50),
        replacedFrom: id.optional(),
        groupId: id.optional(),
      }),
    )
    .max(40),
  scheduleId: id.nullable().optional(),
  deletedAt: timestamp.nullable().optional(),
  isDeload: z.boolean().optional(),
  updatedAt: timestamp,
});

const bodyShape = {
  id,
  date: isoDate,
  weightKg: optNum(400),
  chestCm: optNum(300),
  waistCm: optNum(300),
  shouldersCm: optNum(300),
  armCm: optNum(150),
  thighCm: optNum(200),
  calfCm: optNum(150),
  note: z.string().max(1000).optional(),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const bodyMetricSchema = z.object(bodyShape).refine((m) => BODY_FIELDS.some((f) => typeof m[f] === 'number'), {
  message: 'Cần nhập ít nhất một chỉ số',
});

export const photoMetaSchema = z.object({
  id,
  date: isoDate,
  pose: z.enum(['front', 'side', 'back', 'other']),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/, 'Chỉ hỗ trợ ảnh JPEG/PNG/WebP'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  note: z.string().max(1000).optional(),
  deletedAt: timestamp.nullable().optional(),
  createdAt: timestamp,
});

export const foodSchema = z.object({
  id,
  name: z.string().trim().min(1, 'Cần tên thực phẩm').max(120),
  servingLabel: z.string().trim().min(1, 'Cần mô tả khẩu phần').max(60),
  servingGrams: z.number().finite().positive().max(5000).nullable().optional(),
  kcal: nonNeg(5000),
  proteinG: nonNeg(500),
  carbG: nonNeg(1000),
  fatG: nonNeg(500),
  isVerified: z.boolean(),
  source: z.string().max(300).optional(),
  isFavorite: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const mealSlot = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const foodLogSchema = z.object({
  id,
  date: isoDate,
  meal: mealSlot,
  foodId: id,
  food: z.object({
    name: z.string().max(120),
    servingLabel: z.string().max(60),
    kcal: nonNeg(5000),
    proteinG: nonNeg(500),
    carbG: nonNeg(1000),
    fatG: nonNeg(500),
    isVerified: z.boolean(),
  }),
  servings: z.number().finite().positive().max(100),
  createdAt: timestamp,
});

export const mealPlanSchema = z.object({
  id,
  name: z.string().trim().min(1, 'Cần tên thực đơn').max(120),
  items: z.array(z.object({ foodId: id, meal: mealSlot, servings: z.number().finite().positive().max(100) })).max(60),
  createdAt: timestamp,
  updatedAt: timestamp,
});

/** Định dạng lỗi Zod thành câu tiếng Việt ngắn gọn. */
export function formatZodError(err: z.ZodError, prefix = ''): string[] {
  return err.issues.slice(0, 20).map((i) => `${prefix}${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`);
}
