import type { SetEntry } from '../db/types';
import { nearestLoadable } from './plates';
import { KG_PER_LB } from '../lib/units';

/** Bậc khởi động mặc định: % mức tạ làm việc × số lần (theo thứ tự từ nhẹ tới nặng). */
export const WARMUP_STEPS: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 8 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
];

export interface WarmupOptions {
  /** Tạ đòn: làm tròn về mức gắn được với đòn + đĩa đang có. */
  barbell?: { barWeightKg: number; platesKg: number[] } | null;
  /** Bài khác: làm tròn theo bước 2,5 kg hoặc 2,5 lb. */
  unit?: 'kg' | 'lb';
  /** Bài trọng lượng cơ thể (tạ làm việc 0): 1 hiệp 8 lần không tạ. */
  isBodyweight?: boolean;
}

const roundStep = (kg: number, unit: 'kg' | 'lb') => {
  if (unit === 'lb') return Math.round((Math.round(kg / KG_PER_LB / 2.5) * 2.5 * KG_PER_LB) * 100) / 100;
  return Math.round((Math.round(kg / 2.5) * 2.5) * 100) / 100;
};

/**
 * Hiệp khởi động gợi ý từ mức tạ làm việc (kg): 40 % × 8, 60 % × 5, 80 % × 3.
 * - Tạ đòn: mỗi bậc làm tròn về mức gắn được; không bao giờ thấp hơn đòn trống; bỏ bậc trùng nhau.
 * - Bài khác: làm tròn 2,5 kg / 2,5 lb; bỏ bậc ≤ 0 và bậc trùng.
 * - Tạ làm việc ≤ 0 (trọng lượng cơ thể): một hiệp 8 lần không tạ.
 * Trả về SetEntry với isWarmup = true, done = false; id do caller gán.
 */
export function warmupSets(workKg: number, opts: WarmupOptions = {}, newId: () => string = () => ''): SetEntry[] {
  const unit = opts.unit ?? 'kg';
  const mk = (weightKg: number, reps: number): SetEntry => ({ id: newId(), weightKg, reps, rir: null, isWarmup: true, done: false });
  if (!(workKg > 0)) return opts.isBodyweight ? [mk(0, 8)] : [];
  const out: SetEntry[] = [];
  const seen = new Set<number>();
  for (const step of WARMUP_STEPS) {
    const raw = workKg * step.pct;
    let kg: number;
    if (opts.barbell && opts.barbell.platesKg.length) {
      const bar = opts.barbell.barWeightKg;
      kg = raw <= bar ? bar : nearestLoadable(raw, bar, opts.barbell.platesKg).nearest;
    } else {
      kg = roundStep(raw, unit);
    }
    if (kg <= 0 || kg >= workKg || seen.has(kg)) continue;
    seen.add(kg);
    out.push(mk(kg, step.reps));
  }
  return out;
}
