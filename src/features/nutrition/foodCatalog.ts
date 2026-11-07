import type { Food, MealSlot } from '../../db/types';
import { DISH_CATEGORY_LABEL, type DishCategory } from '../../data/dishCategories';
import type { VnFood } from '../../data/vnFoods';
import { normalizeVi } from '../workout/ExercisePicker';

/** Phân loại & sắp xếp danh sách món để chọn nhanh khi ghi bữa ăn. */
export type FoodKind = 'dish' | 'ingredient' | 'custom';
type DishCat = DishCategory;
type IngGroup = VnFood['group'];

/**
 * Bảng phân loại món (id → nhóm). Dữ liệu món ăn được tải lười (useNutritionData) rồi nạp vào đây bằng setCatalog(),
 * để module này không kéo cả danh sách món vào chunk chính.
 */
const DISH_CAT = new Map<string, DishCat>();
const ING_GROUP = new Map<string, IngGroup>();
export function setCatalog(dishes: { id: string; category: DishCat }[], vnFoods: { id: string; group: IngGroup }[]): void {
  DISH_CAT.clear();
  ING_GROUP.clear();
  for (const d of dishes) DISH_CAT.set(d.id, d.category);
  for (const f of vnFoods) ING_GROUP.set(f.id, f.group);
}

/** Thứ tự nhóm món ăn sẵn: theo bữa chính → bữa nhẹ → tráng miệng → đồ uống. */
export const DISH_ORDER: DishCat[] = ['com', 'bun-pho', 'banh-mi', 'an-vat', 'trang-mieng', 'do-uong'];
export const ING_ORDER: IngGroup[] = ['dam', 'tinh-bot', 'sua', 'rau', 'qua', 'dau-mo'];
export const ING_LABEL: Record<IngGroup, string> = {
  dam: 'Thịt · cá · trứng · đậu',
  'tinh-bot': 'Cơm · bánh · tinh bột',
  sua: 'Sữa',
  rau: 'Rau củ',
  qua: 'Trái cây',
  'dau-mo': 'Dầu ăn',
};

/** Nhóm món phù hợp từng bữa (thói quen ăn uống phổ biến của người Việt). */
export const MEAL_DISH_CATS: Record<MealSlot, DishCat[]> = {
  breakfast: ['banh-mi', 'bun-pho', 'do-uong'],
  lunch: ['com', 'bun-pho'],
  dinner: ['com', 'bun-pho'],
  snack: ['trang-mieng', 'an-vat', 'do-uong'],
};

export function kindOf(f: Pick<Food, 'id'>): FoodKind {
  if (DISH_CAT.has(f.id)) return 'dish';
  if (ING_GROUP.has(f.id)) return 'ingredient';
  return 'custom';
}

export function groupLabelOf(f: Pick<Food, 'id'>): string {
  const c = DISH_CAT.get(f.id);
  if (c) return DISH_CATEGORY_LABEL[c];
  const g = ING_GROUP.get(f.id);
  if (g) return ING_LABEL[g];
  return 'Tự tạo';
}

export interface FoodSubGroup {
  label: string;
  foods: Food[];
}

export interface FoodGroup {
  key: string;
  label: string;
  /** Toàn bộ món của nhóm, theo thứ tự hiển thị (nhóm con nối tiếp nhau). */
  foods: Food[];
  subs?: FoodSubGroup[];
}

/** Nhóm con theo loại món (dựa vào tên), theo thứ tự hay gặp ở quán ăn. */
const SUB_RULES: Partial<Record<DishCat, { label: string; test: (n: string) => boolean }[]>> = {
  com: [
    { label: 'Cơm tấm', test: (n) => n.startsWith('com tam') },
    { label: 'Cơm nhà (cơm + món mặn)', test: (n) => n.startsWith('com +') },
    { label: 'Cơm dĩa', test: () => true },
  ],
  'bun-pho': [
    { label: 'Bún', test: (n) => n.startsWith('bun') },
    { label: 'Phở', test: (n) => n.startsWith('pho') },
    { label: 'Hủ tiếu', test: (n) => n.startsWith('hu tieu') },
    { label: 'Mì · bánh canh', test: (n) => n.startsWith('mi ') || n.startsWith('banh canh') },
    { label: 'Cháo · súp', test: () => true },
  ],
  'banh-mi': [
    { label: 'Bánh mì', test: (n) => n.startsWith('banh mi') },
    { label: 'Xôi', test: (n) => n.startsWith('xoi') },
    { label: 'Bánh', test: () => true },
  ],
  'an-vat': [
    { label: 'Cuốn · gỏi', test: (n) => /cuon|goi|bo bia|cha gio/.test(n) },
    { label: 'Bánh tráng', test: (n) => n.startsWith('banh trang') },
    { label: 'Món khác', test: () => true },
  ],
  'trang-mieng': [
    { label: 'Chè · sữa chua', test: (n) => n.startsWith('che') || n.startsWith('sua chua') },
    { label: 'Trái cây', test: () => true },
  ],
};

function splitSubs(cat: DishCat, foods: Food[]): FoodSubGroup[] | undefined {
  const rules = SUB_RULES[cat];
  if (!rules) return undefined;
  const subs = rules.map((r) => ({ label: r.label, foods: [] as Food[] }));
  for (const f of foods) {
    const n = normalizeVi(f.name);
    const i = rules.findIndex((r) => r.test(n));
    subs[i]!.foods.push(f);
  }
  return subs.filter((x) => x.foods.length > 0);
}

const byName = (a: Food, b: Food) => a.name.localeCompare(b.name, 'vi');

export function groupDishes(foods: Food[], cats: DishCat[] = DISH_ORDER): FoodGroup[] {
  return cats
    .map((c) => {
      const list = foods.filter((f) => DISH_CAT.get(f.id) === c).sort(byName);
      const subs = splitSubs(c, list);
      return { key: c, label: DISH_CATEGORY_LABEL[c], foods: subs ? subs.flatMap((x) => x.foods) : list, subs };
    })
    .filter((g) => g.foods.length > 0);
}

export function groupIngredients(foods: Food[]): FoodGroup[] {
  return ING_ORDER.map((g) => ({ key: g, label: ING_LABEL[g], foods: foods.filter((f) => ING_GROUP.get(f.id) === g).sort(byName) })).filter((g) => g.foods.length > 0);
}

export function customFoods(foods: Food[]): Food[] {
  return foods.filter((f) => kindOf(f) === 'custom').sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || byName(a, b));
}

/**
 * Tìm kiếm không dấu. Xếp hạng: tên bắt đầu bằng từ khóa → chứa từ khóa ở đầu một từ → chứa ở giữa;
 * cùng hạng thì ưu tiên món thường dùng, rồi theo tên.
 */
export function searchFoods(foods: Food[], q: string): Food[] {
  const nq = normalizeVi(q.trim());
  if (!nq) return [];
  const rank = (f: Food) => {
    const n = normalizeVi(f.name);
    if (n.startsWith(nq)) return 0;
    if (n.includes(` ${nq}`)) return 1;
    if (n.includes(nq)) return 2;
    return -1;
  };
  return foods
    .map((f) => ({ f, r: rank(f) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || Number(b.f.isFavorite) - Number(a.f.isFavorite) || byName(a.f, b.f))
    .map((x) => x.f);
}

/** Món ghi gần đây (mới nhất trước, không trùng), chỉ giữ món vẫn còn trong danh sách. */
export function recentFoods(logs: { foodId: string; createdAt: string }[], foods: Food[], limit = 6): Food[] {
  const map = new Map(foods.map((f) => [f.id, f]));
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const l of [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (seen.has(l.foodId)) continue;
    seen.add(l.foodId);
    const f = map.get(l.foodId);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}
