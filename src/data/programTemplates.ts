import type { Program, ProgramDay, ProgramExercise } from '../db/types';

/**
 * Giáo án mẫu (v1.9). Dữ liệu tĩnh, tải lười; KHÔNG đụng seed. Mỗi lần "Thêm từ mẫu" tạo một giáo án mới
 * với id riêng (người dùng sửa thoải mái). Nguyên tắc chọn bài: chỉ bài có trong thư viện gốc, mỗi buổi ≤ 8 bài,
 * ưu tiên bài kép (compound) trước, bài đơn khớp sau; 2–3 hiệp cho người mới, 3–4 hiệp cho giáo án 4–6 buổi.
 * Khối lượng tuần theo Schoenfeld, Ogborn & Krieger (2017): ≥ 10 hiệp/nhóm cơ/tuần cho phát triển cơ.
 */
export interface ProgramTemplate {
  key: string;
  name: string;
  /** Số buổi mỗi tuần (để hiển thị và gợi ý). */
  daysPerWeek: number;
  level: 'beginner' | 'intermediate';
  description: string;
  days: { name: string; rows: Row[] }[];
}

type Row = [exerciseId: string, sets: number, repMin: number, repMax: number, rir: number, restSec: number];

const r = (exerciseId: string, sets: number, repMin: number, repMax: number, rir = 2, restSec = 90): Row => [exerciseId, sets, repMin, repMax, rir, restSec];

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    key: 'fullbody-2',
    name: 'Toàn thân 2 buổi — Người bận',
    daysPerWeek: 2,
    level: 'beginner',
    description:
      'Hai buổi toàn thân mỗi tuần, cách nhau 2–3 ngày (vd. Thứ Hai và Thứ Năm). Mỗi buổi 6 bài, 3 hiệp × 8–12 lần, RIR 2. Tổng khoảng 45 phút. Phù hợp khi chỉ tập được 2 ngày/tuần nhưng vẫn muốn tiến bộ đều.',
    days: [
      {
        name: 'Buổi 1',
        rows: [r('goblet-squat', 3, 8, 12, 2, 120), r('db-bench-press', 3, 8, 12, 2, 120), r('lat-pulldown', 3, 8, 12), r('db-rdl', 3, 8, 12, 2, 120), r('seated-db-shoulder-press', 2, 8, 12), r('crunch', 2, 10, 15, 2, 60)],
      },
      {
        name: 'Buổi 2',
        rows: [r('leg-press', 3, 10, 12, 2, 120), r('seated-cable-row', 3, 8, 12), r('incline-db-press', 3, 8, 12), r('lying-leg-curl', 3, 10, 12), r('lateral-raise', 2, 12, 15, 2, 60), r('dead-bug', 2, 8, 12, 2, 60)],
      },
    ],
  },
  {
    key: 'upper-lower-4',
    name: 'Trên/Dưới 4 buổi',
    daysPerWeek: 4,
    level: 'intermediate',
    description:
      'Chia thân trên / thân dưới, 4 buổi mỗi tuần theo vòng Trên 1 → Dưới 1 → Trên 2 → Dưới 2 (vd. T2, T3, T5, T6). Mỗi nhóm cơ được tập 2 lần/tuần với 10–16 hiệp. Buổi 1 nặng hơn (6–10 lần), buổi 2 nhẹ hơn và nhiều lần hơn (10–15 lần).',
    days: [
      {
        name: 'Trên 1 (nặng)',
        rows: [r('bb-bench-press', 4, 6, 8, 2, 150), r('bb-row', 4, 6, 8, 2, 150), r('bb-overhead-press', 3, 6, 10, 2, 120), r('lat-pulldown', 3, 8, 12), r('bb-curl', 2, 8, 12, 2, 60), r('triceps-pushdown', 2, 10, 12, 2, 60)],
      },
      {
        name: 'Dưới 1 (nặng)',
        rows: [r('back-squat', 4, 6, 8, 2, 180), r('romanian-deadlift', 3, 8, 10, 2, 150), r('leg-press', 3, 10, 12, 2, 120), r('lying-leg-curl', 3, 10, 12), r('standing-calf-raise', 3, 10, 15, 2, 60), r('cable-crunch', 2, 10, 15, 2, 60)],
      },
      {
        name: 'Trên 2 (nhẹ)',
        rows: [r('incline-db-press', 3, 10, 12), r('chest-supported-row', 3, 10, 12), r('seated-db-shoulder-press', 3, 10, 12), r('cable-fly', 2, 12, 15, 2, 60), r('face-pull', 3, 12, 15, 2, 60), r('hammer-curl', 2, 10, 12, 2, 60), r('overhead-cable-extension', 2, 10, 15, 2, 60)],
      },
      {
        name: 'Dưới 2 (nhẹ)',
        rows: [r('hack-squat', 3, 10, 12, 2, 120), r('db-rdl', 3, 10, 12, 2, 120), r('bulgarian-split-squat', 2, 10, 12, 2, 90), r('hip-thrust', 3, 10, 12, 2, 120), r('seated-leg-curl', 2, 12, 15), r('seated-calf-raise', 3, 12, 15, 2, 60), r('hanging-knee-raise', 2, 8, 12, 2, 60)],
      },
    ],
  },
  {
    key: 'ppl-6',
    name: 'Đẩy/Kéo/Chân 6 buổi',
    daysPerWeek: 6,
    level: 'intermediate',
    description:
      'Push / Pull / Legs lặp hai lần mỗi tuần, nghỉ 1 ngày (vd. T2–T7, nghỉ CN). Mỗi nhóm cơ 2 lần/tuần, 12–18 hiệp. Dành cho người đã tập ≥ 6 tháng, ngủ đủ và ăn đủ; mệt kéo dài thì chuyển sang Trên/Dưới 4 buổi.',
    days: [
      {
        name: 'Đẩy 1',
        rows: [r('bb-bench-press', 4, 6, 8, 2, 150), r('seated-db-shoulder-press', 3, 8, 10, 2, 120), r('incline-db-press', 3, 8, 12), r('lateral-raise', 3, 12, 15, 2, 60), r('triceps-pushdown', 3, 10, 12, 2, 60), r('overhead-cable-extension', 2, 10, 15, 2, 60)],
      },
      {
        name: 'Kéo 1',
        rows: [r('bb-row', 4, 6, 8, 2, 150), r('pull-up', 3, 5, 10, 2, 120), r('seated-cable-row', 3, 8, 12), r('face-pull', 3, 12, 15, 2, 60), r('bb-curl', 3, 8, 12, 2, 60), r('incline-db-curl', 2, 10, 12, 2, 60)],
      },
      {
        name: 'Chân 1',
        rows: [r('back-squat', 4, 6, 8, 2, 180), r('romanian-deadlift', 3, 8, 10, 2, 150), r('leg-press', 3, 10, 12, 2, 120), r('lying-leg-curl', 3, 10, 12), r('standing-calf-raise', 4, 10, 15, 2, 60), r('cable-crunch', 3, 10, 15, 2, 60)],
      },
      {
        name: 'Đẩy 2',
        rows: [r('bb-overhead-press', 4, 6, 8, 2, 150), r('incline-bb-press', 3, 8, 10, 2, 120), r('machine-chest-press', 3, 10, 12), r('cable-lateral-raise', 3, 12, 15, 2, 60), r('cable-fly', 2, 12, 15, 2, 60), r('skull-crusher', 3, 8, 12, 2, 60)],
      },
      {
        name: 'Kéo 2',
        rows: [r('lat-pulldown', 4, 8, 10, 2, 120), r('chest-supported-row', 3, 8, 12), r('one-arm-db-row', 3, 10, 12), r('rear-delt-fly', 3, 12, 15, 2, 60), r('hammer-curl', 3, 10, 12, 2, 60), r('cable-curl', 2, 12, 15, 2, 60)],
      },
      {
        name: 'Chân 2',
        rows: [r('hack-squat', 3, 8, 12, 2, 150), r('hip-thrust', 3, 8, 12, 2, 120), r('bulgarian-split-squat', 3, 10, 12, 2, 90), r('seated-leg-curl', 3, 12, 15), r('leg-extension', 2, 12, 15, 2, 60), r('seated-calf-raise', 4, 12, 15, 2, 60), r('hanging-knee-raise', 2, 8, 12, 2, 60)],
      },
    ],
  },
];

/** Dựng Program từ mẫu với id mới (gọi khi người dùng bấm "Thêm từ mẫu"). */
export function programFromTemplate(t: ProgramTemplate, newId: (prefix: string) => string, now: string, isActive = false): Program {
  const days: ProgramDay[] = t.days.map((d) => ({
    id: newId('day'),
    name: d.name,
    exercises: d.rows.map(([exerciseId, sets, repMin, repMax, targetRIR, restSec]): ProgramExercise => ({ id: newId('pe'), exerciseId, sets, repMin, repMax, targetRIR, restSec })),
  }));
  return { id: newId('prog'), name: t.name, description: t.description, isActive, days, createdAt: now, updatedAt: now };
}
