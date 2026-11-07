import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../../src/backup/csvParse';
import {
  buildSessions,
  detectCsvFormat,
  distinctNames,
  matchExercises,
  nameKeys,
  parseDateTime,
  parseDuration,
  parseHevy,
  parseStrong,
  rpeToRir,
  splitDuplicates,
} from '../../src/backup/workoutImport';
import { BUILTIN_EXERCISES } from '../../src/data/exercises';
import { groupExercises } from '../../src/domain/superset';

const fx = (n: string) => readFileSync(join(__dirname, '../fixtures', n), 'utf8');

describe('nhận dạng định dạng', () => {
  it('Strong (kg / lbs / chỉ "Weight"), Hevy, định dạng khác', () => {
    const strong = parseCsv(fx('strong.csv'))[0]!;
    expect(detectCsvFormat(strong)).toMatchObject({ format: 'strong', unit: 'lb' });
    expect(detectCsvFormat(strong.map((h) => (h === 'Weight (lbs)' ? 'Weight (kg)' : h)))).toMatchObject({ format: 'strong', unit: 'kg' });
    expect(detectCsvFormat(strong.map((h) => (h === 'Weight (lbs)' ? 'Weight' : h)))).toMatchObject({ format: 'strong', unit: null });
    expect(detectCsvFormat(parseCsv(fx('hevy.csv'))[0]!)).toEqual({ format: 'hevy' });
    expect(detectCsvFormat(['Ngày', 'Bài', 'Kg'])).toEqual({ format: null, header: ['Ngày', 'Bài', 'Kg'] });
  });
});

describe('Strong', () => {
  const ws = parseStrong(parseCsv(fx('strong.csv')), 'lb');
  it('đúng số buổi / bài / hiệp; bỏ bài chạy bộ không có số lần', () => {
    expect(ws).toHaveLength(2);
    expect(ws.map((w) => w.exercises.map((e) => `${e.name}:${e.sets.length}`))).toEqual([
      ['Bench Press (Barbell):4', 'Lat Pulldown:2'],
      ['Barbell Row:2', 'Face Pull:1'],
    ]);
  });
  it('lb → kg, hiệp W = khởi động, RPE → RIR, ghi chú và thời lượng', () => {
    const bench = ws[0]!.exercises[0]!;
    expect(bench.sets[0]).toEqual({ weightKg: 43.09, reps: 10, rir: null, isWarmup: true });
    expect(bench.sets[1]).toEqual({ weightKg: 61.23, reps: 8, rir: 2, isWarmup: false });
    expect(bench.sets.map((s) => s.rir)).toEqual([null, 2, 2, 1]);
    expect(bench.note).toBe('Vai hơi mỏi');
    expect(ws[0]!.notes).toBe('Ngủ đủ, tập tốt');
    expect(ws[1]!.notes).toBe('Tập buổi tối\nmệt nhẹ');
    expect(ws[1]!.exercises[1]!.sets[0]!.rir).toBe(0); // RPE 11 kẹp về 0
    expect(ws[0]!.date).toBe('2026-01-05');
    expect(new Date(ws[0]!.finishedAt!).getTime() - new Date(ws[0]!.startedAt).getTime()).toBe(65 * 60_000);
    expect(ws[0]!.dayName).toBe('Push A');
  });
  it('cột "Weight" coi là kg khi người dùng chọn kg', () => {
    const rows = parseCsv(fx('strong.csv').replace('Weight (lbs)', 'Weight'));
    expect(parseStrong(rows, 'kg')[0]!.exercises[0]!.sets[1]!.weightKg).toBe(135);
  });
});

describe('Hevy', () => {
  const ws = parseHevy(parseCsv(fx('hevy.csv')));
  it('đúng số buổi / bài / hiệp; warmup → isWarmup; RPE → RIR', () => {
    expect(ws).toHaveLength(2);
    expect(ws.map((w) => w.exercises.map((e) => `${e.name}:${e.sets.length}`))).toEqual([
      ['Squat (Barbell):3', 'Leg Press:1', 'Leg Extension:2', 'Lying Leg Curl:2'],
      ['Pull Up:1', 'Dumbbell Curl:1', 'Triceps Pushdown:1'],
    ]);
    expect(ws[0]!.exercises[0]!.sets[0]!.isWarmup).toBe(true);
    expect(ws[0]!.exercises[0]!.sets.map((s) => s.rir)).toEqual([null, 2, 1]);
    expect(ws[0]!.exercises[1]!.sets[0]!.rir).toBe(3); // RPE 7,5 → 2,5 → 3
    expect(ws[0]!.notes).toBe('Chân, nặng');
    expect(ws[0]!.date).toBe('2026-01-05');
    expect(new Date(ws[0]!.finishedAt!).getTime() - new Date(ws[0]!.startedAt).getTime()).toBe(70 * 60_000);
  });
  it('superset_id → groupId (A1/A2), bài lẻ không có nhóm', () => {
    const ids = new Map(distinctNames(ws).map((n) => [n, `ex-${n}`]));
    let k = 0;
    const sessions = buildSessions(ws, ids, (p) => `${p}-${++k}`, '2026-01-10T00:00:00.000Z');
    const g = groupExercises(sessions[0]!.exercises);
    expect(g.map((x) => x.items.map((i) => i.label ?? '-').join(' '))).toEqual(['-', '-', 'A1 A2']);
    const g2 = groupExercises(sessions[1]!.exercises);
    expect(g2.map((x) => x.items.map((i) => i.label ?? '-').join(' '))).toEqual(['-', 'A1 A2']);
    expect(sessions[0]!.exercises[2]!.groupId).toBe(sessions[0]!.exercises[3]!.groupId);
    expect(sessions[0]!.exercises[2]!.groupId).not.toBe(sessions[1]!.exercises[1]!.groupId);
    expect(sessions.every((s) => s.status === 'completed' && s.programId === null)).toBe(true);
    expect(sessions[0]!.exercises.every((e) => e.sets.every((x) => x.done))).toBe(true);
  });
});

describe('ghép tên, ngày giờ, trùng lặp', () => {
  it('khớp nameEn chính xác và dạng "X (Dụng cụ)"; không khớp => null; bảng đã lưu ưu tiên', () => {
    const m = matchExercises(['Bench Press (Barbell)', 'Lat Pulldown', 'Pull Up', 'Squat (Barbell)', 'Đạp đùi máy'], BUILTIN_EXERCISES);
    expect(m.get('Bench Press (Barbell)')).toBe('bb-bench-press');
    expect(m.get('Lat Pulldown')).toBe('lat-pulldown');
    expect(m.get('Pull Up')).toBe('pull-up');
    expect(m.get('Squat (Barbell)')).toBeNull();
    expect(m.get('Đạp đùi máy')).toBe('leg-press');
    const saved = matchExercises(['Squat (Barbell)'], BUILTIN_EXERCISES, { 'squat (barbell)': 'back-squat' });
    expect(saved.get('Squat (Barbell)')).toBe('back-squat');
    expect(nameKeys('Bench Press (Barbell)')).toEqual(['bench press barbell', 'barbell bench press']);
  });
  it('ngày giờ và thời lượng', () => {
    expect(parseDateTime('5 Jan 2026, 18:00')!.date).toBe('2026-01-05');
    expect(parseDateTime('2026-02-28 23:59:00')!.date).toBe('2026-02-28');
    expect(parseDateTime('31 Feb 2026, 10:00')).toBeNull();
    expect(parseDateTime('hôm qua')).toBeNull();
    expect(parseDuration('1h 5m')).toBe(65 * 60_000);
    expect(parseDuration('45m')).toBe(45 * 60_000);
    expect(rpeToRir('')).toBeNull();
  });
  it('trùng: cùng ngày + tên buổi + số hiệp', () => {
    const ws = parseHevy(parseCsv(fx('hevy.csv')));
    const ids = new Map(distinctNames(ws).map((n) => [n, `ex-${n}`]));
    let k = 0;
    const a = buildSessions(ws, ids, (p) => `${p}-${++k}`, 'x');
    const r = splitDuplicates(a, [a[0]!]);
    expect(r.skipped).toBe(1);
    expect(r.fresh.map((s) => s.dayName)).toEqual(['Upper']);
  });
});
