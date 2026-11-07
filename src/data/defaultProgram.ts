import type { Program, ProgramExercise } from '../db/types';

type Row = [exerciseId: string, sets: number, repMin: number, repMax: number, rir: number, restSec: number];

const mk = (dayKey: string, rows: Row[]): ProgramExercise[] =>
  rows.map(([exerciseId, sets, repMin, repMax, targetRIR, restSec], i) => ({
    id: `def-${dayKey}-${i + 1}`,
    exerciseId,
    sets,
    repMin,
    repMax,
    targetRIR,
    restSec,
  }));

/**
 * Giáo án toàn thân 3 buổi/tuần cho người mới (ACSM, 2009: người mới tập toàn thân 2–3 buổi/tuần).
 * Không gắn với thứ cố định — tập theo vòng A → B → C, nên nghỉ ít nhất 1 ngày giữa các buổi.
 */
export function createDefaultProgram(now: string): Program {
  return {
    id: 'program-default-fullbody',
    name: 'Toàn thân 3 buổi — Người mới',
    description:
      'Vòng A → B → C, mỗi tuần 3 buổi, nghỉ ít nhất 1 ngày giữa 2 buổi. 2–3 hiệp × 8–12 lần, dừng khi còn khoảng 2 lần dự trữ (RIR 2). Chỉnh sửa tự do.',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    days: [
      {
        id: 'day-a',
        name: 'Buổi A',
        exercises: mk('a', [
          ['goblet-squat', 3, 8, 12, 2, 120],
          ['db-bench-press', 3, 8, 12, 2, 120],
          ['seated-cable-row', 3, 10, 12, 2, 90],
          ['db-rdl', 3, 8, 12, 2, 120],
          ['lateral-raise', 2, 12, 15, 2, 60],
          ['dead-bug', 2, 8, 12, 2, 60],
        ]),
      },
      {
        id: 'day-b',
        name: 'Buổi B',
        exercises: mk('b', [
          ['leg-press', 3, 10, 12, 2, 120],
          ['seated-db-shoulder-press', 3, 8, 12, 2, 90],
          ['lat-pulldown', 3, 8, 12, 2, 90],
          ['lying-leg-curl', 3, 10, 12, 2, 90],
          ['cable-crunch', 2, 10, 15, 2, 60],
          ['standing-calf-raise', 3, 10, 15, 2, 60],
        ]),
      },
      {
        id: 'day-c',
        name: 'Buổi C',
        exercises: mk('c', [
          ['bulgarian-split-squat', 2, 8, 12, 2, 120],
          ['incline-db-press', 3, 8, 12, 2, 90],
          ['one-arm-db-row', 3, 8, 12, 2, 90],
          ['hip-thrust', 3, 8, 12, 2, 120],
          ['db-curl', 2, 10, 12, 2, 60],
          ['triceps-pushdown', 2, 10, 12, 2, 60],
          ['seated-calf-raise', 2, 12, 15, 2, 60],
        ]),
      },
    ],
  };
}
