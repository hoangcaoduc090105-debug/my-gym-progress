import { THRESHOLDS } from './thresholds';

export type OneRmFormula = 'epley' | 'brzycki';

export const FORMULA_LABEL: Record<OneRmFormula, string> = {
  epley: 'Epley: kg × (1 + lần/30)',
  brzycki: 'Brzycki: kg × 36 / (37 − lần)',
};

/**
 * Ước tính 1RM (mức tạ tối đa cho 1 lần lặp).
 * - Trả về null khi dữ liệu không hợp lệ hoặc số lần lặp > 10 (ngoài vùng công thức đáng tin cậy).
 * - 1 lần lặp => chính mức tạ đó.
 */
export function estimate1RM(weightKg: number, reps: number, formula: OneRmFormula = 'epley'): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isInteger(reps) || reps < 1 || reps > THRESHOLDS.maxRepsFor1RM) return null;
  if (reps === 1) return round1(weightKg);
  const value = formula === 'epley' ? weightKg * (1 + reps / 30) : (weightKg * 36) / (37 - reps);
  return round1(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
