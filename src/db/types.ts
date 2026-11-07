/** Kiểu dữ liệu lưu trong IndexedDB. Mọi ngày dạng 'YYYY-MM-DD' theo giờ địa phương; mốc thời gian dạng ISO. */

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Ngực',
  back: 'Lưng',
  shoulders: 'Vai',
  biceps: 'Tay trước',
  triceps: 'Tay sau',
  abs: 'Bụng',
  quads: 'Đùi trước',
  hamstrings: 'Đùi sau',
  glutes: 'Mông',
  calves: 'Bắp chân',
};

export const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other'] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Tạ đòn',
  dumbbell: 'Tạ đơn',
  cable: 'Máy cáp',
  machine: 'Máy tập',
  bodyweight: 'Trọng lượng cơ thể',
  kettlebell: 'Tạ ấm',
  band: 'Dây kháng lực',
  other: 'Khác',
};

export type BodyRegion = 'upper' | 'lower' | 'core';

export interface Profile {
  id: 'me';
  sex: 'male' | 'female' | 'other';
  heightCm: number;
  age?: number | null;
  activityLevel?: 'low' | 'moderate' | 'high' | null;
  goals: string;
  proteinTargetMinG: number;
  proteinTargetMaxG: number;
  calorieTarget?: number | null;
  carbTargetG?: number | null;
  fatTargetG?: number | null;
  /** Số bữa mỗi ngày (kể cả bữa phụ) — dùng để chia mục tiêu protein cho từng bữa. Mặc định 4. */
  mealsPerDay?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressionSettings {
  /** RIR tối thiểu ở mọi hiệp để được gợi ý tăng tạ. */
  minRIR: number;
  mode: 'fixed' | 'percent';
  upperIncrementKg: number;
  lowerIncrementKg: number;
  percent: number;
  /** Làm tròn mức tạ gợi ý tới bội số này (kg). */
  roundToKg: number;
}

export interface Settings {
  id: 'app';
  progression: ProgressionSettings;
  restTimerDefaultSec: number;
  secondaryMuscleFactor: number;
  oneRmFormula: 'epley' | 'brzycki';
  measurementReminderDays: number;
  timerSound: boolean;
  timerVibrate: boolean;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  nameVi: string;
  nameEn: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  region: BodyRegion;
  isBodyweight: boolean;
  instructions: string[];
  commonMistakes: string[];
  alternativeIds: string[];
  isCustom: boolean;
  source?: string;
  /** Hướng dẫn chi tiết cho người mới (không bắt buộc). */
  setup?: string[];
  breathing?: string;
  feel?: string;
  tips?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTarget {
  sets: number;
  repMin: number;
  repMax: number;
  targetRIR: number;
  restSec: number;
}

export interface ProgramExercise extends ExerciseTarget {
  id: string;
  exerciseId: string;
  note?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  days: ProgramDay[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledWorkout {
  id: string;
  date: string;
  programId: string;
  programDayId: string;
  note?: string;
  createdAt: string;
}

export interface SetEntry {
  id: string;
  /** null = chưa nhập (app hiển thị gợi ý từ buổi trước). */
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  isWarmup: boolean;
  done: boolean;
  /** v1.8: hiệp đã làm TRƯỚC khi "Thay bài" — thuộc về bài cũ (exerciseId), không phải bài hiện tại. */
  replacedFrom?: string;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  target: ExerciseTarget | null;
  note: string;
  sets: SetEntry[];
  /** v1.8: bài này đã được "Thay bài" giữa buổi; giá trị là exerciseId cũ. */
  replacedFrom?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  programId: string | null;
  programDayId: string | null;
  dayName: string;
  status: 'draft' | 'completed';
  startedAt: string;
  finishedAt: string | null;
  notes: string;
  exercises: SessionExercise[];
  scheduleId?: string | null;
  deletedAt?: string | null;
  updatedAt: string;
}

export const BODY_FIELDS = ['weightKg', 'chestCm', 'waistCm', 'shouldersCm', 'armCm', 'thighCm', 'calfCm'] as const;
export type BodyField = (typeof BODY_FIELDS)[number];
export const BODY_FIELD_LABELS: Record<BodyField, string> = {
  weightKg: 'Cân nặng',
  chestCm: 'Vòng ngực',
  waistCm: 'Vòng eo',
  shouldersCm: 'Vòng vai',
  armCm: 'Vòng cánh tay',
  thighCm: 'Vòng đùi',
  calfCm: 'Vòng bắp chân',
};
export const BODY_FIELD_UNITS: Record<BodyField, string> = {
  weightKg: 'kg',
  chestCm: 'cm',
  waistCm: 'cm',
  shouldersCm: 'cm',
  armCm: 'cm',
  thighCm: 'cm',
  calfCm: 'cm',
};

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  shouldersCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  note?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PhotoPose = 'front' | 'side' | 'back' | 'other';
export const POSE_LABELS: Record<PhotoPose, string> = { front: 'Trước', side: 'Bên', back: 'Sau', other: 'Khác' };

/** Siêu dữ liệu ảnh + ảnh thu nhỏ. Bytes ảnh gốc nằm ở bảng photoBlobs (cùng id) để danh sách không phải tải ảnh lớn. */
export interface ProgressPhoto {
  id: string;
  date: string;
  pose: PhotoPose;
  mimeType: string;
  /** JPEG cạnh dài 320 px; null khi chưa tạo (ảnh từ bản cũ/tệp nhập — được tạo nền sau khi mở app). */
  thumb: ArrayBuffer | null;
  /** Kích thước ảnh gốc (byte). */
  bytes: number;
  width?: number;
  height?: number;
  note?: string;
  deletedAt?: string | null;
  createdAt: string;
}

export interface PhotoBlob {
  id: string;
  data: ArrayBuffer;
}

export interface Food {
  id: string;
  name: string;
  servingLabel: string;
  servingGrams?: number | null;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  /** false => hiển thị nhãn "Ước tính". */
  isVerified: boolean;
  source?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Bữa phụ',
};
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface FoodSnapshot {
  name: string;
  servingLabel: string;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  isVerified: boolean;
}

export interface FoodLog {
  id: string;
  date: string;
  meal: MealSlot;
  foodId: string;
  food: FoodSnapshot;
  servings: number;
  createdAt: string;
}

export interface MealPlanItem {
  foodId: string;
  meal: MealSlot;
  servings: number;
}

export interface MealPlan {
  id: string;
  name: string;
  items: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}
