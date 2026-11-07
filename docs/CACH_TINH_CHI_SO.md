# Cách tính chỉ số

Mọi phép tính nằm trong `src/domain/` và có kiểm thử trong `tests/unit/`.

| Chỉ số | Cách tính | Ngưỡng dữ liệu tối thiểu |
|---|---|---|
| Hiệp làm việc | Đã ✓, số lần > 0, không phải hiệp khởi động | — |
| Số hiệp theo nhóm cơ | Nhóm cơ chính +1, mỗi nhóm cơ phụ +0,5 (chỉnh được) | — |
| Tổng khối lượng | Σ kg × số lần (hiệp 0 kg không cộng) | — |
| e1RM | Epley `kg × (1 + lần/30)` (Epley, 1985), hoặc Brzycki `kg × 36/(37 − lần)` (Brzycki, 1993) | Chỉ tính với hiệp 1–10 lần |
| Kỷ lục (PR) | Mức tạ hoặc e1RM vượt mức cao nhất trước đó. Lần tập đầu tiên chỉ là mốc khởi điểm | — |
| Gợi ý tăng tạ | Double progression: mọi hiệp ở mức tạ cao nhất đạt số lần tối đa và RIR ≥ ngưỡng (mặc định 2). Tăng 2,5 kg cho thân trên, 5 kg cho thân dưới, hoặc theo %. Mức 2–10% phù hợp khuyến nghị cho người mới (ACSM, 2009) | Cần dữ liệu buổi trước và đủ số hiệp |
| Thay đổi cân nặng/tuần | Trung bình 7 ngày gần nhất trừ trung bình 7 ngày trước đó | ≥ 2 lần cân trong mỗi cửa sổ 7 ngày |
| Xu hướng cân nặng, vòng eo | Hồi quy tuyến tính, quy đổi ra đơn vị/tuần | ≥ 3 lần đo trải dài ≥ 14 ngày |
| Protein | Σ protein × số khẩu phần, so với mục tiêu tối thiểu | — |
| Gợi ý protein | 1,6–2,0 g/kg/ngày, làm tròn 5 g. Lợi ích tăng cơ chững lại quanh ~1,6 g/kg/ngày (Morton et al., 2018) | — |

**Không tính**: tỷ lệ mỡ cơ thể (không suy đoán từ cân nặng hay ảnh) và mục tiêu calories (cần tuổi, mức vận động và dữ liệu tiêu hao thực tế, nên người dùng tự nhập nếu muốn).

RIR (Repetitions in Reserve) là số lần còn có thể làm thêm trước khi thất bại cơ (Zourdos et al., 2016). App mặc định mục tiêu RIR 2 và không yêu cầu tập tới thất bại. Khối lượng tập theo tuần có quan hệ liều–đáp ứng với mức tăng cơ (Schoenfeld et al., 2017). App chỉ hiển thị số liệu, không chấm đúng hay sai. Hướng dẫn kỹ thuật bài tập được tổng hợp theo Haff và Triplett (2016).

## Tài liệu tham khảo

American College of Sports Medicine. (2009). American College of Sports Medicine position stand: Progression models in resistance training for healthy adults. *Medicine & Science in Sports & Exercise, 41*(3), 687–708. https://doi.org/10.1249/MSS.0b013e3181915670

Brzycki, M. (1993). Strength testing—Predicting a one-rep max from reps-to-fatigue. *Journal of Physical Education, Recreation & Dance, 64*(1), 88–90. https://doi.org/10.1080/07303084.1993.10606684

Epley, B. (1985). *Poundage chart*. Boyd Epley Workout. Body Enterprises.

Haff, G. G., & Triplett, N. T. (Eds.). (2016). *Essentials of strength training and conditioning* (4th ed.). Human Kinetics.

Morton, R. W., Murphy, K. T., McKellar, S. R., Schoenfeld, B. J., Henselmans, M., Helms, E., Aragon, A. A., Devries, M. C., Banfield, L., Krieger, J. W., & Phillips, S. M. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. *British Journal of Sports Medicine, 52*(6), 376–384. https://doi.org/10.1136/bjsports-2017-097608

Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. *Journal of Sports Sciences, 35*(11), 1073–1082. https://doi.org/10.1080/02640414.2016.1210197

Zourdos, M. C., Klemp, A., Dolan, C., Quiles, J. M., Schau, K. A., Jo, E., Helms, E., Esgro, B., Duncan, S., Garcia Merino, S., & Blanco, R. (2016). Novel resistance training–specific rating of perceived exertion scale measuring repetitions in reserve. *Journal of Strength and Conditioning Research, 30*(1), 267–275. https://doi.org/10.1519/JSC.0000000000001049
