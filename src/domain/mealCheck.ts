import type { MacroTotals } from './nutrition';

/**
 * Chấm điểm một bữa ăn bằng quy tắc (không AI):
 * - Protein mục tiêu mỗi bữa = protein tối thiểu/ngày ÷ số bữa/ngày.
 *   Với ~4 bữa/ngày, khoảng 0,4 g/kg/bữa giúp đạt tối đa tổng hợp cơ (Schoenfeld & Aragon, 2018).
 * - Calories chỉ được đánh giá khi người dùng TỰ đặt mục tiêu calories ngày.
 */
export type MealVerdict = 'empty' | 'good' | 'low-protein' | 'very-low-protein' | 'over-kcal';

export interface MealCheck {
  verdict: MealVerdict;
  proteinTarget: number;
  proteinPct: number;
  proteinGap: number;
  /** % calories của bữa so với mục tiêu ngày (null nếu chưa đặt mục tiêu). */
  kcalPctOfDay: number | null;
  dayKcalOver: boolean;
  hasEstimates: boolean;
  messages: string[];
}

export function proteinPerMeal(dailyMinG: number, mealsPerDay: number): number {
  const n = Number.isFinite(mealsPerDay) && mealsPerDay >= 1 ? Math.round(mealsPerDay) : 4;
  return Math.round(dailyMinG / n);
}

export function checkMeal(params: {
  meal: MacroTotals;
  dayTotals: MacroTotals;
  proteinTarget: number;
  dailyKcalTarget: number | null | undefined;
}): MealCheck {
  const { meal, dayTotals, proteinTarget, dailyKcalTarget } = params;
  const kcalTarget = dailyKcalTarget && dailyKcalTarget > 0 ? dailyKcalTarget : null;
  const proteinPct = proteinTarget > 0 ? Math.round((meal.proteinG / proteinTarget) * 100) : 0;
  const proteinGap = Math.max(0, Math.round((proteinTarget - meal.proteinG) * 10) / 10);
  const kcalPctOfDay = kcalTarget ? Math.round((meal.kcal / kcalTarget) * 100) : null;
  const dayKcalOver = kcalTarget ? dayTotals.kcal > kcalTarget : false;
  const messages: string[] = [];

  if (meal.items === 0) {
    return { verdict: 'empty', proteinTarget, proteinPct: 0, proteinGap: proteinTarget, kcalPctOfDay: null, dayKcalOver, hasEstimates: false, messages: ['Chưa ghi món nào.'] };
  }

  let verdict: MealVerdict;
  if (proteinPct >= 100) {
    verdict = 'good';
    messages.push(`Đủ đạm cho bữa này (${meal.proteinG} / ${proteinTarget} g).`);
  } else if (proteinPct >= 60) {
    verdict = 'low-protein';
    messages.push(`Hơi thiếu đạm: còn thiếu khoảng ${proteinGap} g.`);
  } else {
    verdict = 'very-low-protein';
    messages.push(`Thiếu đạm: mới đạt ${proteinPct}% mục tiêu bữa (thiếu khoảng ${proteinGap} g).`);
  }
  if (kcalTarget) {
    messages.push(`Bữa này bằng ${kcalPctOfDay}% mục tiêu calories ngày.`);
    if (dayKcalOver) {
      messages.push(`Tổng calories hôm nay đã vượt mục tiêu ${Math.round(dayTotals.kcal - kcalTarget)} kcal.`);
      if (verdict === 'good') verdict = 'over-kcal';
    }
  } else {
    messages.push('Chưa đặt mục tiêu calories nên chưa đánh giá calories (đặt trong Cài đặt nếu muốn).');
  }
  if (meal.hasEstimates) messages.push('Có món dùng số liệu ước tính — kết quả chỉ mang tính tham khảo.');
  return { verdict, proteinTarget, proteinPct, proteinGap, kcalPctOfDay, dayKcalOver, hasEstimates: meal.hasEstimates, messages };
}

const MAX_SERVINGS = 2;

export interface FillSuggestion {
  foodId: string;
  name: string;
  servings: number;
  servingLabel: string;
  proteinG: number;
}

/** Gợi ý món giàu đạm (ưu tiên món thường dùng) để bù phần đạm còn thiếu; chỉ gợi ý món cần ≤ 2 phần cho thực tế. */
export function suggestProteinFill(
  gapG: number,
  foods: { id: string; name: string; proteinG: number; servingLabel: string; isFavorite: boolean }[],
  limit = 2,
): FillSuggestion[] {
  if (gapG <= 0) return [];
  return foods
    .filter((f) => f.proteinG >= 5)
    .map((f) => ({ f, servings: Math.max(0.5, Math.ceil((gapG / f.proteinG) * 2) / 2) }))
    .filter((x) => x.servings <= MAX_SERVINGS)
    .sort((a, b) => Number(b.f.isFavorite) - Number(a.f.isFavorite) || b.f.proteinG - a.f.proteinG)
    .slice(0, limit)
    .map(({ f, servings }) => ({ foodId: f.id, name: f.name, servings, servingLabel: f.servingLabel, proteinG: Math.round(f.proteinG * servings * 10) / 10 }));
}
