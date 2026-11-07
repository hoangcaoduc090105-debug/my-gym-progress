import type { MealSlot } from '../db/types';
import { VN_FOODS } from './vnFoods';

/**
 * Thực đơn mẫu kiểu Việt Nam cho người tập tăng cơ (khoảng 65 kg, 4 bữa/ngày).
 * Thiết kế: mỗi bữa ≥ 26 g đạm (≈ 0,4 g/kg/bữa — Schoenfeld & Aragon, 2018), tổng ngày 105–130 g.
 * Khối lượng tính theo gram PHẦN ĂN ĐƯỢC (thịt, cá cân sống; cơm cân chín). Không đặt mục tiêu calories.
 */
export interface VnPlanItem {
  foodId: string;
  grams: number;
}
export interface VnPlanMeal {
  meal: MealSlot;
  title: string;
  howTo: string;
  items: VnPlanItem[];
}
export interface VnPlan {
  id: string;
  name: string;
  note: string;
  meals: VnPlanMeal[];
}

const i = (foodId: string, grams: number): VnPlanItem => ({ foodId, grams });

export const VN_PLANS: VnPlan[] = [
  {
    id: 'vn-plan-a',
    name: 'Ngày tập A — Bánh mì trứng, cơm bò xào, cá rô kho',
    note: 'Ngày có buổi tập. Bữa phụ ăn sau tập khoảng 1 giờ.',
    meals: [
      {
        meal: 'breakfast',
        title: 'Bánh mì ốp la 2 trứng + 1 ly sữa tươi',
        howTo: '1 ổ bánh mì (~100 g), 2 quả trứng gà ốp với 1 thìa cà phê dầu; uống 1 ly sữa tươi 200 ml.',
        items: [i('vn-1012', 100), i('vn-9001', 100), i('vn-10001', 200), i('vn-6002', 5)],
      },
      {
        meal: 'lunch',
        title: 'Cơm + bò xào rau muống',
        howTo: '300 g cơm; 90 g thịt bò thái mỏng xào cùng 200 g rau muống với 2 thìa cà phê dầu.',
        items: [i('usda-com', 300), i('vn-7003', 90), i('vn-4083', 200), i('vn-6002', 10)],
      },
      {
        meal: 'snack',
        title: 'Bánh mì giò lụa + 1 quả chuối (sau tập)',
        howTo: 'Nửa ổ bánh mì (~60 g) kẹp 100 g giò lụa; 1 quả chuối tiêu.',
        items: [i('vn-1012', 60), i('vn-7069', 100), i('vn-5007', 100)],
      },
      {
        meal: 'dinner',
        title: 'Cơm + cá rô phi kho, cải luộc, canh bí',
        howTo: '250 g cơm; 140 g thịt cá rô phi (đã bỏ xương) kho; 150 g cải xanh luộc; canh 150 g bí xanh.',
        items: [i('usda-com', 250), i('vn-8024', 140), i('vn-4016', 150), i('vn-4002', 150), i('vn-6002', 7)],
      },
    ],
  },
  {
    id: 'vn-plan-b',
    name: 'Ngày tập B — Phở bò, cơm thịt rim, tôm rang',
    note: 'Ngày có buổi tập. Phở nấu ở nhà để biết chính xác lượng thịt và bánh.',
    meals: [
      {
        meal: 'breakfast',
        title: 'Phở bò tái (tự nấu)',
        howTo: '250 g bánh phở, 100 g thịt bò thái mỏng, 50 g giá, hành rau thơm, nước dùng.',
        items: [i('vn-1013', 250), i('vn-7003', 100), i('vn-4036', 50)],
      },
      {
        meal: 'lunch',
        title: 'Cơm + thịt lợn nạc rim cà chua, rau muống luộc',
        howTo: '300 g cơm; 115 g thịt lợn nạc rim với 50 g cà chua; 150 g rau muống luộc.',
        items: [i('usda-com', 300), i('vn-7017', 115), i('vn-4005', 50), i('vn-4083', 150), i('vn-6002', 10)],
      },
      {
        meal: 'snack',
        title: '2 quả trứng luộc + 1 ly sữa tươi + 1 quả chuối (sau tập)',
        howTo: '2 quả trứng gà luộc; 250 ml sữa tươi; 1 quả chuối tiêu.',
        items: [i('vn-9001', 100), i('vn-10001', 250), i('vn-5007', 100)],
      },
      {
        meal: 'dinner',
        title: 'Cơm + tôm rang, canh rau ngót, cải luộc',
        howTo: '250 g cơm; 120 g tôm đồng (phần ăn được) rang; canh 100 g rau ngót; 150 g cải xanh luộc.',
        items: [i('usda-com', 250), i('vn-8052', 120), i('vn-4086', 100), i('vn-4016', 150), i('vn-6002', 7)],
      },
    ],
  },
  {
    id: 'vn-plan-c',
    name: 'Ngày nghỉ — Bún thịt nướng, cơm gà đậu phụ, cá ngừ kho',
    note: 'Ngày không tập: vẫn giữ đủ đạm để cơ phục hồi.',
    meals: [
      {
        meal: 'breakfast',
        title: 'Bún thịt nướng (tự làm)',
        howTo: '250 g bún; 125 g thịt lợn nạc ướp nướng; 50 g cà chua, rau sống, nước chấm pha loãng.',
        items: [i('vn-1020', 250), i('vn-7017', 125), i('vn-4005', 50), i('vn-6002', 3)],
      },
      {
        meal: 'lunch',
        title: 'Cơm + ức gà luộc, đậu phụ sốt, canh bí',
        howTo: '250 g cơm; 60 g ức gà luộc xé; 90 g đậu phụ sốt; canh 150 g bí xanh.',
        items: [i('usda-com', 250), i('usda-ucga', 60), i('vn-3025', 90), i('vn-4002', 150), i('vn-6002', 7)],
      },
      {
        meal: 'snack',
        title: 'Bánh mì giò lụa + 1 ly sữa tươi',
        howTo: 'Nửa ổ bánh mì (~60 g) kẹp 70 g giò lụa; 200 ml sữa tươi.',
        items: [i('vn-1012', 60), i('vn-7069', 70), i('vn-10001', 200)],
      },
      {
        meal: 'dinner',
        title: 'Cơm + cá ngừ kho, rau muống luộc, tráng miệng cam',
        howTo: '250 g cơm; 115 g cá ngừ kho; 150 g rau muống luộc; 1 quả cam (~150 g phần ăn được).',
        items: [i('usda-com', 250), i('vn-8019', 115), i('vn-4083', 150), i('vn-5002', 150), i('vn-6002', 7)],
      },
    ],
  },
];

export interface Macro {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

const FOOD = new Map(VN_FOODS.map((x) => [x.id, x]));
const r1 = (n: number) => Math.round(n * 10) / 10;

export function itemMacro(it: VnPlanItem): Macro {
  const food = FOOD.get(it.foodId);
  if (!food) throw new Error(`Thiếu thực phẩm ${it.foodId}`);
  const k = it.grams / 100;
  return { kcal: food.kcal * k, proteinG: food.proteinG * k, carbG: food.carbG * k, fatG: food.fatG * k };
}

export function sumMacro(list: Macro[]): Macro {
  const t = list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, proteinG: a.proteinG + m.proteinG, carbG: a.carbG + m.carbG, fatG: a.fatG + m.fatG }), { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });
  return { kcal: Math.round(t.kcal), proteinG: r1(t.proteinG), carbG: r1(t.carbG), fatG: r1(t.fatG) };
}

export const mealMacro = (m: VnPlanMeal): Macro => sumMacro(m.items.map(itemMacro));
export const planMacro = (p: VnPlan): Macro => sumMacro(p.meals.flatMap((m) => m.items.map(itemMacro)));
export const foodName = (id: string): string => FOOD.get(id)?.name ?? id;
