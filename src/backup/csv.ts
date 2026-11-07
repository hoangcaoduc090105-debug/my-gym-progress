import type { BodyMetric, Exercise, WorkoutSession } from '../db/types';
import { BODY_FIELDS, BODY_FIELD_LABELS } from '../db/types';
import { estimate1RM, type OneRmFormula } from '../domain/oneRepMax';
import { isWorkingSet, splitByExercise } from '../domain/sets';
import { groupExercises } from '../domain/superset';

/** Escape theo RFC 4180: bọc ngoặc kép khi có dấu phẩy, ngoặc kép, xuống dòng. Chặn CSV injection. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  // BOM để Excel nhận đúng tiếng Việt UTF-8.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function workoutsToCsv(sessions: WorkoutSession[], exercises: Map<string, Exercise>, formula: OneRmFormula): string {
  const header = [
    'Ngày',
    'Buổi',
    'Bài tập (VI)',
    'Bài tập (EN)',
    'Nhóm cơ chính',
    'Hiệp',
    'Khởi động',
    'Mức tạ (kg)',
    'Số lần',
    'RIR',
    'Hoàn thành',
    'e1RM ước tính (kg)',
    'Ghi chú bài tập',
    'Ghi chú buổi',
    'Nhóm',
  ];
  const rows: unknown[][] = [header];
  const sorted = [...sessions]
    .filter((s) => s.status === 'completed' && !s.deletedAt)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
  for (const s of sorted) {
    // Nhãn superset (A1, A2…) theo vị trí bài trong buổi.
    const labels = new Map<string, string>();
    for (const g of groupExercises(s.exercises)) for (const x of g.items) if (x.label) labels.set(x.item.id, x.label);
    for (const se of s.exercises.flatMap(splitByExercise)) {
      const ex = exercises.get(se.exerciseId);
      se.sets.forEach((set, i) => {
        rows.push([
          s.date,
          s.dayName,
          ex?.nameVi ?? se.exerciseId,
          ex?.nameEn ?? '',
          ex?.primaryMuscle ?? '',
          i + 1,
          set.isWarmup ? 'có' : '',
          set.weightKg ?? '',
          set.reps ?? '',
          set.rir ?? '',
          set.done ? 'có' : 'không',
          isWorkingSet(set) ? (estimate1RM(set.weightKg ?? 0, set.reps ?? 0, formula) ?? '') : '',
          i === 0 ? se.note : '',
          i === 0 ? s.notes : '',
          labels.get(se.id) ?? '',
        ]);
      });
    }
  }
  return toCsv(rows);
}

export function bodyMetricsToCsv(metrics: BodyMetric[]): string {
  const header = ['Ngày', ...BODY_FIELDS.map((f) => BODY_FIELD_LABELS[f] + (f === 'weightKg' ? ' (kg)' : ' (cm)')), 'Ghi chú'];
  const rows: unknown[][] = [header];
  for (const m of [...metrics].filter((x) => !x.deletedAt).sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([m.date, ...BODY_FIELDS.map((f) => m[f] ?? ''), m.note ?? '']);
  }
  return toCsv(rows);
}
