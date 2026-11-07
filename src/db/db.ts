import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyMetric,
  Exercise,
  Food,
  FoodLog,
  MealPlan,
  MetaEntry,
  Profile,
  Program,
  ProgressPhoto,
  ScheduledWorkout,
  Settings,
  WorkoutSession,
} from './types';

export const DB_NAME = 'my-gym-progress';

/**
 * Lịch sử phiên bản schema. KHÔNG sửa phiên bản cũ — thêm db.version(n+1) kèm .upgrade() khi đổi cấu trúc,
 * để người dùng cập nhật app mà không mất dữ liệu.
 */
export class GymDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  schedule!: EntityTable<ScheduledWorkout, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  bodyMetrics!: EntityTable<BodyMetric, 'id'>;
  photos!: EntityTable<ProgressPhoto, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  foodLogs!: EntityTable<FoodLog, 'id'>;
  mealPlans!: EntityTable<MealPlan, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
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
    });
  }
}

export const db = new GymDB();

/** Tên các bảng chứa dữ liệu người dùng (dùng cho xuất/nhập). */
export const USER_TABLES = [
  'profile',
  'settings',
  'exercises',
  'programs',
  'schedule',
  'sessions',
  'bodyMetrics',
  'photos',
  'foods',
  'foodLogs',
  'mealPlans',
] as const;
export type UserTable = (typeof USER_TABLES)[number];
