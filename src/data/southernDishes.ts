import { VN_FOODS, type VnFood } from './vnFoods';
import { VN_INGREDIENTS } from './vnIngredients';

/**
 * Món ăn quen thuộc miền Nam — tính TỪ CÔNG THỨC nguyên liệu (gram phần ăn được, thịt cá tính theo khối lượng sống).
 * Giá trị nguyên liệu: Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007); cơm chín theo USDA FoodData Central.
 * Khẩu phần là GIẢ ĐỊNH cho 1 phần ăn ở quán bình dân; mỗi quán khác nhau nên luôn đánh dấu "Ước tính".
 * Không tính nước dùng (phở, hủ tiếu, bún) vì chưa có số liệu chính thống — năng lượng thực tế có thể cao hơn.
 */
export interface RecipeItem {
  foodId: string;
  grams: number;
}

export interface Dish {
  id: string;
  name: string;
  portion: string;
  category: 'com' | 'bun-pho' | 'banh-mi' | 'an-vat' | 'do-uong';
  note?: string;
  recipe: RecipeItem[];
}

const r = (foodId: string, grams: number): RecipeItem => ({ foodId, grams });
const NUOC_MAM = [r('ing-13017', 30), r('ing-12014', 6)];
const DO_CHUA = [r('ing-4021', 20), r('ing-4007', 10), r('vn-4027', 30)];

export const SOUTHERN_DISHES: Dish[] = [
  // ---------- CƠM ----------
  {
    id: 'dish-com-tam-suon',
    name: 'Cơm tấm sườn',
    portion: '1 dĩa',
    category: 'com',
    recipe: [r('usda-com', 250), r('ing-7053', 100), r('vn-6002', 8), r('ing-4038', 5), ...NUOC_MAM, ...DO_CHUA],
  },
  {
    id: 'dish-com-tam-suon-bi-cha',
    name: 'Cơm tấm sườn bì chả',
    portion: '1 dĩa',
    category: 'com',
    note: 'Chả trứng tính bằng trứng gà + thịt lợn nạc.',
    recipe: [r('usda-com', 250), r('ing-7053', 100), r('ing-7031', 30), r('vn-9001', 30), r('vn-7017', 30), r('vn-6002', 10), r('ing-4038', 5), ...NUOC_MAM, ...DO_CHUA],
  },
  {
    id: 'dish-com-tam-suon-op-la',
    name: 'Cơm tấm sườn ốp la',
    portion: '1 dĩa',
    category: 'com',
    recipe: [r('usda-com', 250), r('ing-7053', 100), r('vn-9001', 50), r('vn-6002', 12), r('ing-4038', 5), ...NUOC_MAM, ...DO_CHUA],
  },
  {
    id: 'dish-com-ga',
    name: 'Cơm gà xối mỡ',
    portion: '1 dĩa',
    category: 'com',
    note: 'Thịt gà ta cả da (phần ăn được).',
    recipe: [r('usda-com', 250), r('vn-7013', 120), r('vn-6002', 12), r('vn-4027', 30), ...NUOC_MAM],
  },
  {
    id: 'dish-com-chien-duong-chau',
    name: 'Cơm chiên Dương Châu',
    portion: '1 dĩa',
    category: 'com',
    recipe: [r('usda-com', 250), r('vn-9001', 50), r('ing-7071', 15), r('vn-8052', 30), r('ing-4007', 20), r('ing-4038', 10), r('vn-6002', 15)],
  },
  {
    id: 'dish-com-ca-kho-to',
    name: 'Cơm + cá lóc kho tộ + canh chua',
    portion: '1 phần',
    category: 'com',
    recipe: [r('usda-com', 250), r('ing-8022', 120), r('ing-13017', 15), r('ing-12014', 8), r('vn-6002', 5), r('vn-4005', 50), r('vn-4036', 30), r('ing-4094', 5)],
  },
  {
    id: 'dish-com-thit-kho-hot-vit',
    name: 'Cơm + thịt kho hột vịt',
    portion: '1 phần',
    category: 'com',
    note: '1 quả trứng vịt (~70 g phần ăn được), kho nước dừa.',
    recipe: [r('usda-com', 250), r('ing-7018', 100), r('vn-9004', 70), r('ing-14006', 100), r('ing-13017', 15), r('ing-12014', 8), r('vn-4027', 30)],
  },
  // ---------- BÚN, PHỞ, HỦ TIẾU, CHÁO ----------
  {
    id: 'dish-hu-tieu-nam-vang',
    name: 'Hủ tiếu Nam Vang',
    portion: '1 tô',
    category: 'bun-pho',
    note: 'Sợi hủ tiếu tươi tính theo số liệu bánh phở (mã 1013). Không tính nước dùng.',
    recipe: [r('vn-1013', 200), r('vn-7017', 50), r('vn-8052', 30), r('ing-7041', 20), r('ing-7057', 20), r('vn-4036', 30), r('ing-4038', 5), r('vn-6002', 5)],
  },
  {
    id: 'dish-pho-bo',
    name: 'Phở bò (quán)',
    portion: '1 tô',
    category: 'bun-pho',
    note: 'Không tính nước dùng.',
    recipe: [r('vn-1013', 200), r('vn-7003', 70), r('vn-4036', 30), r('ing-4094', 10), r('ing-4038', 5)],
  },
  {
    id: 'dish-bun-thit-nuong',
    name: 'Bún thịt nướng',
    portion: '1 tô',
    category: 'bun-pho',
    recipe: [r('vn-1020', 200), r('ing-7018', 100), r('vn-3017', 10), r('vn-6002', 5), r('ing-4038', 5), r('ing-13017', 40), r('ing-12014', 8), r('ing-4094', 20), r('vn-4027', 30), r('ing-4021', 15), r('ing-4007', 10)],
  },
  {
    id: 'dish-bun-bo-hue',
    name: 'Bún bò Huế',
    portion: '1 tô',
    category: 'bun-pho',
    note: 'Không tính nước dùng.',
    recipe: [r('vn-1020', 200), r('vn-7003', 60), r('ing-7032', 60), r('vn-7069', 20), r('ing-7059', 30), r('vn-6002', 5), r('ing-4094', 10), r('vn-4036', 20)],
  },
  {
    id: 'dish-chao-long',
    name: 'Cháo lòng',
    portion: '1 tô',
    category: 'bun-pho',
    note: 'Gạo tính theo khối lượng sống (~40 g gạo cho 1 tô).',
    recipe: [r('vn-1004', 40), r('ing-7047', 50), r('ing-7034', 30), r('ing-7057', 20), r('ing-7041', 20), r('ing-7059', 40), r('ing-4038', 5)],
  },
  // ---------- BÁNH MÌ, XÔI ----------
  {
    id: 'dish-banh-mi-op-la',
    name: 'Bánh mì ốp la (2 trứng)',
    portion: '1 ổ',
    category: 'banh-mi',
    recipe: [r('vn-1012', 100), r('vn-9001', 100), r('vn-6002', 8), r('vn-4027', 20)],
  },
  {
    id: 'dish-banh-mi-cha-lua',
    name: 'Bánh mì chả lụa',
    portion: '1 ổ',
    category: 'banh-mi',
    note: 'Chả lụa tính theo giò lụa (mã 7069); bơ quét bánh.',
    recipe: [r('vn-1012', 100), r('vn-7069', 50), r('ing-6001', 5), r('vn-4027', 20), r('ing-4021', 10), r('ing-4007', 10), r('ing-4094', 3)],
  },
  {
    id: 'dish-xoi-man',
    name: 'Xôi mặn',
    portion: '1 gói',
    category: 'banh-mi',
    note: 'Gạo nếp tính theo khối lượng sống (~100 g nếp cho 1 gói).',
    recipe: [r('ing-1002', 100), r('ing-7071', 15), r('ing-7074', 8), r('vn-9001', 25), r('vn-7017', 20), r('vn-6002', 8), r('ing-4038', 5)],
  },
  // ---------- ĂN VẶT, ĐỒ UỐNG ----------
  {
    id: 'dish-goi-cuon',
    name: 'Gỏi cuốn tôm thịt (2 cuốn)',
    portion: '2 cuốn',
    category: 'an-vat',
    note: 'Tính cả chén tương chấm (lạc + đường).',
    recipe: [r('ing-1010', 20), r('vn-1020', 40), r('ing-8051', 40), r('vn-7017', 30), r('ing-4094', 15), r('vn-3017', 10), r('ing-12014', 5)],
  },
  {
    id: 'dish-ca-phe-sua-da',
    name: 'Cà phê sữa đá',
    portion: '1 ly',
    category: 'do-uong',
    note: 'Chỉ tính sữa đặc (cà phê đen không đáng kể).',
    recipe: [r('ing-10008', 25)],
  },
  {
    id: 'dish-sua-dau-nanh',
    name: 'Sữa đậu nành (1 ly)',
    portion: '1 ly 250 ml',
    category: 'do-uong',
    note: 'Pha sẵn ngoài hàng thường có thêm đường (~10 g).',
    recipe: [r('vn-3032', 250), r('ing-12014', 10)],
  },
];

/** Bơ dùng cho bánh mì (mã 6001) — chỉ dùng trong công thức. */
const BUTTER: VnFood = {
  id: 'ing-6001',
  name: 'Bơ',
  fctCode: '6001',
  group: 'dau-mo',
  servingLabel: '100 g',
  servingGrams: 100,
  kcal: 756,
  proteinG: 0.5,
  fatG: 83.5,
  carbG: 0.5,
  isVerified: true,
  source: 'Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007), mã 6001',
};

const ALL = new Map<string, VnFood>([...VN_FOODS, ...VN_INGREDIENTS, BUTTER].map((x) => [x.id, x]));
export const ingredientById = (id: string): VnFood | undefined => ALL.get(id);

export interface DishMacro {
  grams: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function dishMacro(d: Dish): DishMacro {
  let grams = 0,
    kcal = 0,
    p = 0,
    c = 0,
    f = 0;
  for (const it of d.recipe) {
    const x = ALL.get(it.foodId);
    if (!x) throw new Error(`Thiếu nguyên liệu ${it.foodId} trong ${d.id}`);
    const k = it.grams / 100;
    grams += it.grams;
    kcal += x.kcal * k;
    p += x.proteinG * k;
    c += x.carbG * k;
    f += x.fatG * k;
  }
  return { grams: Math.round(grams), kcal: Math.round(kcal), proteinG: r1(p), carbG: r1(c), fatG: r1(f) };
}

export const DISH_CATEGORY_LABEL: Record<Dish['category'], string> = {
  com: 'Cơm',
  'bun-pho': 'Bún · phở · hủ tiếu · cháo',
  'banh-mi': 'Bánh mì · xôi',
  'an-vat': 'Ăn vặt',
  'do-uong': 'Đồ uống',
};

/** Món ăn dạng "thực phẩm" để thêm vào app: 1 khẩu phần = 1 phần ăn, đánh dấu Ước tính. */
export function dishesAsFoods(): (Omit<VnFood, 'group' | 'fctCode'> & { id: string })[] {
  return SOUTHERN_DISHES.map((d) => {
    const m = dishMacro(d);
    return {
      id: d.id,
      name: d.name,
      servingLabel: d.category === 'do-uong' ? d.portion : `${d.portion} (~${m.grams} g)`,
      servingGrams: m.grams,
      kcal: m.kcal,
      proteinG: m.proteinG,
      carbG: m.carbG,
      fatG: m.fatG,
      isVerified: false,
      source: 'Ước tính theo công thức nguyên liệu (Bảng thành phần thực phẩm Việt Nam, Viện Dinh dưỡng, 2007); khẩu phần giả định — xem docs/MON_AN_MIEN_NAM.md',
    };
  });
}
