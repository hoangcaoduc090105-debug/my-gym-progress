import type { FoodInput } from '../db/repo';

/**
 * Bộ thực phẩm cơ bản TÙY CHỌN — chỉ nạp khi người dùng bấm.
 * Giá trị tham khảo theo USDA FoodData Central (U.S. Department of Agriculture, Agricultural Research Service, 2019);
 * vẫn đánh dấu "Ước tính" vì cách chế biến và khẩu phần thực tế khác nhau. Người dùng nên đối chiếu nhãn bao bì.
 */
const SRC = 'Tham khảo USDA FoodData Central (SR Legacy) — ước tính, nên đối chiếu nhãn thực tế';

export const STARTER_FOODS: Omit<FoodInput, 'isFavorite'>[] = [
  { name: 'Ức gà bỏ da (chín)', servingLabel: '100 g', servingGrams: 100, kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6, isVerified: false, source: SRC },
  { name: 'Trứng gà luộc', servingLabel: '1 quả lớn (~50 g)', servingGrams: 50, kcal: 78, proteinG: 6.3, carbG: 0.6, fatG: 5.3, isVerified: false, source: SRC },
  { name: 'Cơm trắng (chín)', servingLabel: '100 g', servingGrams: 100, kcal: 130, proteinG: 2.7, carbG: 28.2, fatG: 0.3, isVerified: false, source: SRC },
  { name: 'Sữa tươi nguyên kem', servingLabel: '100 ml', servingGrams: 100, kcal: 61, proteinG: 3.2, carbG: 4.8, fatG: 3.3, isVerified: false, source: SRC },
  { name: 'Chuối', servingLabel: '1 quả vừa (~118 g)', servingGrams: 118, kcal: 105, proteinG: 1.3, carbG: 27, fatG: 0.4, isVerified: false, source: SRC },
  { name: 'Yến mạch (khô)', servingLabel: '40 g', servingGrams: 40, kcal: 156, proteinG: 6.8, carbG: 26.5, fatG: 2.8, isVerified: false, source: SRC },
];
