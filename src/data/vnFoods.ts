import type { FoodInput } from '../db/repo';

/**
 * Thực phẩm Việt Nam — giá trị trên 100 g PHẦN ĂN ĐƯỢC, dạng SỐNG, đọc trực tiếp từ:
 * Viện Dinh dưỡng. (2007). Bảng thành phần thực phẩm Việt Nam. Nhà xuất bản Y học. (bản PDF lưu tại FAO INFOODS)
 * Hai món không có trong bảng (ức gà, cơm chín) lấy từ USDA FoodData Central và ghi rõ nguồn.
 */
export interface VnFood extends Omit<FoodInput, 'isFavorite' | 'id'> {
  id: string;
  /** Mã số trong Bảng thành phần thực phẩm Việt Nam 2007 (null nếu nguồn khác). */
  fctCode: string | null;
  group: 'tinh-bot' | 'dam' | 'rau' | 'qua' | 'sua' | 'dau-mo';
}

const FCT = (code: string) => `Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007), mã ${code} — 100 g phần ăn được, sống`;
const USDA = 'USDA FoodData Central (SR Legacy) — 100 g đã nấu chín';

const f = (id: string, name: string, fctCode: string | null, group: VnFood['group'], kcal: number, proteinG: number, fatG: number, carbG: number): VnFood => ({
  id,
  name,
  fctCode,
  group,
  servingLabel: '100 g',
  servingGrams: 100,
  kcal,
  proteinG,
  fatG,
  carbG,
  isVerified: true,
  source: fctCode ? FCT(fctCode) : USDA,
});

export const VN_FOODS: VnFood[] = [
  // Tinh bột
  f('vn-1012', 'Bánh mì', '1012', 'tinh-bot', 249, 7.9, 0.8, 52.6),
  f('vn-1013', 'Bánh phở', '1013', 'tinh-bot', 143, 3.2, 0.4, 31.7),
  f('vn-1020', 'Bún', '1020', 'tinh-bot', 110, 1.7, 0, 25.7),
  f('vn-1004', 'Gạo tẻ máy (cân sống)', '1004', 'tinh-bot', 344, 7.9, 1.0, 75.9),
  f('usda-com', 'Cơm trắng (chín)', null, 'tinh-bot', 130, 2.7, 0.3, 28.2),
  f('vn-2008', 'Khoai lang', '2008', 'tinh-bot', 119, 0.8, 0.2, 28.5),
  // Đạm
  f('vn-7003', 'Thịt bò loại I (sống)', '7003', 'dam', 118, 21.0, 3.8, 0),
  f('vn-7017', 'Thịt lợn nạc (sống)', '7017', 'dam', 139, 19.0, 7.0, 0),
  f('vn-7069', 'Giò lụa', '7069', 'dam', 136, 21.5, 5.5, 0),
  f('vn-7013', 'Thịt gà ta (sống, cả da)', '7013', 'dam', 199, 20.3, 13.1, 0),
  f('usda-ucga', 'Ức gà bỏ da (chín)', null, 'dam', 165, 31.0, 3.6, 0),
  f('vn-8024', 'Cá rô phi (sống)', '8024', 'dam', 100, 19.7, 2.3, 0),
  f('vn-8019', 'Cá ngừ (sống)', '8019', 'dam', 87, 21.0, 0.3, 0),
  f('vn-8026', 'Cá thu (sống)', '8026', 'dam', 166, 18.2, 10.3, 0),
  f('vn-8052', 'Tôm đồng (sống)', '8052', 'dam', 90, 18.4, 1.8, 0),
  f('vn-8040', 'Mực tươi', '8040', 'dam', 73, 16.3, 0.9, 0),
  f('vn-9001', 'Trứng gà', '9001', 'dam', 166, 14.8, 11.6, 0.5),
  f('vn-9004', 'Trứng vịt', '9004', 'dam', 184, 13.0, 14.2, 1.0),
  f('vn-3025', 'Đậu phụ', '3025', 'dam', 95, 10.9, 5.4, 0.7),
  f('vn-3017', 'Lạc hạt', '3017', 'dam', 573, 27.5, 44.5, 15.5),
  // Sữa
  f('vn-10001', 'Sữa bò tươi', '10001', 'sua', 74, 3.9, 4.4, 4.8),
  f('vn-10004', 'Sữa chua', '10004', 'sua', 61, 3.3, 3.7, 3.6),
  f('vn-3032', 'Sữa đậu nành', '3032', 'sua', 28, 3.1, 1.6, 0.4),
  // Rau
  f('vn-4083', 'Rau muống', '4083', 'rau', 25, 3.2, 0.4, 2.1),
  f('vn-4016', 'Cải xanh', '4016', 'rau', 16, 1.7, 0.2, 1.9),
  f('vn-4010', 'Bắp cải', '4010', 'rau', 29, 1.8, 0.1, 5.3),
  f('vn-4086', 'Rau ngót', '4086', 'rau', 35, 5.3, 0, 3.4),
  f('vn-4002', 'Bí xanh (bí đao)', '4002', 'rau', 12, 0.6, 0, 2.4),
  f('vn-4005', 'Cà chua', '4005', 'rau', 20, 0.6, 0.2, 4.0),
  f('vn-4036', 'Giá đỗ xanh', '4036', 'rau', 44, 5.5, 0.2, 5.1),
  f('vn-4027', 'Dưa chuột', '4027', 'rau', 16, 0.8, 0.1, 2.9),
  // Quả
  f('vn-5007', 'Chuối tiêu', '5007', 'qua', 97, 1.5, 0.2, 22.2),
  f('vn-5002', 'Cam', '5002', 'qua', 38, 0.9, 0.1, 8.3),
  f('vn-5017', 'Đu đủ chín', '5017', 'qua', 36, 1.0, 0.1, 7.6),
  f('vn-5055', 'Xoài chín', '5055', 'qua', 62, 0.6, 0.3, 14.1),
  // Dầu mỡ
  f('vn-6002', 'Dầu ăn (dầu thực vật)', '6002', 'dau-mo', 897, 0, 99.7, 0),
];
