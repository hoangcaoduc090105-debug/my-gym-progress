import type { Food } from '../../src/db/types';
import { dishesAsFoods } from '../../src/data/southernDishes';
import { VN_FOODS } from '../../src/data/vnFoods';
import { DISH_ORDER, MEAL_DISH_CATS, customFoods, groupDishes, groupIngredients, kindOf, recentFoods, searchFoods } from '../../src/features/nutrition/foodCatalog';

const asFood = (x: { id: string; name: string; servingLabel: string; kcal: number; proteinG: number; carbG: number; fatG: number; isVerified: boolean }): Food => ({
  ...x,
  servingGrams: null,
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
});
const all: Food[] = [...VN_FOODS.map(asFood), ...dishesAsFoods().map(asFood), asFood({ id: 'food_x', name: 'Whey protein', servingLabel: '1 muỗng', kcal: 120, proteinG: 24, carbG: 3, fatG: 1, isVerified: false })];

describe('foodCatalog', () => {
  it('phân loại món ăn sẵn / nguyên liệu / tự tạo', () => {
    expect(kindOf({ id: 'dish-com-tam-suon' })).toBe('dish');
    expect(kindOf({ id: 'vn-9001' })).toBe('ingredient');
    expect(kindOf({ id: 'food_x' })).toBe('custom');
  });
  it('món ăn sẵn nhóm theo thứ tự cố định, mỗi món đúng 1 nhóm, trong nhóm con xếp theo tên', () => {
    const g = groupDishes(all);
    expect(g.map((x) => x.key)).toEqual(DISH_ORDER);
    expect(g.reduce((n, x) => n + x.foods.length, 0)).toBe(dishesAsFoods().length);
    const com = g[0]!.foods.map((f) => f.name);
    for (const sub of g[0]!.subs!) {
      const names = sub.foods.map((f) => f.name);
      expect([...names].sort((a, b) => a.localeCompare(b, 'vi'))).toEqual(names);
    }
    // các món cơm tấm nằm liền nhau
    const idx = com.map((n, i) => (n.startsWith('Cơm tấm') ? i : -1)).filter((i) => i >= 0);
    expect(idx[idx.length - 1]! - idx[0]!).toBe(idx.length - 1);
  });
  it('nhóm con: cơm tấm trước, rồi cơm nhà, cơm dĩa; bún/phở/hủ tiếu tách riêng', () => {
    const g = groupDishes(all);
    expect(g[0]!.subs!.map((x) => x.label)).toEqual(['Cơm tấm', 'Cơm nhà (cơm + món mặn)', 'Cơm dĩa']);
    expect(g[0]!.subs![0]!.foods.every((f) => f.name.startsWith('Cơm tấm'))).toBe(true);
    const bp = g.find((x) => x.key === 'bun-pho')!;
    expect(bp.subs!.map((x) => x.label)).toEqual(['Bún', 'Phở', 'Hủ tiếu', 'Mì · bánh canh', 'Cháo · súp']);
    expect(bp.subs!.find((x) => x.label === 'Phở')!.foods.every((f) => f.name.startsWith('Phở'))).toBe(true);
    const tm = g.find((x) => x.key === 'trang-mieng')!;
    expect(tm.subs![0]!.foods.every((f) => /^(Chè|Sữa chua)/.test(f.name))).toBe(true);
  });
  it('nguyên liệu nhóm theo loại, bắt đầu bằng nhóm đạm', () => {
    const g = groupIngredients(all);
    expect(g[0]!.key).toBe('dam');
    expect(g.reduce((n, x) => n + x.foods.length, 0)).toBe(VN_FOODS.length);
  });
  it('gợi ý theo bữa: sáng có bánh mì, trưa có cơm, phụ có trái cây', () => {
    expect(groupDishes(all, MEAL_DISH_CATS.breakfast)[0]!.foods.some((f) => f.name.startsWith('Bánh mì'))).toBe(true);
    expect(groupDishes(all, MEAL_DISH_CATS.lunch)[0]!.key).toBe('com');
    expect(groupDishes(all, MEAL_DISH_CATS.snack)[0]!.key).toBe('trang-mieng');
  });
  it('tìm kiếm không dấu, ưu tiên tên bắt đầu bằng từ khóa', () => {
    const r = searchFoods(all, 'com tam');
    expect(r.length).toBeGreaterThanOrEqual(5);
    expect(r.every((f) => f.name.startsWith('Cơm tấm'))).toBe(true);
    expect(searchFoods(all, 'hu tieu')[0]!.name.startsWith('Hủ tiếu')).toBe(true);
    expect(searchFoods(all, '')).toEqual([]);
  });
  it('món tự tạo tách riêng', () => {
    expect(customFoods(all).map((f) => f.id)).toEqual(['food_x']);
  });
  it('gần đây: mới nhất trước, không trùng, bỏ món đã xóa', () => {
    const r = recentFoods(
      [
        { foodId: 'vn-9001', createdAt: '2026-11-01' },
        { foodId: 'dish-pho-bo', createdAt: '2026-11-03' },
        { foodId: 'vn-9001', createdAt: '2026-11-04' },
        { foodId: 'gone', createdAt: '2026-11-05' },
      ],
      all,
    );
    expect(r.map((f) => f.id)).toEqual(['vn-9001', 'dish-pho-bo']);
  });
});
