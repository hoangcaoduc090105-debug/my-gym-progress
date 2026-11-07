import type { VnFood } from './vnFoods';

/**
 * Nguyên liệu bổ sung CHỈ dùng để tính món ăn chế biến (không thêm vào danh sách "Món của tôi").
 * Giá trị trên 100 g phần ăn được, dạng sống — Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007).
 * File được sinh tự động từ dữ liệu trích của bảng gốc (scripts tạm trong quá trình phát triển) để tránh gõ nhầm.
 * Ô để trống ("-") trong bảng gốc được ghi là 0.
 */
const g = (code: string, name: string, kcal: number, proteinG: number, fatG: number, carbG: number): VnFood => ({
  id: `ing-${code}`,
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
  source: `Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007), mã ${code}`,
});

export const VN_INGREDIENTS: VnFood[] = [
  g('7053', 'Sườn lợn (phần ăn được)', 187, 17.9, 12.8, 0), // Sườn lợn
  g('7031', 'Bì lợn', 118, 23.3, 2.7, 0), // Bì lợn
  g('7018', 'Thịt lợn nửa nạc nửa mỡ', 260, 16.5, 21.5, 0), // Thịt lợn nửa nạc, nửa mỡ
  g('7032', 'Chân giò lợn', 230, 15.7, 18.6, 0), // Chân giò lợn
  g('7041', 'Gan lợn', 116, 18.8, 3.6, 2), // Gan lợn
  g('7057', 'Tim lợn', 94, 15.1, 3.2, 1.2), // Tim lợn
  g('7047', 'Lòng lợn (ruột non)', 44, 7.2, 1.3, 0.8), // Lòng lợn (ruột non)
  g('7034', 'Dạ dày lợn', 85, 14.6, 2.9, 0), // Dạ dày lợn
  g('7059', 'Tiết lợn luộc', 44, 10.7, 0.1, 0), // Tiết lợn luộc
  g('7071', 'Lạp xường', 585, 20.8, 55, 1.7), // Lạp xường
  g('7074', 'Ruốc thịt lợn', 369, 46.6, 20.3, 0), // Ruốc thịt lợn
  g('7004', 'Thịt bò loại II', 167, 18, 10.5, 0), // Thịt bò loại II
  g('7075', 'Thịt bò khô', 239, 51, 1.6, 5.2), // Thịt bò khô
  g('7028', 'Thịt vịt', 267, 17.8, 21.8, 0), // Thịt vịt
  g('7073', 'Nem chua', 137, 21.7, 3.7, 4.3), // Nem chua
  g('7065', 'Chả quế lợn', 416, 16.2, 39, 0), // Chả quế lợn
  g('7077', 'Xúc xích', 535, 27.2, 47.4, 0), // Xúc xích
  g('8022', 'Cá quả (cá lóc)', 97, 18.2, 2.7, 0), // Cá quả
  g('8051', 'Tôm biển', 82, 17.6, 0.9, 0.9), // Tôm biển
  g('8053', 'Tôm khô', 347, 75.6, 3.8, 2.5), // Tôm khô
  g('8039', 'Mực khô', 291, 60.1, 4.5, 2.5), // Mực khô
  g('8033', 'Cua bể', 103, 17.5, 0.6, 7), // Cua bể
  g('8034', 'Cua đồng', 87, 12.3, 3.3, 2), // Cua đồng
  g('8038', 'Lươn', 180, 18.4, 11.7, 0.2), // Lươn
  g('8037', 'Hến', 45, 4.5, 0.7, 5.1), // Hến
  g('8048', 'Sò', 78, 9.5, 2.3, 4.9), // Sò
  g('9007', 'Trứng chim cút', 154, 13.1, 11.1, 0.4), // Trứng chim cút
  g('9010', 'Trứng vịt lộn', 182, 13.6, 12.4, 4), // Trứng vịt lộn
  g('1002', 'Gạo nếp (cân sống)', 346, 8.4, 1.6, 74.9), // Gạo nếp máy (Loại thường)
  g('1010', 'Bánh tráng (bánh đa nem)', 333, 4, 0.2, 78.9), // Bánh đa nem
  g('1022', 'Mì sợi (khô)', 349, 11, 0.9, 74.2), // Mỳ sợi
  g('1017', 'Bột gạo tẻ', 359, 6.6, 0.4, 82.2), // Bột gạo tẻ
  g('1018', 'Bột mì', 346, 10.3, 1.1, 73.6), // Bột mì
  g('2020', 'Bột sắn (bột năng)', 333, 2.4, 0.5, 79.6), // Bột sắn
  g('1009', 'Bánh bao nhân thịt', 219, 6.1, 0.5, 47.5), // Bánh bao nhân thịt
  g('1007', 'Ngô bắp tươi', 196, 4.1, 2.3, 39.6), // Ngô bắp tươi
  g('1023', 'Ngô nếp luộc', 167, 3.9, 2.2, 32.9), // Ngô nếp luộc
  g('2014', 'Khoai tây', 93, 2, 0.1, 20.9), // Khoai tây
  g('3010', 'Đậu xanh (hạt)', 328, 23.4, 2.4, 53.1), // Đậu xanh (đậu tắt)
  g('3004', 'Đậu đen (hạt)', 325, 24.2, 1.7, 53.3), // Đậu đen (hạt)
  g('3001', 'Cùi dừa già', 368, 4.8, 36, 6.2), // Cùi dừa già
  g('3027', 'Đậu phụ rán', 114, 13.4, 6.4, 0.8), // Đậu phụ nướng
  g('13017', 'Nước mắm pha sẵn', 35, 5.1, 0.01, 3.6), // Nước mắm cá
  g('13012', 'Mắm tôm loãng', 44, 7, 0.8, 2.1), // Mắm tôm loãng
  g('12014', 'Đường kính', 397, 0, 0, 99.3), // Đường kính
  g('12026', 'Mật ong', 327, 0.4, 0, 81.3), // Mật ong
  g('10008', 'Sữa đặc có đường', 336, 8.1, 8.8, 56), // Sữa đặc có đường Việt Nam
  g('6001', 'Bơ', 756, 0.5, 83.5, 0.5), // Bơ
  g('4021', 'Củ cải trắng', 21, 1.5, 0.1, 3.6), // Củ cải trắng
  g('4007', 'Cà rốt', 39, 1.5, 0.2, 7.8), // Cà rốt (củ đỏ, vàng)
  g('4038', 'Hành lá', 22, 1.3, 0, 4.3), // Hành lá (hành hoa)
  g('4039', 'Hành tây', 41, 1.8, 0.1, 8.2), // Hành tây
  g('4094', 'Rau thơm', 18, 2, 0, 2.4), // Rau thơm
  g('4088', 'Rau răm', 30, 4.7, 0, 2.8), // Rau răm
  g('4042', 'Hẹ lá', 18, 2.2, 0.3, 1.5), // Hẹ lá
  g('4023', 'Củ đậu', 28, 1, 0, 6), // Củ đậu
  g('4043', 'Hoa chuối', 20, 1.5, 0, 3.5), // Hoa chuối
  g('4009', 'Cà tím', 22, 1, 0, 4.5), // Cà tím
  g('4054', 'Mướp', 17, 0.9, 0.2, 2.8), // Mướp
  g('4055', 'Mướp đắng (khổ qua)', 16, 0.9, 0.2, 2.8), // Mướp đắng
  g('4053', 'Măng tre', 15, 1.7, 0.3, 1.4), // Măng tre
  g('4033', 'Đu đủ xanh', 22, 0.8, 0, 4.6), // Đu đủ xanh
  g('5042', 'Quả bơ', 101, 1.9, 9.4, 2.3), // Quả bơ vỏ xanh
  g('5015', 'Dứa (thơm)', 38, 0.5, 0.1, 8.8), // Dứa tây
  g('5030', 'Mít', 62, 1.5, 0, 14), // Mít mật
  g('5048', 'Sầu riêng', 132, 2.5, 1.6, 26.9), // Sầu riêng
  g('5011', 'Dưa hấu', 16, 1.2, 0.2, 2.3), // Dưa hấu
  g('5044', 'Thanh long', 40, 1.3, 0, 8.7), // Quả thanh long
  g('5052', 'Vải', 45, 0.7, 0.4, 9.6), // Vải
  g('5035', 'Nhãn', 48, 0.9, 0.1, 10.9), // Nhãn
  g('5004', 'Chôm chôm', 72, 1.5, 0, 16.4), // Chôm chôm
  g('5022', 'Hồng xiêm (sapôchê)', 48, 0.5, 0.7, 10), // Hồng xiêm
  g('5025', 'Mãng cầu xiêm', 53, 1.8, 0.6, 10.1), // Mãng cầu xiêm
  g('5001', 'Bưởi', 30, 0.2, 0, 7.3), // Bưởi
  g('5037', 'Nho', 68, 0.4, 0.2, 16.3), // Nho ngọt
  g('5051', 'Táo tây', 48, 0.5, 0.2, 11), // Táo tây
  g('14006', 'Nước dừa tươi', 21, 0.4, 0, 4.8), // Nước dừa non tươi
  g('14005', 'Nước cam tươi', 23, 0.7, 0.2, 4.5), // Nước cam tươi
  g('14004', 'Coca cola', 42, 0, 0, 10.4), // Coca cola
];
