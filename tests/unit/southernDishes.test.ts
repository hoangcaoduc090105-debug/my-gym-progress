import { SOUTHERN_DISHES, dishMacro, dishesAsFoods, ingredientById } from '../../src/data/southernDishes';
import { kcalFromMacros } from '../../src/domain/nutrition';

describe('Món ăn miền Nam (ước tính theo công thức)', () => {
  it('id không trùng, mọi nguyên liệu có nguồn', () => {
    const ids = new Set(SOUTHERN_DISHES.map((d) => d.id));
    expect(ids.size).toBe(SOUTHERN_DISHES.length);
    for (const d of SOUTHERN_DISHES)
      for (const it of d.recipe) {
        const x = ingredientById(it.foodId);
        expect(x, `${d.id} → ${it.foodId}`).toBeDefined();
        expect(x!.source).toBeTruthy();
        expect(it.grams).toBeGreaterThan(0);
      }
  });
  it.each(SOUTHERN_DISHES.map((d) => [d.name, d] as const))('%s: số liệu hợp lý và nhất quán', (_n, d) => {
    const m = dishMacro(d);
    expect(m.kcal).toBeGreaterThan(50);
    expect(m.kcal).toBeLessThan(1000);
    expect(Math.abs(kcalFromMacros(m.proteinG, m.carbG, m.fatG) - m.kcal) / m.kcal).toBeLessThan(0.15);
  });
  it('món ăn luôn đánh dấu Ước tính, có ghi khẩu phần', () => {
    for (const f of dishesAsFoods()) {
      expect(f.isVerified).toBe(false);
      if (!f.id.includes('ca-phe') && !f.id.includes('sua-dau-nanh')) expect(f.servingLabel).toMatch(/~\d+ g/);
    }
  });
  it('cơm tấm sườn: tính đúng từ công thức', () => {
    const m = dishMacro(SOUTHERN_DISHES.find((d) => d.id === 'dish-com-tam-suon')!);
    // 250 g cơm (6,75) + 100 g sườn (17,9) + 30 g nước mắm (1,53) + rau…
    expect(m.proteinG).toBeGreaterThan(26);
    expect(m.proteinG).toBeLessThan(28);
  });
});
