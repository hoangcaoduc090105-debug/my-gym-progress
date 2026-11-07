import { z } from 'zod';
import { db, USER_TABLES, type UserTable } from '../db/db';
import { AppError } from '../db/errors';
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
} from '../db/schemas';
import type { ProgressPhoto } from '../db/types';
import { nowISO } from '../lib/date';
import { arrayBufferToBase64, base64ToArrayBuffer } from './base64';

export const BACKUP_APP_ID = 'my-gym-progress';
export const BACKUP_FORMAT_VERSION = 1;

const photoExportSchema = photoMetaSchema.and(z.object({ dataBase64: z.string().min(1) }));

const TABLE_SCHEMAS: Record<UserTable, z.ZodTypeAny> = {
  profile: profileSchema,
  settings: settingsSchema,
  exercises: exerciseSchema,
  programs: programSchema,
  schedule: scheduleSchema,
  sessions: sessionSchema,
  bodyMetrics: bodyMetricSchema,
  photos: photoExportSchema,
  foods: foodSchema,
  foodLogs: foodLogSchema,
  mealPlans: mealPlanSchema,
};

export const TABLE_LABELS: Record<UserTable, string> = {
  profile: 'Hồ sơ',
  settings: 'Cài đặt',
  exercises: 'Bài tập',
  programs: 'Giáo án',
  schedule: 'Lịch đặt trước',
  sessions: 'Buổi tập',
  bodyMetrics: 'Số đo cơ thể',
  photos: 'Ảnh tiến độ',
  foods: 'Thực phẩm',
  foodLogs: 'Nhật ký ăn',
  mealPlans: 'Thực đơn',
};

export type BackupData = Record<UserTable, unknown[]>;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  includesPhotos: boolean;
  data: BackupData;
}

export async function exportAll(opts: { includePhotos: boolean; appVersion: string }): Promise<BackupFile> {
  const data = {} as BackupData;
  await db.transaction('r', USER_TABLES.map((t) => db.table(t)), async () => {
    for (const t of USER_TABLES) {
      if (t === 'photos') {
        if (!opts.includePhotos) {
          data.photos = [];
          continue;
        }
        const photos = (await db.photos.toArray()) as ProgressPhoto[];
        data.photos = photos.map(({ data: buf, ...meta }) => ({ ...meta, dataBase64: arrayBufferToBase64(buf) }));
      } else {
        data[t] = await db.table(t).toArray();
      }
    }
  });
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: nowISO(),
    appVersion: opts.appVersion,
    includesPhotos: opts.includePhotos,
    data,
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  counts: Partial<Record<UserTable, number>>;
  backup?: BackupFile;
}

const MAX_ERRORS = 30;

/** Kiểm tra toàn bộ file trước khi ghi bất kỳ thứ gì vào cơ sở dữ liệu. */
export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const counts: Partial<Record<UserTable, number>> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['Tệp không phải là đối tượng JSON hợp lệ.'], counts };
  }
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP_ID) errors.push('Tệp không phải bản sao lưu của My Gym Progress (thiếu "app": "my-gym-progress").');
  if (typeof r.formatVersion !== 'number' || !Number.isInteger(r.formatVersion)) errors.push('Thiếu "formatVersion".');
  else if (r.formatVersion > BACKUP_FORMAT_VERSION)
    errors.push(`Bản sao lưu được tạo bởi phiên bản mới hơn (định dạng ${r.formatVersion}). Hãy cập nhật ứng dụng trước khi nhập.`);
  if (typeof r.data !== 'object' || r.data === null || Array.isArray(r.data)) {
    errors.push('Thiếu phần "data".');
    return { ok: false, errors, counts };
  }
  const data = r.data as Record<string, unknown>;
  const cleaned = {} as BackupData;
  for (const key of Object.keys(data)) {
    if (!(USER_TABLES as readonly string[]).includes(key)) errors.push(`Bảng không xác định: "${key}".`);
  }
  for (const t of USER_TABLES) {
    const rows = data[t];
    if (rows === undefined) {
      counts[t] = 0;
      cleaned[t] = [];
      continue;
    }
    if (!Array.isArray(rows)) {
      errors.push(`"${t}" phải là mảng.`);
      continue;
    }
    counts[t] = rows.length;
    cleaned[t] = [];
    const schema = TABLE_SCHEMAS[t];
    const ids = new Set<string>();
    rows.forEach((row, i) => {
      if (errors.length >= MAX_ERRORS) return;
      const res = schema.safeParse(row);
      if (!res.success) {
        errors.push(...formatZodError(res.error, `${TABLE_LABELS[t]} #${i + 1} → `).slice(0, 3));
        return;
      }
      cleaned[t].push(res.data);
      const rid = (row as { id?: unknown }).id;
      if (typeof rid === 'string') {
        if (ids.has(rid)) errors.push(`${TABLE_LABELS[t]} #${i + 1}: trùng id "${rid}".`);
        ids.add(rid);
      }
    });
  }
  if (errors.length >= MAX_ERRORS) errors.push('… còn lỗi khác, đã dừng kiểm tra.');
  return errors.length ? { ok: false, errors, counts } : {
        ok: true,
        errors,
        counts,
        backup: {
          app: BACKUP_APP_ID,
          formatVersion: r.formatVersion as number,
          exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : '',
          appVersion: typeof r.appVersion === 'string' ? r.appVersion : '',
          includesPhotos: r.includesPhotos === true || (cleaned.photos?.length ?? 0) > 0,
          data: cleaned,
        },
      };
}

export function parseBackupText(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Tệp không phải JSON hợp lệ (lỗi cú pháp).'], counts: {} };
  }
  return validateBackup(raw);
}

export type ImportMode = 'replace' | 'merge';

/**
 * Ghi dữ liệu đã kiểm tra vào DB trong MỘT giao dịch: lỗi giữa chừng => rollback toàn bộ, không mất dữ liệu cũ.
 * - replace: xóa dữ liệu hiện tại rồi ghi dữ liệu từ tệp.
 * - merge: giữ dữ liệu hiện tại; bản ghi trùng id sẽ được thay bằng bản trong tệp.
 */
export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<Record<UserTable, number>> {
  const check = validateBackup(backup);
  if (!check.ok || !check.backup) throw new AppError('Dữ liệu nhập không hợp lệ', check.errors);
  backup = check.backup;
  const written = {} as Record<UserTable, number>;
  await db.transaction('rw', USER_TABLES.map((t) => db.table(t)), async () => {
    for (const t of USER_TABLES) {
      const rows = (backup.data[t] ?? []) as Record<string, unknown>[];
      const table = db.table(t);
      if (mode === 'replace') {
        // Không xóa ảnh hiện có nếu tệp không kèm ảnh.
        if (!(t === 'photos' && !backup.includesPhotos)) await table.clear();
      }
      const prepared =
        t === 'photos'
          ? rows.map(({ dataBase64, ...meta }) => ({ ...meta, data: base64ToArrayBuffer(String(dataBase64)) }))
          : rows;
      if (t === 'programs' && mode === 'merge' && prepared.some((p) => (p as { isActive?: boolean }).isActive)) {
        const current = await db.programs.toArray();
        for (const p of current) if (p.isActive) await db.programs.put({ ...p, isActive: false });
      }
      await table.bulkPut(prepared);
      written[t] = prepared.length;
    }
  });
  return written;
}

export async function countExisting(): Promise<Record<UserTable, number>> {
  const out = {} as Record<UserTable, number>;
  for (const t of USER_TABLES) out[t] = await db.table(t).count();
  return out;
}

/** Số bản ghi trong tệp trùng id với bản ghi hiện có (sẽ bị ghi đè khi gộp). */
export async function countConflicts(backup: BackupFile): Promise<number> {
  let n = 0;
  for (const t of USER_TABLES) {
    const rows = (backup.data[t] ?? []) as { id?: string }[];
    const ids = rows.map((r) => r.id).filter((x): x is string => typeof x === 'string');
    if (!ids.length) continue;
    const found = await db.table(t).bulkGet(ids);
    n += found.filter(Boolean).length;
  }
  return n;
}
