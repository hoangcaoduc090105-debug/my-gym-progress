import type { VnFood } from './vnFoods';

/**
 * Nguyên liệu bổ sung CHỈ dùng để tính món ăn chế biến (không thêm vào danh sách "Món của tôi").
 * Giá trị trên 100 g phần ăn được, dạng sống — Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007).
 */
const FCT = (code: string) => `Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007), mã ${code}`;
const g = (id: string, name: string, code: string, kcal: number, proteinG: number, fatG: number, carbG: number): VnFood => ({
  id,
  name,
  fctCode: code,
  group: 'dam',
  servingLabel: '100 g',
  servingGrams: 100,
  kcal,
  proteinG,
  fatG,
  carbG,
  isVerified: true,
  source: FCT(code),
});

export const VN_INGREDIENTS: VnFood[] = [
  g('ing-7053', 'Sườn lợn (phần ăn được)', '7053', 187, 17.9, 12.8, 0),
  g('ing-7031', 'Bì lợn', '7031', 118, 23.3, 2.7, 0),
  g('ing-7018', 'Thịt lợn nửa nạc nửa mỡ', '7018', 260, 16.5, 21.5, 0),
  g('ing-7032', 'Chân giò lợn', '7032', 230, 15.7, 18.6, 0),
  g('ing-7041', 'Gan lợn', '7041', 116, 18.8, 3.6, 2.0),
  g('ing-7057', 'Tim lợn', '7057', 94, 15.1, 3.2, 1.2),
  g('ing-7047', 'Lòng lợn (ruột non)', '7047', 44, 7.2, 1.3, 0.8),
  g('ing-7034', 'Dạ dày lợn', '7034', 85, 14.6, 2.9, 0),
  g('ing-7059', 'Tiết lợn luộc', '7059', 44, 10.7, 0.1, 0),
  g('ing-7071', 'Lạp xường', '7071', 585, 20.8, 55.0, 1.7),
  g('ing-7074', 'Ruốc thịt lợn', '7074', 369, 46.6, 20.3, 0),
  g('ing-7004', 'Thịt bò loại II', '7004', 167, 18.0, 10.5, 0),
  g('ing-8022', 'Cá quả (cá lóc)', '8022', 97, 18.2, 2.7, 0),
  g('ing-8051', 'Tôm biển', '8051', 82, 17.6, 0.9, 0.9),
  g('ing-1002', 'Gạo nếp (cân sống)', '1002', 346, 8.4, 1.6, 74.9),
  g('ing-1010', 'Bánh tráng (bánh đa nem)', '1010', 333, 4.0, 0.2, 78.9),
  g('ing-1022', 'Mì sợi', '1022', 349, 11.0, 0.9, 74.2),
  g('ing-13017', 'Nước mắm pha sẵn', '13017', 35, 5.1, 0.01, 3.6),
  g('ing-12014', 'Đường kính', '12014', 397, 0, 0, 99.3),
  g('ing-10008', 'Sữa đặc có đường', '10008', 336, 8.1, 8.8, 56.0),
  g('ing-4021', 'Củ cải trắng', '4021', 21, 1.5, 0.1, 3.6),
  g('ing-4007', 'Cà rốt', '4007', 39, 1.5, 0.2, 7.8),
  g('ing-4038', 'Hành lá', '4038', 22, 1.3, 0, 4.3),
  g('ing-4094', 'Rau thơm', '4094', 18, 2.0, 0, 2.4),
  g('ing-14006', 'Nước dừa tươi', '14006', 21, 0.4, 0, 4.8),
];
