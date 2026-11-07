/** Ngưỡng dữ liệu tối thiểu trước khi app đưa ra kết luận (tránh kết luận sai từ dữ liệu ít). */
export const THRESHOLDS = {
  /** Số lần lặp tối đa để ước tính 1RM (độ chính xác giảm khi số lần lặp cao). */
  maxRepsFor1RM: 10,
  /** Mỗi cửa sổ 7 ngày cần ít nhất số lần cân này để so sánh tuần. */
  minWeighInsPerWeek: 2,
  /** Xu hướng cần ít nhất số điểm đo này... */
  minTrendPoints: 3,
  /** ...trải dài ít nhất số ngày này. */
  minTrendSpanDays: 14,
  /** Biểu đồ tăng trưởng 1RM cần ít nhất số buổi này. */
  minSessionsForStrengthTrend: 3,
} as const;
