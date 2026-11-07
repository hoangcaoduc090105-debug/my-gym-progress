/** Danh mục tài liệu tham khảo (APA 7) cho các công thức và khuyến nghị dùng trong ứng dụng. */
export const REFERENCES = [
  'American College of Sports Medicine. (2009). American College of Sports Medicine position stand: Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise, 41(3), 687–708. https://doi.org/10.1249/MSS.0b013e3181915670',
  'Brzycki, M. (1993). Strength testing—Predicting a one-rep max from reps-to-fatigue. Journal of Physical Education, Recreation & Dance, 64(1), 88–90. https://doi.org/10.1080/07303084.1993.10606684',
  'Epley, B. (1985). Poundage chart. Boyd Epley Workout. Body Enterprises.',
  'Haff, G. G., & Triplett, N. T. (Eds.). (2016). Essentials of strength training and conditioning (4th ed.). Human Kinetics.',
  'Morton, R. W., Murphy, K. T., McKellar, S. R., Schoenfeld, B. J., Henselmans, M., Helms, E., Aragon, A. A., Devries, M. C., Banfield, L., Krieger, J. W., & Phillips, S. M. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. British Journal of Sports Medicine, 52(6), 376–384. https://doi.org/10.1136/bjsports-2017-097608',
  'Schoenfeld, B. J., & Aragon, A. A. (2018). How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. Journal of the International Society of Sports Nutrition, 15, Article 10. https://doi.org/10.1186/s12970-018-0215-1',
  'Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. Journal of Sports Sciences, 35(11), 1073–1082. https://doi.org/10.1080/02640414.2016.1210197',
  'U.S. Department of Agriculture, Agricultural Research Service. (2019). FoodData Central [Data set]. https://fdc.nal.usda.gov/',
  'Zourdos, M. C., Klemp, A., Dolan, C., Quiles, J. M., Schau, K. A., Jo, E., Helms, E., Esgro, B., Duncan, S., Garcia Merino, S., & Blanco, R. (2016). Novel resistance training–specific rating of perceived exertion scale measuring repetitions in reserve. Journal of Strength and Conditioning Research, 30(1), 267–275. https://doi.org/10.1519/JSC.0000000000001049',
];

export const USAGE_NOTES: [string, string][] = [
  ['Ước tính 1RM', 'Epley (1985) mặc định, Brzycki (1993) tùy chọn; chỉ tính với hiệp ≤ 10 lần.'],
  ['RIR (số lần còn dự trữ)', 'Thang RIR theo Zourdos et al. (2016). Mặc định mục tiêu RIR 2, không yêu cầu tập tới thất bại cơ.'],
  ['Tăng tải dần', 'Người mới: toàn thân 2–3 buổi/tuần, tăng tải khoảng 2–10% khi vượt mục tiêu số lần (ACSM, 2009).'],
  ['Khối lượng tập', 'Quan hệ liều–đáp ứng giữa số hiệp/tuần và tăng cơ (Schoenfeld et al., 2017).'],
  ['Protein', 'Lợi ích tăng cơ chững lại quanh ~1,6 g/kg/ngày (Morton et al., 2018); gợi ý 1,6–2,0 g/kg.'],
  ['Kỹ thuật bài tập', 'Tổng hợp theo Haff & Triplett (2016).'],
  ['Chấm điểm bữa ăn', 'Chia đạm đều ~4 bữa, ~0,4 g/kg/bữa (Schoenfeld & Aragon, 2018).'],
  ['Thực phẩm cơ bản', 'Giá trị tham khảo USDA FoodData Central (2019), đánh dấu Ước tính.'],
];
