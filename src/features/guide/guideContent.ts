/**
 * Nội dung hướng dẫn — dùng chung cho trang Hướng dẫn trong app và tài liệu docs/ (scripts/generate-guides.ts).
 * Trích dẫn theo APA 7; danh mục đầy đủ ở GUIDE_REFERENCES.
 */
export interface GuideStep {
  title: string;
  body: string[];
}

export const APP_GUIDE: GuideStep[] = [
  {
    title: 'Lần đầu mở ứng dụng',
    body: [
      'Nhập chiều cao và cân nặng hiện tại, rồi bấm "Bắt đầu".',
      'Ứng dụng tự gợi ý mục tiêu protein mỗi ngày; bạn sửa được bất kỳ lúc nào trong Thêm → Cài đặt.',
      'Thanh dưới cùng có 5 nút: Hôm nay · Tập · Cơ thể · Ăn uống · Thêm (thư viện bài tập, phân tích, hướng dẫn, cài đặt).',
      'Mọi dữ liệu chỉ lưu trên điện thoại của bạn, không gửi đi đâu.',
    ],
  },
  {
    title: 'Cài ứng dụng lên màn hình chính',
    body: [
      'iPhone: mở trang bằng Safari → nút Chia sẻ (ô vuông có mũi tên) → "Thêm vào MH chính".',
      'Android: mở bằng Chrome → menu ⋮ → "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".',
      'Sau đó mở app từ biểu tượng, dùng được cả khi không có mạng.',
    ],
  },
  {
    title: 'Bắt đầu một buổi tập',
    body: [
      'Ở trang Hôm nay, bấm "Bắt đầu" trên thẻ xanh Buổi tập kế tiếp. App tự xoay vòng Buổi A → B → C.',
      'Không bắt buộc tập vào thứ cố định. Nên nghỉ ít nhất 1 ngày giữa 2 buổi.',
      'Muốn tự chọn bài: Tập → "Buổi tự do".',
    ],
  },
  {
    title: 'Ghi từng hiệp khi đang tập',
    body: [
      'Mỗi dòng là 1 hiệp: nhập số kg, số lần, RIR (số lần còn có thể làm thêm), rồi bấm ✓.',
      'Ô trống có chữ mờ là số liệu buổi trước — bấm ✓ luôn nếu bạn làm đúng như vậy.',
      'Bấm ✓ thì đồng hồ nghỉ tự chạy ở cuối màn hình (có nút +15 giây, −15 giây, bỏ qua).',
      'Bấm biểu tượng quyển sách 📖 cạnh tên bài để xem bản đồ cơ, 3 bước làm đúng, 3 lỗi cần tránh và nút mở video mẫu trên YouTube.',
      'Chạm vào số thứ tự hiệp để đổi thành hiệp khởi động (K); hiệp K không tính vào thống kê.',
      'Dòng xanh "Gợi ý: … kg" xuất hiện khi bạn đủ điều kiện tăng tạ. Đây chỉ là gợi ý, giáo án không tự đổi.',
    ],
  },
  {
    title: 'Kết thúc buổi tập',
    body: [
      'Bấm "Hoàn thành" ở cuối trang. Chỉ các hiệp đã ✓ được lưu vào lịch sử.',
      'Thoát app giữa chừng không sao: mọi thứ được lưu tự động, mở lại sẽ thấy nút "Tiếp tục".',
      'Lỡ tay hủy hoặc xóa: vào Thêm → Cài đặt → Thùng rác để khôi phục.',
    ],
  },
  {
    title: 'Ghi cân nặng và số đo',
    body: [
      'Cơ thể → "Ghi số đo". Chỉ cần nhập chỉ số bạn có.',
      'Nên cân 2–3 lần mỗi tuần, buổi sáng sau khi vệ sinh, trước khi ăn.',
      'Đo vòng mỗi 2 tuần, cùng vị trí thước dây. App sẽ nhắc bạn ở trang Hôm nay.',
      'Ảnh tiến độ: tab Ảnh → chọn góc chụp → "Chọn / chụp ảnh". Dùng nút "So sánh" để xem 2 ảnh cạnh nhau.',
    ],
  },
  {
    title: 'Ghi bữa ăn và kiểm tra bữa đó có phù hợp không',
    body: [
      'Cách nhanh nhất: Ăn uống → tab "Thực đơn Việt" → chọn 1 trong 4 thực đơn mẫu (có 1 ngày ăn ngoài kiểu Sài Gòn) → "Dùng cho hôm nay".',
      'Ăn ngoài quán: "Thêm món" → tab "Món ăn sẵn" → chọn cơm tấm, hủ tiếu, bánh mì, bún bò… (hơn 100 món: cơm, bún, phở, hủ tiếu, bánh mì, xôi, ăn vặt, chè, trái cây, đồ uống — số liệu ước tính theo công thức).',
      'Lần đầu: tab "Món của tôi" → bấm "Thêm … món ăn sẵn + 36 thực phẩm Việt Nam", hoặc tự thêm món theo nhãn bao bì.',
      'Hằng ngày: tab Hôm nay → "Thêm món" ở từng bữa → nhập số khẩu phần → chạm vào món.',
      'Ngay dưới mỗi bữa, app chấm: Phù hợp / Hơi thiếu đạm / Thiếu đạm, và gợi ý món để bù (chạm là thêm luôn).',
      'Muốn app đánh giá cả calories: đặt mục tiêu calories trong Thêm → Cài đặt.',
      'Thanh protein cho biết bạn đã đạt bao nhiêu so với mục tiêu ngày.',
      'Thực phẩm ăn thường xuyên: bấm ngôi sao ⭐ để đưa lên đầu danh sách.',
    ],
  },
  {
    title: 'Xem tiến bộ',
    body: [
      'Thêm → Phân tích: số buổi mỗi tuần, số hiệp theo nhóm cơ, tổng khối lượng, sức mạnh từng bài, kỷ lục cá nhân.',
      'Mỗi chỉ số có nút "Cách tính" giải thích ý nghĩa.',
      'Khi dữ liệu còn ít, app hiện "Chưa đủ dữ liệu" thay vì đưa kết luận sai.',
    ],
  },
  {
    title: 'Sao lưu dữ liệu — làm mỗi tuần',
    body: [
      'Thêm → Cài đặt → "Xuất toàn bộ dữ liệu (JSON)" → lưu tệp vào Google Drive hoặc iCloud.',
      'Đổi điện thoại: cài app ở máy mới → Thêm → Cài đặt → "Nhập dữ liệu JSON" → chọn tệp đã lưu.',
      'Xóa dữ liệu trình duyệt mà không có tệp sao lưu sẽ mất toàn bộ nhật ký.',
    ],
  },
];

export interface TrainingRule {
  title: string;
  body: string[];
  cite?: string;
}

export const TRAINING_RULES: TrainingRule[] = [
  {
    title: 'Lịch tập tuần',
    body: [
      'Tập 3 buổi toàn thân mỗi tuần, xen kẽ ngày nghỉ (ví dụ Thứ 2 – Thứ 4 – Thứ 6, hoặc Thứ 3 – Thứ 5 – Thứ 7).',
      'Mỗi buổi khoảng 45–70 phút kể cả khởi động.',
    ],
    cite: 'Với người mới, tập toàn thân 2–3 buổi/tuần là mức được khuyến nghị (American College of Sports Medicine [ACSM], 2009).',
  },
  {
    title: 'Khởi động 5–10 phút',
    body: [
      'Đạp xe hoặc đi bộ nhanh 5 phút cho ấm người.',
      'Trước bài đầu tiên: 1–2 hiệp nhẹ (khoảng một nửa mức tạ chính, 8–10 lần). Ghi là hiệp K trong app.',
    ],
  },
  {
    title: 'Chọn mức tạ khởi đầu',
    body: [
      'Tuần 1–2 là tuần học kỹ thuật: chọn mức tạ nhẹ hơn khả năng.',
      'Mức đúng: làm được số lần mục tiêu (ví dụ 10 lần) mà vẫn còn dư khoảng 2–3 lần, động tác không bị biến dạng.',
      'Làm dễ dàng hơn 15 lần → tăng tạ. Không đủ 6 lần → giảm tạ.',
    ],
  },
  {
    title: 'Hiểu RIR (số lần còn dự trữ)',
    body: [
      'RIR 0: không thể làm thêm lần nào. RIR 2: còn làm được khoảng 2 lần nữa.',
      'Mục tiêu mặc định của giáo án là RIR 2 — đủ nặng để tiến bộ, không cần tập tới kiệt sức.',
      'Người mới thường đoán RIR chưa chuẩn; cứ ghi ước lượng của bạn, càng tập càng chính xác.',
    ],
    cite: 'Thang RIR theo Zourdos và cộng sự (2016).',
  },
  {
    title: 'Nhịp độ mỗi lần lặp',
    body: [
      'Hạ tạ chậm, có kiểm soát trong 2–3 giây.',
      'Đẩy hoặc kéo lên dứt khoát nhưng không giật, không dùng đà vung người.',
    ],
  },
  {
    title: 'Hít thở',
    body: [
      'Hít vào ở pha hạ tạ, thở ra khi đẩy hoặc kéo qua đoạn khó nhất.',
      'Bài squat, deadlift: có thể hít sâu và giữ hơi ngắn trong một lần lặp để giữ thân vững, rồi thở ra.',
      'Người có bệnh tim mạch hoặc huyết áp cao không nên nín thở khi tập.',
    ],
    cite: 'Nguyên tắc hít thở và giữ thân vững theo Haff và Triplett (2016).',
  },
  {
    title: 'Nghỉ giữa các hiệp',
    body: ['Bài lớn (squat, đạp đùi, đẩy ngực, deadlift): 2–3 phút.', 'Bài nhỏ (tay, vai giữa, bắp chân, bụng): 1–1,5 phút.'],
    cite: 'Khoảng nghỉ 2–3 phút cho bài đa khớp nặng và 1–2 phút cho bài khác theo ACSM (2009).',
  },
  {
    title: 'Tăng tiến (progressive overload)',
    body: [
      'Giữ nguyên mức tạ và tăng dần số lần, cho tới khi mọi hiệp đạt số lần tối đa (ví dụ 3 × 12).',
      'Khi đó tăng tạ nhỏ: khoảng 2,5 kg cho bài thân trên, 5 kg cho thân dưới (tạ đơn: lên bậc tạ kế tiếp), rồi quay về số lần tối thiểu.',
      'App tự hiện "Gợi ý: … kg" khi bạn đủ điều kiện.',
    ],
    cite: 'Mức tăng tải khoảng 2–10% khi vượt mục tiêu số lần theo ACSM (2009).',
  },
  {
    title: 'Đau mỏi bình thường và dấu hiệu phải dừng',
    body: [
      'Bình thường: cơ mỏi, đau âm ỉ 1–3 ngày sau buổi tập, nhất là 2 tuần đầu. Cảm giác này giảm dần khi cơ thể quen.',
      'Phải dừng ngay: đau nhói hoặc đau trong khớp, tê, chóng mặt, tức ngực. Nghỉ và hỏi ý kiến bác sĩ nếu không hết.',
    ],
    cite: 'Đau mỏi cơ khởi phát muộn thường đạt đỉnh trong khoảng 24–72 giờ sau tập (Cheung et al., 2003).',
  },
  {
    title: 'An toàn ở phòng gym',
    body: [
      'Buổi đầu: nhờ huấn luyện viên của phòng tập chỉnh máy và quan sát kỹ thuật.',
      'Dùng thanh chặn an toàn khi squat hoặc đẩy ngực với tạ đòn; khóa chốt an toàn ở máy đạp đùi trước khi rời máy.',
      'Lau dụng cụ, trả tạ về giá sau khi dùng.',
    ],
  },
  {
    title: 'Phục hồi',
    body: [
      'Ngủ đủ 7–9 tiếng mỗi đêm.',
      'Ăn đủ protein mỗi ngày (theo dõi trong mục Ăn uống) và chia đều cho các bữa.',
      'Cơ phát triển trong lúc nghỉ, không phải lúc tập — đừng bỏ ngày nghỉ.',
    ],
    cite: 'Lợi ích tăng cơ của protein chững lại quanh mức khoảng 1,6 g/kg/ngày (Morton et al., 2018).',
  },
];

export const GUIDE_REFERENCES = [
  'American College of Sports Medicine. (2009). American College of Sports Medicine position stand: Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise, 41(3), 687–708. https://doi.org/10.1249/MSS.0b013e3181915670',
  'Cheung, K., Hume, P. A., & Maxwell, L. (2003). Delayed onset muscle soreness: Treatment strategies and performance factors. Sports Medicine, 33(2), 145–164. https://doi.org/10.2165/00007256-200333020-00005',
  'Haff, G. G., & Triplett, N. T. (Eds.). (2016). Essentials of strength training and conditioning (4th ed.). Human Kinetics.',
  'Iraki, J., Fitschen, P., Espinar, S., & Helms, E. (2019). Nutrition recommendations for bodybuilders in the off-season: A narrative review. Sports, 7(7), Article 154. https://doi.org/10.3390/sports7070154',
  'Morton, R. W., Murphy, K. T., McKellar, S. R., Schoenfeld, B. J., Henselmans, M., Helms, E., Aragon, A. A., Devries, M. C., Banfield, L., Krieger, J. W., & Phillips, S. M. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. British Journal of Sports Medicine, 52(6), 376–384. https://doi.org/10.1136/bjsports-2017-097608',
  'Schoenfeld, B. J., & Aragon, A. A. (2018). How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. Journal of the International Society of Sports Nutrition, 15, Article 10. https://doi.org/10.1186/s12970-018-0215-1',
  'U.S. Department of Agriculture, Agricultural Research Service. (2019). FoodData Central [Data set]. https://fdc.nal.usda.gov/',
  'Viện Dinh dưỡng. (2007). Bảng thành phần thực phẩm Việt Nam [Vietnamese food composition table]. Nhà xuất bản Y học.',
  'Zourdos, M. C., Klemp, A., Dolan, C., Quiles, J. M., Schau, K. A., Jo, E., Helms, E., Esgro, B., Duncan, S., Garcia Merino, S., & Blanco, R. (2016). Novel resistance training–specific rating of perceived exertion scale measuring repetitions in reserve. Journal of Strength and Conditioning Research, 30(1), 267–275. https://doi.org/10.1519/JSC.0000000000001049',
];
