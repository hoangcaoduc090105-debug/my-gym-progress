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
  category: 'com' | 'bun-pho' | 'banh-mi' | 'an-vat' | 'trang-mieng' | 'do-uong';
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

  // ===================== MỞ RỘNG =====================
  // ---------- CƠM (250 g cơm/phần, trừ khi ghi khác) ----------
  { id: 'dish-com-tam-bi-cha', name: 'Cơm tấm bì chả', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('ing-7031', 40), r('vn-9001', 30), r('vn-7017', 40), r('vn-6002', 8), ...NUOC_MAM, ...DO_CHUA] },
  { id: 'dish-com-tam-ga-nuong', name: 'Cơm tấm gà nướng', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('vn-7013', 120), r('vn-6002', 8), r('ing-4038', 5), ...NUOC_MAM, ...DO_CHUA] },
  { id: 'dish-com-suon-ram', name: 'Cơm sườn non ram mặn', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-7053', 120), r('ing-13017', 15), r('ing-12014', 8), r('vn-6002', 8), r('vn-4027', 30)] },
  { id: 'dish-com-bo-luc-lac', name: 'Cơm bò lúc lắc', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('vn-7003', 120), r('ing-4039', 30), r('vn-4005', 30), r('vn-4010', 30), r('vn-6002', 12)] },
  { id: 'dish-com-ga-kho-gung', name: 'Cơm + gà kho gừng + rau luộc', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('vn-7013', 120), r('ing-13017', 15), r('ing-12014', 8), r('vn-6002', 5), r('vn-4016', 100)] },
  { id: 'dish-com-ca-thu-sot-ca', name: 'Cơm + cá thu chiên sốt cà + canh mướp', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('vn-8026', 120), r('vn-6002', 12), r('vn-4005', 50), r('ing-4054', 100)] },
  { id: 'dish-com-trung-chien', name: 'Cơm trứng chiên (2 trứng)', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('vn-9001', 100), r('vn-6002', 10), r('ing-4038', 5), r('vn-4027', 30), r('ing-13017', 15)] },
  { id: 'dish-com-dau-hu-don-thit', name: 'Cơm + đậu hũ dồn thịt sốt cà', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-3027', 120), r('vn-7017', 40), r('vn-4005', 60), r('vn-6002', 8)] },
  { id: 'dish-com-muc-xao', name: 'Cơm + mực xào thơm', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('vn-8040', 120), r('ing-4039', 30), r('ing-5015', 30), r('vn-6002', 10)] },
  { id: 'dish-com-tom-rim', name: 'Cơm + tôm rim + canh bí', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-8051', 100), r('ing-13017', 15), r('ing-12014', 8), r('vn-6002', 8), r('vn-4002', 150)] },
  { id: 'dish-com-kho-qua-don-thit', name: 'Cơm + canh khổ qua dồn thịt', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-4055', 120), r('vn-7017', 70), r('ing-4038', 5)] },
  { id: 'dish-com-vit-kho', name: 'Cơm + vịt kho gừng', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-7028', 120), r('ing-13017', 15), r('ing-12014', 8), r('vn-4027', 30)] },
  { id: 'dish-com-luon-xao', name: 'Cơm + lươn xào sả ớt', portion: '1 phần', category: 'com', recipe: [r('usda-com', 250), r('ing-8038', 100), r('vn-6002', 10), r('ing-4039', 20)] },
  { id: 'dish-com-chay', name: 'Cơm chay (đậu hũ + rau xào)', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('ing-3027', 100), r('vn-4016', 100), r('vn-4010', 50), r('vn-6002', 12)] },
  { id: 'dish-com-chien-trung', name: 'Cơm chiên trứng', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('vn-9001', 50), r('ing-4038', 10), r('vn-6002', 15)] },
  { id: 'dish-com-ga-xe-phay', name: 'Cơm gà xé phay (gà luộc)', portion: '1 dĩa', category: 'com', recipe: [r('usda-com', 250), r('vn-7013', 100), r('ing-4039', 30), r('ing-4088', 5), r('ing-13017', 20), r('ing-12014', 5)] },
  // ---------- BÚN · PHỞ · HỦ TIẾU · MÌ · CHÁO (không tính nước dùng) ----------
  { id: 'dish-bun-rieu-cua', name: 'Bún riêu cua', portion: '1 tô', category: 'bun-pho', note: 'Riêu tính theo cua đồng (phần ăn được) + trứng. Không tính nước dùng.', recipe: [r('vn-1020', 200), r('ing-8034', 60), r('vn-9001', 20), r('ing-3027', 40), r('vn-4005', 60), r('ing-7059', 30), r('vn-6002', 5), r('ing-4094', 20), r('ing-13012', 10)] },
  { id: 'dish-bun-mam', name: 'Bún mắm', portion: '1 tô', category: 'bun-pho', note: 'Mắm cá linh/cá sặc chưa có trong bảng — tạm tính bằng mắm tôm loãng. Không tính nước dùng.', recipe: [r('vn-1020', 200), r('ing-8051', 40), r('vn-8040', 40), r('ing-7018', 50), r('ing-4009', 40), r('ing-13012', 20), r('vn-6002', 5), r('ing-4043', 30)] },
  { id: 'dish-bun-moc', name: 'Bún mọc', portion: '1 tô', category: 'bun-pho', note: 'Mọc tính bằng thịt lợn nạc; không tính nước dùng.', recipe: [r('vn-1020', 200), r('vn-7017', 60), r('vn-7069', 30), r('ing-7032', 40), r('ing-4038', 5)] },
  { id: 'dish-bun-cha', name: 'Bún chả', portion: '1 phần', category: 'bun-pho', recipe: [r('vn-1020', 200), r('ing-7018', 120), r('ing-13017', 40), r('ing-12014', 10), r('ing-4094', 30), r('ing-4033', 30)] },
  { id: 'dish-bun-ca', name: 'Bún cá', portion: '1 tô', category: 'bun-pho', note: 'Không tính nước dùng.', recipe: [r('vn-1020', 200), r('ing-8022', 100), r('vn-6002', 8), r('vn-4005', 40), r('ing-4094', 20)] },
  { id: 'dish-bun-dau-mam-tom', name: 'Bún đậu mắm tôm', portion: '1 mẹt', category: 'bun-pho', recipe: [r('vn-1020', 150), r('ing-3027', 150), r('ing-7018', 60), r('ing-13012', 20), r('vn-6002', 10), r('ing-4094', 20), r('vn-4027', 30)] },
  { id: 'dish-bun-bo-xao', name: 'Bún bò xào (bún bò Nam Bộ)', portion: '1 tô', category: 'bun-pho', recipe: [r('vn-1020', 200), r('vn-7003', 90), r('vn-3017', 10), r('vn-6002', 10), r('ing-13017', 30), r('ing-12014', 6), r('ing-4094', 30), r('vn-4036', 30)] },
  { id: 'dish-hu-tieu-mi', name: 'Hủ tiếu mì', portion: '1 tô', category: 'bun-pho', note: 'Sợi hủ tiếu tính theo bánh phở; mì tính theo mì sợi khô. Không tính nước dùng.', recipe: [r('vn-1013', 120), r('ing-1022', 30), r('vn-7017', 50), r('ing-8051', 20), r('ing-7041', 15), r('ing-4042', 10)] },
  { id: 'dish-hu-tieu-bo-kho', name: 'Hủ tiếu bò kho', portion: '1 tô', category: 'bun-pho', recipe: [r('vn-1013', 200), r('ing-7004', 100), r('ing-4007', 40), r('vn-6002', 8), r('ing-12014', 5)] },
  { id: 'dish-hu-tieu-xao', name: 'Hủ tiếu xào', portion: '1 dĩa', category: 'bun-pho', recipe: [r('vn-1013', 250), r('vn-7017', 60), r('ing-8051', 30), r('vn-4016', 80), r('vn-6002', 15)] },
  { id: 'dish-mi-xao-bo', name: 'Mì xào bò', portion: '1 dĩa', category: 'bun-pho', note: 'Mì tính theo khối lượng khô (~80 g).', recipe: [r('ing-1022', 80), r('vn-7003', 80), r('vn-4016', 80), r('vn-6002', 15)] },
  { id: 'dish-mi-quang', name: 'Mì Quảng', portion: '1 tô', category: 'bun-pho', note: 'Sợi mì Quảng tính theo bánh phở.', recipe: [r('vn-1013', 200), r('ing-8051', 40), r('vn-7017', 50), r('ing-9007', 20), r('vn-3017', 10), r('vn-6002', 8), r('ing-4094', 30)] },
  { id: 'dish-banh-canh-gio-heo', name: 'Bánh canh giò heo', portion: '1 tô', category: 'bun-pho', note: 'Sợi bánh canh tính theo bánh phở. Không tính nước dùng.', recipe: [r('vn-1013', 200), r('ing-7032', 100), r('ing-4038', 5)] },
  { id: 'dish-banh-canh-cua', name: 'Bánh canh cua', portion: '1 tô', category: 'bun-pho', note: 'Sợi bánh canh tính theo bánh phở; nước sệt tính thêm bột năng.', recipe: [r('vn-1013', 200), r('ing-8033', 50), r('ing-8051', 30), r('vn-7069', 30), r('ing-9007', 20), r('ing-2020', 10), r('vn-6002', 5)] },
  { id: 'dish-pho-ga', name: 'Phở gà', portion: '1 tô', category: 'bun-pho', note: 'Không tính nước dùng.', recipe: [r('vn-1013', 200), r('vn-7013', 80), r('ing-4038', 5), r('ing-4094', 10)] },
  { id: 'dish-pho-bo-nam-gau', name: 'Phở bò tái nạm gầu', portion: '1 tô', category: 'bun-pho', note: 'Nạm gầu tính theo thịt bò loại II. Không tính nước dùng.', recipe: [r('vn-1013', 200), r('vn-7003', 40), r('ing-7004', 60), r('vn-4036', 30), r('ing-4094', 10)] },
  { id: 'dish-chao-ga', name: 'Cháo gà', portion: '1 tô', category: 'bun-pho', note: 'Gạo tính theo khối lượng sống.', recipe: [r('vn-1004', 40), r('vn-7013', 80), r('ing-4038', 5)] },
  { id: 'dish-chao-ca-loc', name: 'Cháo cá lóc', portion: '1 tô', category: 'bun-pho', note: 'Gạo tính theo khối lượng sống.', recipe: [r('vn-1004', 40), r('ing-8022', 80), r('ing-4038', 5), r('vn-6002', 3)] },
  { id: 'dish-sup-cua', name: 'Súp cua', portion: '1 chén', category: 'bun-pho', recipe: [r('ing-8033', 30), r('vn-9001', 25), r('ing-2020', 10), r('ing-1007', 30), r('vn-7013', 30)] },
  // ---------- BÁNH MÌ · XÔI · BÁNH ----------
  { id: 'dish-banh-mi-thit-nguoi', name: 'Bánh mì thịt nguội (đặc biệt)', portion: '1 ổ', category: 'banh-mi', note: 'Pate tạm tính bằng gan lợn + bơ.', recipe: [r('vn-1012', 100), r('vn-7069', 30), r('ing-7065', 20), r('ing-7041', 15), r('ing-6001', 5), r('vn-4027', 20), r('ing-4021', 10), r('ing-4007', 10)] },
  { id: 'dish-banh-mi-xiu-mai', name: 'Bánh mì xíu mại', portion: '1 ổ', category: 'banh-mi', recipe: [r('vn-1012', 100), r('ing-7018', 80), r('vn-4005', 40), r('vn-6002', 5)] },
  { id: 'dish-banh-mi-thit-nuong', name: 'Bánh mì thịt nướng', portion: '1 ổ', category: 'banh-mi', recipe: [r('vn-1012', 100), r('ing-7018', 80), r('vn-6002', 5), r('ing-4021', 10), r('ing-4007', 10), r('vn-4027', 20)] },
  { id: 'dish-banh-mi-ga', name: 'Bánh mì gà xé', portion: '1 ổ', category: 'banh-mi', recipe: [r('vn-1012', 100), r('vn-7013', 70), r('vn-4027', 20), r('ing-4094', 5)] },
  { id: 'dish-banh-mi-chao', name: 'Bánh mì chảo', portion: '1 phần', category: 'banh-mi', note: 'Pate tạm tính bằng gan lợn.', recipe: [r('vn-1012', 60), r('vn-9001', 50), r('ing-7077', 30), r('ing-7041', 15), r('vn-6002', 10), r('ing-4039', 20)] },
  { id: 'dish-banh-bao', name: 'Bánh bao nhân thịt (1 cái lớn)', portion: '1 cái', category: 'banh-mi', note: 'Số liệu bánh bao nhân thịt có trong bảng (mã 1009); giả định 1 cái ~150 g, kèm 1 trứng cút.', recipe: [r('ing-1009', 150), r('ing-9007', 10)] },
  { id: 'dish-xoi-ga', name: 'Xôi gà', portion: '1 gói', category: 'banh-mi', recipe: [r('ing-1002', 100), r('vn-7013', 70), r('vn-6002', 8), r('ing-4038', 5)] },
  { id: 'dish-xoi-dau-xanh', name: 'Xôi đậu xanh', portion: '1 gói', category: 'banh-mi', recipe: [r('ing-1002', 100), r('ing-3010', 20), r('ing-3001', 10), r('ing-12014', 5)] },
  { id: 'dish-xoi-bap', name: 'Xôi bắp', portion: '1 gói', category: 'banh-mi', recipe: [r('ing-1023', 100), r('ing-1002', 50), r('ing-3001', 10), r('ing-12014', 10)] },
  { id: 'dish-banh-cuon', name: 'Bánh cuốn', portion: '1 dĩa', category: 'banh-mi', note: 'Vỏ bánh tính theo bánh phở.', recipe: [r('vn-1013', 250), r('vn-7017', 40), r('vn-7069', 30), r('vn-6002', 5), r('ing-13017', 40), r('ing-12014', 8)] },
  { id: 'dish-banh-xeo', name: 'Bánh xèo (1 cái lớn)', portion: '1 cái', category: 'banh-mi', note: 'Nước cốt dừa tạm tính bằng cùi dừa già.', recipe: [r('ing-1017', 50), r('ing-3001', 15), r('ing-8051', 40), r('ing-7018', 40), r('vn-4036', 40), r('vn-6002', 20), r('ing-4094', 40), r('ing-13017', 40), r('ing-12014', 8)] },
  { id: 'dish-banh-khot', name: 'Bánh khọt (5 cái)', portion: '5 cái', category: 'banh-mi', recipe: [r('ing-1017', 40), r('ing-8051', 40), r('ing-3001', 10), r('vn-6002', 15), r('ing-4094', 30), r('ing-13017', 30), r('ing-12014', 6)] },
  { id: 'dish-bot-chien', name: 'Bột chiên trứng', portion: '1 dĩa', category: 'banh-mi', note: 'Bột chiên tính theo bột gạo tẻ.', recipe: [r('ing-1017', 70), r('vn-9001', 50), r('vn-6002', 20), r('ing-4033', 30), r('ing-4038', 5)] },
  // ---------- ĂN VẶT · CUỐN · GỎI ----------
  { id: 'dish-banh-trang-tron', name: 'Bánh tráng trộn', portion: '1 bịch', category: 'an-vat', recipe: [r('ing-1010', 40), r('ing-9007', 20), r('ing-8053', 5), r('ing-7075', 10), r('ing-4088', 5), r('vn-6002', 8), r('vn-3017', 5)] },
  { id: 'dish-banh-trang-nuong', name: 'Bánh tráng nướng', portion: '1 cái', category: 'an-vat', recipe: [r('ing-1010', 25), r('ing-9007', 20), r('ing-8053', 3), r('ing-4038', 5), r('vn-6002', 5)] },
  { id: 'dish-bo-bia', name: 'Bò bía (2 cuốn)', portion: '2 cuốn', category: 'an-vat', recipe: [r('ing-1010', 20), r('ing-4023', 60), r('ing-7071', 15), r('vn-9001', 20), r('ing-8053', 5), r('vn-3017', 10)] },
  { id: 'dish-cha-gio', name: 'Chả giò (3 cuốn)', portion: '3 cuốn', category: 'an-vat', note: 'Giả định mỗi phần thấm ~15 g dầu khi chiên.', recipe: [r('ing-1010', 15), r('ing-7018', 60), r('ing-4023', 20), r('ing-4007', 10), r('vn-6002', 15)] },
  { id: 'dish-nem-nuong-cuon', name: 'Nem nướng cuốn (3 cuốn)', portion: '3 cuốn', category: 'an-vat', recipe: [r('ing-1010', 20), r('ing-7018', 80), r('vn-1020', 40), r('ing-4094', 40), r('vn-3017', 10), r('ing-12014', 5)] },
  { id: 'dish-goi-ga-bap-cai', name: 'Gỏi gà bắp cải', portion: '1 dĩa', category: 'an-vat', recipe: [r('vn-7013', 80), r('vn-4010', 100), r('ing-4039', 20), r('vn-3017', 10), r('ing-4088', 5), r('ing-13017', 20), r('ing-12014', 5)] },
  { id: 'dish-goi-du-du-kho-bo', name: 'Gỏi đu đủ khô bò', portion: '1 dĩa', category: 'an-vat', recipe: [r('ing-4033', 120), r('ing-7075', 20), r('vn-3017', 10), r('ing-4094', 10), r('ing-13017', 20), r('ing-12014', 8)] },
  { id: 'dish-trung-vit-lon', name: 'Trứng vịt lộn (1 quả)', portion: '1 quả', category: 'an-vat', note: 'Giả định ~60 g phần ăn được.', recipe: [r('ing-9010', 60), r('ing-4088', 5)] },
  { id: 'dish-nem-chua', name: 'Nem chua (5 cái)', portion: '5 cái', category: 'an-vat', recipe: [r('ing-7073', 100)] },
  { id: 'dish-bap-luoc', name: 'Bắp nếp luộc (1 trái)', portion: '1 trái', category: 'an-vat', note: 'Giả định ~150 g phần ăn được.', recipe: [r('ing-1023', 150)] },
  { id: 'dish-khoai-lang-luoc', name: 'Khoai lang luộc (1 củ)', portion: '1 củ', category: 'an-vat', note: 'Giả định ~200 g phần ăn được.', recipe: [r('vn-2008', 200)] },
  { id: 'dish-bap-xao', name: 'Bắp xào bơ tôm khô', portion: '1 hộp', category: 'an-vat', recipe: [r('ing-1007', 150), r('ing-6001', 10), r('ing-8053', 5), r('ing-4038', 5)] },
  // ---------- CHÈ · TRÁI CÂY ----------
  { id: 'dish-che-dau-xanh', name: 'Chè đậu xanh', portion: '1 ly', category: 'trang-mieng', note: 'Nước cốt dừa tạm tính bằng cùi dừa già.', recipe: [r('ing-3010', 40), r('ing-12014', 25), r('ing-3001', 10)] },
  { id: 'dish-che-dau-den', name: 'Chè đậu đen', portion: '1 ly', category: 'trang-mieng', recipe: [r('ing-3004', 40), r('ing-12014', 25), r('ing-3001', 10)] },
  { id: 'dish-che-bap', name: 'Chè bắp', portion: '1 ly', category: 'trang-mieng', recipe: [r('ing-1007', 60), r('ing-2020', 10), r('ing-12014', 25), r('ing-3001', 10)] },
  { id: 'dish-sua-chua', name: 'Sữa chua (1 hộp)', portion: '1 hộp 100 g', category: 'trang-mieng', recipe: [r('vn-10004', 100)] },
  { id: 'dish-dua-hau', name: 'Dưa hấu (1 dĩa)', portion: '1 dĩa ~200 g', category: 'trang-mieng', recipe: [r('ing-5011', 200)] },
  { id: 'dish-thanh-long', name: 'Thanh long (nửa trái)', portion: '~200 g', category: 'trang-mieng', recipe: [r('ing-5044', 200)] },
  { id: 'dish-xoai', name: 'Xoài chín (1 trái nhỏ)', portion: '~200 g', category: 'trang-mieng', recipe: [r('vn-5055', 200)] },
  { id: 'dish-du-du', name: 'Đu đủ chín (1 dĩa)', portion: '~200 g', category: 'trang-mieng', recipe: [r('vn-5017', 200)] },
  { id: 'dish-chuoi', name: 'Chuối (1 quả)', portion: '~100 g', category: 'trang-mieng', recipe: [r('vn-5007', 100)] },
  { id: 'dish-cam', name: 'Cam (1 trái)', portion: '~150 g', category: 'trang-mieng', recipe: [r('vn-5002', 150)] },
  { id: 'dish-buoi', name: 'Bưởi (1 dĩa múi)', portion: '~200 g', category: 'trang-mieng', recipe: [r('ing-5001', 200)] },
  { id: 'dish-nhan', name: 'Nhãn (1 nắm)', portion: '~100 g', category: 'trang-mieng', recipe: [r('ing-5035', 100)] },
  { id: 'dish-vai', name: 'Vải (1 nắm)', portion: '~100 g', category: 'trang-mieng', recipe: [r('ing-5052', 100)] },
  { id: 'dish-chom-chom', name: 'Chôm chôm (1 nắm)', portion: '~100 g', category: 'trang-mieng', recipe: [r('ing-5004', 100)] },
  { id: 'dish-mit', name: 'Mít (vài múi)', portion: '~100 g', category: 'trang-mieng', recipe: [r('ing-5030', 100)] },
  { id: 'dish-sau-rieng', name: 'Sầu riêng (vài múi)', portion: '~100 g', category: 'trang-mieng', recipe: [r('ing-5048', 100)] },
  { id: 'dish-hong-xiem', name: 'Sapôchê (2 trái)', portion: '~150 g', category: 'trang-mieng', recipe: [r('ing-5022', 150)] },
  { id: 'dish-mang-cau', name: 'Mãng cầu xiêm', portion: '~150 g', category: 'trang-mieng', recipe: [r('ing-5025', 150)] },
  { id: 'dish-nho', name: 'Nho (1 chùm nhỏ)', portion: '~150 g', category: 'trang-mieng', recipe: [r('ing-5037', 150)] },
  { id: 'dish-tao', name: 'Táo (1 trái)', portion: '~150 g', category: 'trang-mieng', recipe: [r('ing-5051', 150)] },
  { id: 'dish-dua-thom', name: 'Thơm / dứa (1 dĩa)', portion: '~150 g', category: 'trang-mieng', recipe: [r('ing-5015', 150)] },
  // ---------- ĐỒ UỐNG ----------
  { id: 'dish-bac-xiu', name: 'Bạc xỉu', portion: '1 ly', category: 'do-uong', recipe: [r('ing-10008', 30), r('vn-10001', 50)] },
  { id: 'dish-sinh-to-bo', name: 'Sinh tố bơ', portion: '1 ly', category: 'do-uong', recipe: [r('ing-5042', 150), r('ing-10008', 25), r('vn-10001', 50)] },
  { id: 'dish-nuoc-cam', name: 'Nước cam vắt', portion: '1 ly 250 ml', category: 'do-uong', note: 'Kèm ~10 g đường.', recipe: [r('ing-14005', 250), r('ing-12014', 10)] },
  { id: 'dish-nuoc-dua', name: 'Nước dừa tươi (1 trái)', portion: '~300 ml', category: 'do-uong', recipe: [r('ing-14006', 300)] },
  { id: 'dish-coca', name: 'Nước ngọt có ga (1 lon)', portion: '330 ml', category: 'do-uong', note: 'Theo số liệu Coca cola trong bảng.', recipe: [r('ing-14004', 330)] },
  { id: 'dish-sua-tuoi-hop', name: 'Sữa tươi (1 hộp 180 ml)', portion: '1 hộp', category: 'do-uong', recipe: [r('vn-10001', 180)] },
];

const ALL = new Map<string, VnFood>([...VN_FOODS, ...VN_INGREDIENTS].map((x) => [x.id, x]));
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
  'bun-pho': 'Bún · phở · hủ tiếu · mì · cháo',
  'banh-mi': 'Bánh mì · xôi · bánh',
  'an-vat': 'Ăn vặt · cuốn · gỏi',
  'trang-mieng': 'Chè · trái cây',
  'do-uong': 'Đồ uống',
};

/** Món ăn dạng "thực phẩm" để thêm vào app: 1 khẩu phần = 1 phần ăn, đánh dấu Ước tính. */
export function dishesAsFoods(): (Omit<VnFood, 'group' | 'fctCode'> & { id: string })[] {
  return SOUTHERN_DISHES.map((d) => {
    const m = dishMacro(d);
    return {
      id: d.id,
      name: d.name,
      servingLabel: d.category === 'do-uong' || d.portion.includes('~') ? d.portion : `${d.portion} (~${m.grams} g)`,
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
