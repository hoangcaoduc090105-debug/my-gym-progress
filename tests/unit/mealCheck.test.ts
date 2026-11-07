import { checkMeal, proteinPerMeal, suggestProteinFill } from '../../src/domain/mealCheck';
import type { MacroTotals } from '../../src/domain/nutrition';

const T = (p: number, kcal: number, items = 1, est = false): MacroTotals => ({ proteinG: p, kcal, carbG: 0, fatG: 0, items, hasEstimates: est });

describe('mealCheck', () => {
  it('protein mỗi bữa = tối thiểu ngày ÷ số bữa', () => {
    expect(proteinPerMeal(105, 4)).toBe(26);
    expect(proteinPerMeal(105, 0)).toBe(26);
    expect(proteinPerMeal(120, 3)).toBe(40);
  });
  it('bữa trống', () => {
    expect(checkMeal({ meal: T(0, 0, 0), dayTotals: T(0, 0, 0), proteinTarget: 26, dailyKcalTarget: null }).verdict).toBe('empty');
  });
  it('đủ / hơi thiếu / thiếu đạm', () => {
    const c = (p: number) => checkMeal({ meal: T(p, 500), dayTotals: T(p, 500), proteinTarget: 26, dailyKcalTarget: null }).verdict;
    expect(c(30)).toBe('good');
    expect(c(18)).toBe('low-protein');
    expect(c(10)).toBe('very-low-protein');
  });
  it('không có mục tiêu calories thì không đánh giá calories', () => {
    const r = checkMeal({ meal: T(30, 900), dayTotals: T(30, 4000), proteinTarget: 26, dailyKcalTarget: null });
    expect(r.kcalPctOfDay).toBeNull();
    expect(r.verdict).toBe('good');
  });
  it('vượt calories ngày khi có mục tiêu', () => {
    const r = checkMeal({ meal: T(30, 900), dayTotals: T(100, 2700), proteinTarget: 26, dailyKcalTarget: 2500 });
    expect(r.verdict).toBe('over-kcal');
    expect(r.kcalPctOfDay).toBe(36);
  });
  it('đánh dấu có số liệu ước tính', () => {
    expect(checkMeal({ meal: T(30, 500, 1, true), dayTotals: T(30, 500), proteinTarget: 26, dailyKcalTarget: null }).hasEstimates).toBe(true);
  });
  it('gợi ý món bù đạm, ưu tiên món thường dùng, làm tròn 0,5 phần', () => {
    const s = suggestProteinFill(10, [
      { id: 'a', name: 'Ức gà', proteinG: 31, servingLabel: '100 g', isFavorite: false },
      { id: 'b', name: 'Trứng', proteinG: 6.3, servingLabel: '1 quả', isFavorite: true },
      { id: 'c', name: 'Chuối', proteinG: 1.3, servingLabel: '1 quả', isFavorite: true },
    ]);
    expect(s[0]).toMatchObject({ foodId: 'b', servings: 2 });
    expect(s[1]).toMatchObject({ foodId: 'a', servings: 0.5 });
    expect(suggestProteinFill(0, [])).toEqual([]);
    // cần 3 phần yến mạch (6,8 g/phần) cho 20 g → không gợi ý
    expect(suggestProteinFill(20, [{ id: 'o', name: 'Yến mạch', proteinG: 6.8, servingLabel: '40 g', isFavorite: true }])).toEqual([]);
  });
});
