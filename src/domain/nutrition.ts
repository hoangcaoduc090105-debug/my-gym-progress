import type { FoodLog, FoodSnapshot } from '../db/types';

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  /** true nếu có ít nhất một mục là số liệu ước tính (chưa xác minh). */
  hasEstimates: boolean;
  items: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function scale(food: FoodSnapshot, servings: number) {
  const k = Number.isFinite(servings) && servings > 0 ? servings : 0;
  return { kcal: r1(food.kcal * k), proteinG: r1(food.proteinG * k), carbG: r1(food.carbG * k), fatG: r1(food.fatG * k) };
}

export function sumLogs(logs: FoodLog[]): MacroTotals {
  const t: MacroTotals = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, hasEstimates: false, items: 0 };
  for (const l of logs) {
    const s = scale(l.food, l.servings);
    t.kcal += s.kcal;
    t.proteinG += s.proteinG;
    t.carbG += s.carbG;
    t.fatG += s.fatG;
    t.items += 1;
    if (!l.food.isVerified) t.hasEstimates = true;
  }
  return { ...t, kcal: r1(t.kcal), proteinG: r1(t.proteinG), carbG: r1(t.carbG), fatG: r1(t.fatG) };
}

export interface ProteinProgress {
  consumed: number;
  min: number;
  max: number;
  pctOfMin: number;
  remainingToMin: number;
  status: 'below' | 'inRange' | 'above';
}

export function proteinProgress(consumed: number, min: number, max: number): ProteinProgress {
  const pct = min > 0 ? Math.round((consumed / min) * 100) : 0;
  return {
    consumed: r1(consumed),
    min,
    max,
    pctOfMin: pct,
    remainingToMin: r1(Math.max(0, min - consumed)),
    status: consumed < min ? 'below' : consumed <= max ? 'inRange' : 'above',
  };
}

/** Gợi ý khoảng protein 1,6–2,0 g/kg, làm tròn lên/xuống bội số 5 g (Morton et al., 2018). */
export function suggestProteinRange(weightKg: number): { min: number; max: number } | null {
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) return null;
  const min = Math.ceil((weightKg * 1.6) / 5) * 5;
  const max = Math.max(min, Math.floor((weightKg * 2.0) / 5) * 5);
  return { min, max };
}

/** Năng lượng từ macro (4/4/9 kcal mỗi gam) — dùng để đối chiếu, không thay số calories người dùng nhập. */
export function kcalFromMacros(p: number, c: number, f: number): number {
  return r1(p * 4 + c * 4 + f * 9);
}
