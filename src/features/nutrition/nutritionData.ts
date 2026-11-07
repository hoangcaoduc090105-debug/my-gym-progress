import { createContext, useContext, useEffect, useState } from 'react';
import type { VnFood } from '../../data/vnFoods';
import type { Dish } from '../../data/southernDishes';
import type { VnPlan } from '../../data/vnMealPlans';
import { setCatalog } from './foodCatalog';

/** Dữ liệu ăn uống (thực phẩm Việt Nam, món ăn sẵn, thực đơn mẫu) — tải lười, chỉ khi mở trang Ăn uống. */
export interface NutritionData {
  vnFoods: VnFood[];
  dishes: Dish[];
  dishFoods: ReturnType<typeof import('../../data/southernDishes')['dishesAsFoods']>;
  plans: VnPlan[];
  plan: Pick<typeof import('../../data/vnMealPlans'), 'foodName' | 'itemMacro' | 'mealMacro' | 'planMacro'>;
  /** Thực phẩm + món ăn sẵn để cài vào "Món của tôi". */
  presetFoods: (VnFood | NutritionData['dishFoods'][number])[];
}

let cached: NutritionData | null = null;
let pending: Promise<NutritionData> | null = null;

export function loadNutritionData(): Promise<NutritionData> {
  if (cached) return Promise.resolve(cached);
  pending ??= Promise.all([import('../../data/vnFoods'), import('../../data/southernDishes'), import('../../data/vnMealPlans')]).then(([f, d, m]) => {
    setCatalog(d.SOUTHERN_DISHES, f.VN_FOODS);
    const dishFoods = d.dishesAsFoods();
    cached = {
      vnFoods: f.VN_FOODS,
      dishes: d.SOUTHERN_DISHES,
      dishFoods,
      plans: m.VN_PLANS,
      plan: { foodName: m.foodName, itemMacro: m.itemMacro, mealMacro: m.mealMacro, planMacro: m.planMacro },
      presetFoods: [...f.VN_FOODS, ...dishFoods],
    };
    return cached;
  });
  return pending;
}

export function useNutritionDataLoader(): NutritionData | null {
  const [d, setD] = useState<NutritionData | null>(cached);
  useEffect(() => {
    if (!d) void loadNutritionData().then(setD);
  }, [d]);
  return d;
}

export const NutritionDataContext = createContext<NutritionData | null>(null);

/** Dùng bên trong trang Ăn uống (sau khi dữ liệu đã tải). */
export function useNutritionData(): NutritionData {
  const d = useContext(NutritionDataContext);
  if (!d) throw new Error('useNutritionData ngoài NutritionDataContext');
  return d;
}
