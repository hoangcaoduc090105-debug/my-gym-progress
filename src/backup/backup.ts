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
import type { Exercise, Program, ProgressPhoto, ScheduledWorkout, WorkoutSession } from '../db/types';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { createDefaultProgram } from '../data/defaultProgram';
import { ensureSeed } from '../db/seed';
import { notifyStorageChanged } from '../lib/storage';
import { nowISO } from '../lib/date';
import { arrayBufferToBase64, base64ToArrayBuffer } from './base64';

export const BACKUP_APP_ID = 'my-gym-progress';
/**
 * 1: v1.0–1.7. 2: v1.8 — thêm trường tùy chọn (groupId, replacedFrom, isDeload, settings.barbell, weightUnit…).
 * Tệp định dạng 1 vẫn nhập được (các trường mới vắng mặt = mặc định).
 */
export const BACKUP_FORMAT_VERSION = 2;

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

/** Chỉ các trường siêu dữ liệu của ảnh (đúng định dạng tệp sao lưu v1.6). */
export function photoMeta(p: ProgressPhoto): Record<string, unknown> {
  const { thumb: _t, bytes: _b, ...meta } = p;
  void _t, _b;
  return meta;
}

export async function exportAll(opts: { includePhotos: boolean; appVersion: string }): Promise<BackupFile> {
  const data = {} as BackupData;
  await db.transaction('r', [...USER_TABLES.map((t) => db.table(t)), db.photoBlobs], async () => {
    for (const t of USER_TABLES) {
      if (t === 'photos') {
        if (!opts.includePhotos) {
          data.photos = [];
          continue;
        }
        // Định dạng tệp giữ như v1.6: siêu dữ liệu + dataBase64 (ghép từ photoBlobs); không xuất thumb/bytes.
        const photos = (await db.photos.toArray()) as ProgressPhoto[];
        const out: unknown[] = [];
        for (const p of photos) {
          const blob = await db.photoBlobs.get(p.id);
          if (!blob) continue;
          out.push({ ...photoMeta(p), dataBase64: arrayBufferToBase64(blob.data) });
        }
        data.photos = out;
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

/**
 * Xuất sao lưu thành Blob ghép từ nhiều phần (JSON từng bảng; mỗi ảnh base64 là một phần riêng),
 * KHÔNG bao giờ dựng một chuỗi JSON khổng lồ trong bộ nhớ. Nội dung tệp giống hệt JSON.stringify(exportAll()).
 */
export async function exportAllToBlob(opts: { includePhotos: boolean; appVersion: string }): Promise<Blob> {
  const parts: BlobPart[] = [];
  const head = JSON.stringify({ app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: nowISO(), appVersion: opts.appVersion, includesPhotos: opts.includePhotos });
  parts.push(head.slice(0, -1), ',"data":{');
  await db.transaction('r', [...USER_TABLES.map((t) => db.table(t)), db.photoBlobs], async () => {
    for (const [ti, t] of USER_TABLES.entries()) {
      parts.push(`${ti ? ',' : ''}${JSON.stringify(t)}:[`);
      if (t === 'photos') {
        if (opts.includePhotos) {
          const metas = (await db.photos.toArray()) as ProgressPhoto[];
          let first = true;
          for (const p of metas) {
            const blob = await db.photoBlobs.get(p.id);
            if (!blob) continue;
            // {...meta,"dataBase64":"<base64>"} — base64 là một phần riêng (Blob con), không nối chuỗi.
            const metaJson = JSON.stringify({ ...photoMeta(p), dataBase64: '' });
            parts.push(`${first ? '' : ','}${metaJson.slice(0, -2)}`, new Blob([arrayBufferToBase64(blob.data)]), '"}');
            first = false;
          }
        }
      } else {
        const rows = await db.table(t).toArray();
        rows.forEach((row, i) => parts.push(`${i ? ',' : ''}${JSON.stringify(row)}`));
      }
      parts.push(']');
    }
  });
  parts.push('}}');
  return new Blob(parts, { type: 'application/json' });
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
  if (!errors.length) errors.push(...crossCheck(cleaned));
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

/** Kiểm tra tổng thể sau khi từng dòng đã hợp lệ: ảnh giải mã được, ràng buộc giữa các bảng. */
function crossCheck(d: BackupData): string[] {
  const errs: string[] = [];
  (d.photos as { dataBase64: string }[]).forEach((p, i) => {
    try {
      if (base64ToArrayBuffer(p.dataBase64).byteLength === 0) throw new Error('rỗng');
    } catch {
      errs.push(`Ảnh thứ ${i + 1} hỏng (dữ liệu base64 không giải mã được).`);
    }
  });
  const programs = d.programs as Program[];
  const active = programs.filter((p) => p.isActive);
  if (active.length > 1) errs.push(`Tệp có ${active.length} giáo án đang dùng (isActive) — chỉ được tối đa 1.`);
  const drafts = (d.sessions as WorkoutSession[]).filter((s) => s.status === 'draft' && !s.deletedAt);
  if (drafts.length > 1) errs.push(`Tệp có ${drafts.length} buổi tập dở chưa xóa — chỉ được tối đa 1.`);
  // Tham chiếu: bài tập phải có trong tệp hoặc thư viện gốc; giáo án của lịch hẹn phải có trong tệp hoặc giáo án mặc định.
  const exIds = new Set<string>([...BUILTIN_EXERCISES.map((e) => e.id), ...(d.exercises as Exercise[]).map((e) => e.id)]);
  const progIds = new Set<string>([createDefaultProgram('').id, ...programs.map((p) => p.id)]);
  const missingEx = new Set<string>();
  for (const p of programs) for (const day of p.days) for (const pe of day.exercises) if (!exIds.has(pe.exerciseId)) missingEx.add(pe.exerciseId);
  for (const s of d.sessions as WorkoutSession[]) for (const se of s.exercises) if (!exIds.has(se.exerciseId)) missingEx.add(se.exerciseId);
  if (missingEx.size) errs.push(`Tham chiếu tới bài tập không tồn tại: ${[...missingEx].slice(0, 5).join(', ')}${missingEx.size > 5 ? '…' : ''}.`);
  const missingProg = new Set((d.schedule as ScheduledWorkout[]).map((x) => x.programId).filter((id) => !progIds.has(id)));
  if (missingProg.size) errs.push(`Lịch hẹn tham chiếu tới giáo án không tồn tại: ${[...missingProg].slice(0, 5).join(', ')}.`);
  return errs;
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
export interface ImportResult {
  written: Record<UserTable, number>;
  /** Thông báo cho người dùng (ví dụ buổi dở trong tệp bị đưa vào thùng rác). */
  notices: string[];
}

export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportResult> {
  const check = validateBackup(backup);
  if (!check.ok || !check.backup) throw new AppError('Dữ liệu nhập không hợp lệ', check.errors);
  backup = check.backup;
  const written = {} as Record<UserTable, number>;
  const notices: string[] = [];
  await db.transaction('rw', [...USER_TABLES.map((t) => db.table(t)), db.photoBlobs], async () => {
    for (const t of USER_TABLES) {
      const rows = (backup.data[t] ?? []) as Record<string, unknown>[];
      const table = db.table(t);
      if (mode === 'replace') {
        // Không xóa ảnh hiện có nếu tệp không kèm ảnh.
        if (!(t === 'photos' && !backup.includesPhotos)) {
          await table.clear();
          if (t === 'photos') await db.photoBlobs.clear();
        }
      }
      if (t === 'photos') {
        // Ảnh: siêu dữ liệu vào photos (thumb tạo nền sau), bytes vào photoBlobs.
        for (const { dataBase64, ...meta } of rows) {
          const data = base64ToArrayBuffer(String(dataBase64));
          const id = String(meta.id);
          const existing = (await db.photos.get(id)) as ProgressPhoto | undefined;
          await db.photos.put({ ...meta, thumb: existing?.thumb ?? null, bytes: data.byteLength } as unknown as ProgressPhoto);
          await db.photoBlobs.put({ id, data });
        }
        written[t] = rows.length;
        continue;
      }
      let prepared = rows;
      if (t === 'sessions' && mode === 'merge') {
        // Gộp: nếu máy đang có buổi dở khác thì buổi dở trong tệp vào thùng rác (chỉ giữ 1 buổi dở).
        const current = await db.sessions.where('status').equals('draft').filter((x) => !x.deletedAt).first();
        if (current) {
          prepared = rows.map((r) => {
            const x = r as unknown as WorkoutSession;
            if (x.status === 'draft' && !x.deletedAt && x.id !== current.id) {
              notices.push(`Buổi tập dở "${x.dayName}" trong tệp được đưa vào Thùng rác vì máy đang có buổi dở khác.`);
              return { ...r, deletedAt: nowISO() };
            }
            return r;
          });
        }
      }
      if (t === 'programs' && mode === 'merge' && prepared.some((p) => (p as { isActive?: boolean }).isActive)) {
        const current = await db.programs.toArray();
        for (const p of current) if (p.isActive) await db.programs.put({ ...p, isActive: false });
      }
      await table.bulkPut(prepared);
      written[t] = prepared.length;
    }
  });
  if (mode === 'replace') {
    // Tệp cũ có thể mang thư viện gốc phiên bản cũ: nạp lại thư viện bài tập gốc (không đụng bài tự tạo).
    await db.meta.put({ key: 'seedVersion', value: 0 });
    await ensureSeed();
  }
  notifyStorageChanged();
  return { written, notices };
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
