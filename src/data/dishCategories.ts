/** Nhóm món ăn sẵn — tách riêng (rất nhỏ) để các màn hình không phải tải cả danh sách món. */
export type DishCategory = 'com' | 'bun-pho' | 'banh-mi' | 'an-vat' | 'trang-mieng' | 'do-uong';

export const DISH_CATEGORY_LABEL: Record<DishCategory, string> = {
  com: 'Cơm',
  'bun-pho': 'Bún · phở · hủ tiếu · mì · cháo',
  'banh-mi': 'Bánh mì · xôi · bánh',
  'an-vat': 'Ăn vặt · cuốn · gỏi',
  'trang-mieng': 'Chè · trái cây',
  'do-uong': 'Đồ uống',
};
