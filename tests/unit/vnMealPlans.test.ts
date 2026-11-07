import { VN_FOODS } from '../../src/data/vnFoods';
import { dishesAsFoods } from '../../src/data/southernDishes';
import { VN_PLANS, mealMacro, planMacro } from '../../src/data/vnMealPlans';
import { kcalFromMacros } from '../../src/domain/nutrition';

describe('Thực đơn Việt Nam mẫu', () => {
  it('mọi thực phẩm có nguồn, id không trùng, macro hợp lý với năng lượng', () => {
    const ids = new Set<string>();
    for (const f of VN_FOODS) {
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);
      expect(f.source).toBeTruthy();
      // Năng lượng ghi trong bảng xấp xỉ 4/4/9 kcal/g (sai lệch do hệ số Atwater riêng, chất xơ…)
      const calc = kcalFromMacros(f.proteinG, f.carbG, f.fatG);
      expect(Math.abs(calc - f.kcal) / Math.max(f.kcal, 1), f.name).toBeLessThan(0.2);
    }
  });

  it.each(VN_PLANS.map((p) => [p.name, p] as const))('%s: đủ 4 bữa, mỗi bữa ≥ 26 g đạm, cả ngày 105–130 g', (_n, p) => {
    expect(p.meals.map((m) => m.meal).sort()).toEqual(['breakfast', 'dinner', 'lunch', 'snack']);
    for (const m of p.meals) expect(mealMacro(m).proteinG, m.title).toBeGreaterThanOrEqual(26);
    const t = planMacro(p);
    expect(t.proteinG).toBeGreaterThanOrEqual(105);
    expect(t.proteinG).toBeLessThanOrEqual(130);
    const known = [...VN_FOODS, ...dishesAsFoods()];
    for (const m of p.meals) for (const it of m.items) expect(known.some((f) => f.id === it.foodId), it.foodId).toBe(true);
  });
});
