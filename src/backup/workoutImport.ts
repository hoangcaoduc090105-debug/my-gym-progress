/**
 * Nhập lịch sử tập từ Strong / Hevy (CSV). Phần này THUẦN (không I/O): nhận dạng định dạng, đọc dòng,
 * chuyển thành buổi tập của app, ghép tên bài, lọc trùng. Ghi DB ở db/importWorkouts.ts.
 */
import type { Exercise, SessionExercise, SetEntry, WorkoutSession } from '../db/types';
import { normalizeGroups } from '../domain/superset';
import { KG_PER_LB } from '../lib/units';

export type CsvFormat = 'strong' | 'hevy';
export interface ImportedSet {
  weightKg: number;
  reps: number;
  rir: number | null;
  isWarmup: boolean;
}
export interface ImportedExercise {
  name: string;
  note: string;
  /** Khóa nhóm superset (Hevy superset_id) trong buổi, hoặc null. */
  groupKey: string | null;
  sets: ImportedSet[];
}
export interface ImportedWorkout {
  date: string;
  startedAt: string;
  finishedAt: string | null;
  dayName: string;
  notes: string;
  exercises: ImportedExercise[];
}

export const STRONG_HEADER = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];
export const HEVY_HEADER = ['title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id', 'exercise_notes', 'set_index', 'set_type', 'weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe'];

export type Detected =
  | { format: 'strong'; weightCol: number; unit: 'kg' | 'lb' | null }
  | { format: 'hevy' }
  | { format: null; header: string[] };

const idx = (header: string[]) => {
  const m = new Map(header.map((h, i) => [h.trim(), i]));
  return (name: string) => m.get(name) ?? -1;
};

/** Nhận dạng theo dòng tiêu đề. Strong: cột tạ "Weight" (chưa rõ đơn vị — hỏi người dùng), "Weight (kg)", "Weight (lbs)". */
export function detectCsvFormat(header: string[]): Detected {
  const h = header.map((x) => x.trim());
  const at = idx(h);
  if (['title', 'start_time', 'exercise_title', 'set_index', 'set_type', 'weight_kg', 'reps'].every((c) => at(c) >= 0)) return { format: 'hevy' };
  if (['Date', 'Workout Name', 'Exercise Name', 'Set Order', 'Reps'].every((c) => at(c) >= 0)) {
    const kg = at('Weight (kg)');
    const lb = at('Weight (lbs)') >= 0 ? at('Weight (lbs)') : at('Weight (lb)');
    const plain = at('Weight');
    if (kg >= 0) return { format: 'strong', weightCol: kg, unit: 'kg' };
    if (lb >= 0) return { format: 'strong', weightCol: lb, unit: 'lb' };
    if (plain >= 0) return { format: 'strong', weightCol: plain, unit: null };
  }
  return { format: null, header: h };
}

const num = (s: string | undefined): number | null => {
  const t = (s ?? '').trim();
  if (!t) return null;
  const n = Number(t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** RPE → RIR = 10 − RPE, làm tròn, kẹp 0–10. */
export function rpeToRir(rpe: string | undefined): number | null {
  const v = num(rpe);
  if (v == null) return null;
  return Math.min(10, Math.max(0, Math.round(10 - v)));
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Ngày giờ theo giờ địa phương: "2026-01-05 07:30:00", "2026-01-05T07:30", "5 Jan 2026, 18:00".
 * Trả { date: 'YYYY-MM-DD', iso: ISO UTC } hoặc null.
 */
export function parseDateTime(s: string | undefined): { date: string; iso: string } | null {
  const t = (s ?? '').trim();
  let y: number, mo: number, d: number, h = 0, mi = 0, se = 0;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[4]) [h, mi, se] = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)];
  } else if ((m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/))) {
    const mm = MONTHS[m[2]!.toLowerCase()];
    if (!mm) return null;
    [y, mo, d] = [Number(m[3]), mm, Number(m[1])];
    if (m[4]) [h, mi] = [Number(m[4]), Number(m[5])];
  } else return null;
  const dt = new Date(y, mo - 1, d, h, mi, se);
  if (Number.isNaN(dt.getTime()) || dt.getMonth() !== mo - 1) return null;
  return { date: `${y}-${pad(mo)}-${pad(d)}`, iso: dt.toISOString() };
}

/** Thời lượng Strong: "1h 5m", "45m", "1h", "30s" → ms. */
export function parseDuration(s: string | undefined): number | null {
  const t = (s ?? '').trim();
  if (!t) return null;
  const h = Number(t.match(/(\d+)\s*h/)?.[1] ?? 0);
  const m = Number(t.match(/(\d+)\s*m(?!s)/)?.[1] ?? 0);
  const sec = Number(t.match(/(\d+)\s*s/)?.[1] ?? 0);
  const ms = ((h * 60 + m) * 60 + sec) * 1000;
  return ms > 0 ? ms : null;
}

const lbToKg2 = (lb: number) => Math.round(lb * KG_PER_LB * 100) / 100;

/** Gom các dòng thành buổi: khóa buổi → bài (theo thứ tự xuất hiện, gộp cùng tên) → hiệp. */
function collect(
  rows: { wKey: string; head: () => Omit<ImportedWorkout, 'exercises'>; name: string; note: string; groupKey: string | null; set: ImportedSet | null }[],
): ImportedWorkout[] {
  const out = new Map<string, ImportedWorkout>();
  for (const r of rows) {
    let w = out.get(r.wKey);
    if (!w) {
      w = { ...r.head(), exercises: [] };
      out.set(r.wKey, w);
    }
    if (!r.name) continue;
    let ex = w.exercises.find((e) => e.name === r.name && e.groupKey === r.groupKey);
    if (!ex) {
      ex = { name: r.name, note: r.note, groupKey: r.groupKey, sets: [] };
      w.exercises.push(ex);
    }
    if (!ex.note && r.note) ex.note = r.note;
    if (r.set) ex.sets.push(r.set);
  }
  // Bỏ bài không có hiệp hợp lệ (vd. chạy bộ chỉ có quãng đường/thời gian) và buổi rỗng.
  return [...out.values()]
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => e.sets.length > 0) }))
    .filter((w) => w.exercises.length > 0);
}

/** Strong: Date, Workout Name, Duration, Exercise Name, Set Order (W = khởi động), Weight…, Reps, …, Notes, Workout Notes, RPE. */
export function parseStrong(rows: string[][], unit: 'kg' | 'lb', weightCol?: number): ImportedWorkout[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const at = idx(header);
  const wc = weightCol ?? (detectCsvFormat(header) as { weightCol?: number }).weightCol ?? at('Weight');
  const c = { date: at('Date'), name: at('Workout Name'), dur: at('Duration'), ex: at('Exercise Name'), order: at('Set Order'), reps: at('Reps'), note: at('Notes'), wnote: at('Workout Notes'), rpe: at('RPE') };
  return collect(
    body.map((r) => {
      const dt = parseDateTime(r[c.date]);
      const dayName = (r[c.name] ?? '').trim() || 'Buổi nhập từ Strong';
      const reps = num(r[c.reps]);
      const w = num(r[wc]);
      return {
        wKey: `${r[c.date]}|${dayName}`,
        head: () => {
          const ms = parseDuration(r[c.dur]);
          return {
            date: dt?.date ?? '',
            startedAt: dt?.iso ?? '',
            finishedAt: dt && ms ? new Date(new Date(dt.iso).getTime() + ms).toISOString() : (dt?.iso ?? null),
            dayName,
            notes: (r[c.wnote] ?? '').trim(),
          };
        },
        name: (r[c.ex] ?? '').trim(),
        note: (r[c.note] ?? '').trim(),
        groupKey: null,
        set:
          reps != null && reps > 0
            ? { weightKg: w == null ? 0 : unit === 'lb' ? lbToKg2(w) : w, reps: Math.round(reps), rir: rpeToRir(r[c.rpe]), isWarmup: (r[c.order] ?? '').trim().toUpperCase() === 'W' }
            : null,
      };
    }),
  ).filter((w) => w.date);
}

/** Hevy: title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg, reps, …, rpe. */
export function parseHevy(rows: string[][]): ImportedWorkout[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const at = idx(header);
  const c = {
    title: at('title'),
    start: at('start_time'),
    end: at('end_time'),
    desc: at('description'),
    ex: at('exercise_title'),
    ss: at('superset_id'),
    note: at('exercise_notes'),
    type: at('set_type'),
    w: at('weight_kg'),
    reps: at('reps'),
    rpe: at('rpe'),
  };
  return collect(
    body.map((r) => {
      const dt = parseDateTime(r[c.start]);
      const end = parseDateTime(r[c.end]);
      const dayName = (r[c.title] ?? '').trim() || 'Buổi nhập từ Hevy';
      const wKey = `${r[c.start]}|${dayName}`;
      const reps = num(r[c.reps]);
      const ss = (r[c.ss] ?? '').trim();
      return {
        wKey,
        head: () => ({ date: dt?.date ?? '', startedAt: dt?.iso ?? '', finishedAt: end?.iso ?? dt?.iso ?? null, dayName, notes: (r[c.desc] ?? '').trim() }),
        name: (r[c.ex] ?? '').trim(),
        note: (r[c.note] ?? '').trim(),
        groupKey: ss ? `${wKey}#${ss}` : null,
        set:
          reps != null && reps > 0
            ? { weightKg: num(r[c.w]) ?? 0, reps: Math.round(reps), rir: rpeToRir(r[c.rpe]), isWarmup: (r[c.type] ?? '').trim().toLowerCase() === 'warmup' }
            : null,
      };
    }),
  ).filter((w) => w.date);
}

/* ---------- Ghép tên bài ---------- */

/** Chuẩn hóa để so khớp: bỏ dấu, chữ thường, bỏ gạch/ký tự lạ, gộp khoảng trắng. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Các khóa so khớp của một tên: chính nó, và dạng "Bench Press (Barbell)" → "barbell bench press". */
export function nameKeys(name: string): string[] {
  const n = normalizeName(name);
  const keys = [n.replace(/[()]/g, '').replace(/\s+/g, ' ').trim()];
  const m = n.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) keys.push(`${m[2]} ${m[1]}`.replace(/\s+/g, ' ').trim());
  return [...new Set(keys)];
}

/**
 * Ghép tên trong tệp với thư viện (nameEn, nameVi; bài gốc + bài tự tạo). Ưu tiên bảng ghép đã lưu
 * (meta csvNameMap, khóa = normalizeName). Không khớp => null (cần người dùng chọn).
 */
export function matchExercises(names: string[], exercises: Exercise[], saved: Record<string, string> = {}): Map<string, string | null> {
  const known = new Set(exercises.map((e) => e.id));
  const index = new Map<string, string>();
  for (const e of exercises) for (const k of [...nameKeys(e.nameEn), ...nameKeys(e.nameVi)]) if (k && !index.has(k)) index.set(k, e.id);
  const out = new Map<string, string | null>();
  for (const name of names) {
    const s = saved[normalizeName(name)];
    if (s && known.has(s)) {
      out.set(name, s);
      continue;
    }
    out.set(name, nameKeys(name).map((k) => index.get(k)).find((x) => !!x) ?? null);
  }
  return out;
}

export const distinctNames = (ws: ImportedWorkout[]) => [...new Set(ws.flatMap((w) => w.exercises.map((e) => e.name)))];

/* ---------- Dựng buổi tập + lọc trùng ---------- */

const LIMITS = { exercises: 40, sets: 50, dayName: 120, notes: 5000, note: 2000 };

export function buildSessions(ws: ImportedWorkout[], nameToId: Map<string, string>, newId: (prefix: string) => string, now: string): WorkoutSession[] {
  return ws.map((w) => {
    const groupIds = new Map<string, string>();
    const exercises: SessionExercise[] = w.exercises.slice(0, LIMITS.exercises).map((e) => {
      const groupId = e.groupKey ? (groupIds.get(e.groupKey) ?? groupIds.set(e.groupKey, newId('grp')).get(e.groupKey)!) : undefined;
      const sets: SetEntry[] = e.sets.slice(0, LIMITS.sets).map((s) => ({ id: newId('set'), weightKg: s.weightKg, reps: s.reps, rir: s.rir, isWarmup: s.isWarmup, done: true }));
      return {
        id: newId('se'),
        exerciseId: nameToId.get(e.name)!,
        target: null,
        note: e.note.slice(0, LIMITS.note),
        sets,
        ...(groupId ? { groupId } : {}),
      };
    });
    return {
      id: newId('ws'),
      date: w.date,
      programId: null,
      programDayId: null,
      dayName: w.dayName.slice(0, LIMITS.dayName),
      status: 'completed',
      startedAt: w.startedAt,
      finishedAt: w.finishedAt,
      notes: w.notes.slice(0, LIMITS.notes),
      exercises: normalizeGroups(exercises),
      deletedAt: null,
      updatedAt: now,
    };
  });
}

/** Khóa trùng: cùng ngày + tên buổi + tổng số hiệp. */
export const dupKey = (s: Pick<WorkoutSession, 'date' | 'dayName' | 'exercises'>) => `${s.date}|${s.dayName}|${s.exercises.reduce((n, e) => n + e.sets.length, 0)}`;

export function splitDuplicates(sessions: WorkoutSession[], existing: Pick<WorkoutSession, 'date' | 'dayName' | 'exercises' | 'deletedAt'>[]): { fresh: WorkoutSession[]; skipped: number } {
  const seen = new Set(existing.filter((s) => !s.deletedAt).map(dupKey));
  const fresh: WorkoutSession[] = [];
  let skipped = 0;
  for (const s of sessions) {
    const k = dupKey(s);
    if (seen.has(k)) skipped += 1;
    else {
      seen.add(k);
      fresh.push(s);
    }
  }
  return { fresh, skipped };
}
