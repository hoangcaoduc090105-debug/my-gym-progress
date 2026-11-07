import Dexie, { type EntityTable } from 'dexie';
import { isArrayBuffer } from '../lib/image';
import type {
  BodyMetric,
  Exercise,
  Food,
  FoodLog,
  MealPlan,
  MetaEntry,
  Profile,
  Program,
  PhotoBlob,
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
  photoBlobs!: EntityTable<PhotoBlob, 'id'>;
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
    // v2: tách bytes ảnh sang photoBlobs (danh sách chỉ tải ảnh thu nhỏ); chỉ mục kép [status+date] cho sessions.
    this.version(2)
      .stores({
        sessions: 'id, date, status, updatedAt, [status+date]',
        photoBlobs: 'id',
      })
      .upgrade(async (tx) => {
        const blobs = tx.table('photoBlobs');
        // Chuyển bytes từng ảnh sang bảng mới (cùng giao dịch nâng cấp: lỗi giữa chừng => rollback, không mất ảnh).
        // Ảnh thu nhỏ cần canvas nên để bước nền ensureThumbnails() tạo sau khi app mở.
        const photos = tx.table('photos');
        const ids = (await photos.toCollection().primaryKeys()) as string[];
        for (const id of ids) {
          const p = (await photos.get(id)) as Record<string, unknown> | undefined;
          if (!p) continue;
          const data = isArrayBuffer(p.data) ? p.data : null;
          if (data) await blobs.put({ id, data });
          const { data: _drop, ...meta } = p;
          void _drop;
          await photos.put({ ...meta, thumb: isArrayBuffer(meta.thumb) ? meta.thumb : null, bytes: data ? data.byteLength : typeof meta.bytes === 'number' ? meta.bytes : 0 });
        }
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
