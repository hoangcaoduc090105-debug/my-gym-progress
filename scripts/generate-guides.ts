// Sinh docs/HUONG_DAN_SU_DUNG.md và docs/HUONG_DAN_TAP_LUYEN.md từ chính nội dung trong app.
// Chạy: npm run docs
import { writeFileSync } from 'node:fs';
import { APP_GUIDE, GUIDE_REFERENCES, TRAINING_RULES } from '../src/features/guide/guideContent';
import { BUILTIN_EXERCISES } from '../src/data/exercises';
import { createDefaultProgram } from '../src/data/defaultProgram';
import { GENERIC_BREATHING } from '../src/data/exerciseGuides';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../src/db/types';

const out = (p: string, s: string) => writeFileSync(new URL(`../docs/${p}`, import.meta.url), s.trim() + '\n');
const refs = (list: string[]) => list.map((r) => `- ${r.replace(/(\d+\(\d+\)|\d+), (\d+[–-]\d+)/, '$1, $2')}`).join('\n');

// ---------- Hướng dẫn sử dụng ----------
let a = `# Hướng dẫn sử dụng My Gym Progress

> Bản đơn giản, đi theo từng bước. Nội dung này cũng có trong app: **Hôm nay → nút "Hướng dẫn"**.

**Địa chỉ ứng dụng:** https://hoangcaoduc090105-debug.github.io/my-gym-progress/

`;
APP_GUIDE.forEach((s, i) => {
  a += `## Bước ${i + 1}. ${s.title}\n\n${s.body.map((b) => `- ${b}`).join('\n')}\n\n`;
});
a += `## Giải thích nhanh các nút trên màn hình tập

| Thành phần | Ý nghĩa |
|---|---|
| **Hiệp** (1, 2, 3 hoặc K) | Số thứ tự hiệp. Chạm để chuyển thành hiệp khởi động **K** (không tính thống kê) |
| **kg** | Mức tạ. Bài không dùng tạ (hít đất, plank…) ghi **0** |
| **Lần** | Số lần lặp. Bài giữ tư thế (plank) ghi **số giây** |
| **RIR** | Số lần **còn có thể làm thêm** khi dừng. 0 = hết sức, 2 = còn dư 2 lần |
| **✓** | Đánh dấu hiệp đã xong; đồng hồ nghỉ tự chạy |
| **📖** | Bản đồ cơ, 3 bước làm đúng, 3 lỗi cần tránh, nút xem video YouTube |
| **Chép lần trước** | Điền nhanh số liệu buổi trước |

## Câu hỏi thường gặp

**Tôi lỡ đóng app khi đang tập?** Mở lại sẽ thấy thẻ "Buổi tập đang diễn ra" → bấm **Tiếp tục**. Không mất dữ liệu.

**Tôi muốn ghi buổi tập của hôm qua?** Tập → tab **Lịch** → chọn ngày → **Ghi buổi tự do**. Hoặc đổi ngày ở đầu màn hình tập.

**Tôi muốn đổi bài tập trong giáo án?** Tập → tab **Giáo án** → **Sửa** → bỏ bài cũ, **Thêm bài tập** mới → **Lưu**.

**Màn hình quá sáng khi tập buổi tối?** Thêm → Cài đặt → **Giao diện** → chọn **Tối**.

**Gửi ảnh bữa ăn để tính calo được không?** Không. Nhận diện ảnh cần AI trả phí và gửi ảnh ra ngoài, lại sai số lớn. Thay vào đó, bạn chọn món + số khẩu phần và app tự chấm bữa đó đủ đạm chưa.

**Có cần mạng không?** Chỉ cần ở lần mở đầu tiên. Sau đó dùng offline hoàn toàn.

**Dữ liệu có bị gửi đi đâu không?** Không. Mọi thứ nằm trên điện thoại của bạn. Vì vậy hãy **xuất sao lưu mỗi tuần**.
`;
out('HUONG_DAN_SU_DUNG.md', a);

// ---------- Hướng dẫn tập luyện ----------
const program = createDefaultProgram('');
const exMap = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));
let t = `# Hướng dẫn tập luyện cho người mới bắt đầu

> Nội dung tham khảo cho người khỏe mạnh, không thay thế tư vấn y tế hay huấn luyện viên trực tiếp. Buổi đầu nên nhờ huấn luyện viên tại phòng tập quan sát kỹ thuật. Nội dung này cũng có trong app: **Hướng dẫn → Tập đúng cách / Từng động tác**.

## Phần 1. Nguyên tắc chung

`;
TRAINING_RULES.forEach((r, i) => {
  t += `### ${i + 1}. ${r.title}\n\n${r.body.map((b) => `- ${b}`).join('\n')}\n${r.cite ? `\n*${r.cite}*\n` : ''}\n`;
});
t += `## Phần 2. Giáo án mặc định: ${program.name}

${program.description}

`;
for (const d of program.days) {
  t += `### ${d.name}\n\n| # | Bài tập | Hiệp × Lần | RIR | Nghỉ |\n|---|---|---|---|---|\n`;
  d.exercises.forEach((pe, i) => {
    t += `| ${i + 1} | ${exMap.get(pe.exerciseId)?.nameVi} | ${pe.sets} × ${pe.repMin}–${pe.repMax} | ${pe.targetRIR} | ${Math.floor(pe.restSec / 60)}:${String(pe.restSec % 60).padStart(2, '0')} |\n`;
  });
  t += '\n';
}
t += `## Phần 3. Cách tập đúng từng động tác

Kỹ thuật tổng hợp theo Haff và Triplett (2016).

`;
const seen = new Set<string>();
for (const d of program.days) {
  for (const pe of d.exercises) {
    if (seen.has(pe.exerciseId)) continue;
    seen.add(pe.exerciseId);
    const e = exMap.get(pe.exerciseId)!;
    const alts = e.alternativeIds.map((x) => exMap.get(x)?.nameVi).filter(Boolean);
    t += `### ${e.nameVi} (${e.nameEn}) — ${d.name}

**Nhóm cơ chính:** ${MUSCLE_LABELS[e.primaryMuscle]}${e.secondaryMuscles.length ? ` · **Hỗ trợ:** ${e.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}` : ''} · **Dụng cụ:** ${EQUIPMENT_LABELS[e.equipment]}

**1. Chuẩn bị tư thế**
${(e.setup ?? []).map((x) => `- ${x}`).join('\n')}

**2. Thực hiện**
${e.instructions.map((x, i) => `${i + 1}. ${x}`).join('\n')}

**Hít thở:** ${e.breathing ?? GENERIC_BREATHING}

**Cảm nhận cơ ở đâu:** ${e.feel ?? MUSCLE_LABELS[e.primaryMuscle]}

**Xem video mẫu:** https://www.youtube.com/results?search_query=${encodeURIComponent(e.nameEn + ' proper form')}

**Mẹo cho người mới**
${(e.tips ?? []).map((x) => `- ${x}`).join('\n')}

**Lỗi thường gặp — tránh**
${e.commonMistakes.map((x) => `- ✕ ${x}`).join('\n')}
${alts.length ? `\n**Không có máy/dụng cụ? Bài thay thế:** ${alts.join(', ')}\n` : ''}
`;
  }
}
t += `## Tài liệu tham khảo

${refs(GUIDE_REFERENCES)}
`;
out('HUONG_DAN_TAP_LUYEN.md', t);
console.log('✓ docs/HUONG_DAN_SU_DUNG.md, docs/HUONG_DAN_TAP_LUYEN.md');

// ---------- Thực đơn Việt Nam ----------
import { VN_FOODS } from '../src/data/vnFoods';
import { VN_PLANS, foodName, itemMacro, mealMacro, planMacro } from '../src/data/vnMealPlans';
import { MEAL_LABELS } from '../src/db/types';

const n1 = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');
const n0 = (x: number) => Math.round(x).toString();
let v = `# Thực đơn Việt Nam mẫu cho người tập tăng cơ

> Bốn thực đơn 1 ngày (3 ngày nấu ở nhà + 1 ngày ăn ngoài kiểu Sài Gòn), món quen thuộc với người Việt, thiết kế cho người khoảng 65 kg tập tăng cơ, ăn 4 bữa/ngày. Có sẵn trong app: **Ăn uống → tab "Thực đơn Việt" → "Dùng cho hôm nay"**.

## Nguyên tắc thiết kế

- **Đạm (protein):** mỗi bữa ≥ 26 g, cả ngày 105–130 g. Chia đều khoảng 4 bữa, mỗi bữa ~0,4 g/kg giúp tối đa hóa tổng hợp cơ (Schoenfeld & Aragon, 2018); tổng 1,6–2,0 g/kg/ngày (Morton et al., 2018).
- **Món ăn:** bữa sáng kiểu Việt (bánh mì, phở, bún); trưa và tối là cơm + món mặn + rau + canh; bữa phụ sau tập. Ngày ăn ngoài dùng món quán (cơm tấm, hủ tiếu, gỏi cuốn) với số liệu **ước tính theo công thức** — xem MON_AN_MIEN_NAM.md.
- **Số liệu:** nguyên liệu lấy từ *Bảng thành phần thực phẩm Việt Nam* (Viện Dinh dưỡng, 2007), giá trị trên 100 g phần ăn được ở dạng sống. Bảng không có cơm chín và ức gà riêng nên hai món này lấy từ USDA FoodData Central (U.S. Department of Agriculture, 2019). Dầu ăn được tính riêng.
- **Calories:** app không đặt mục tiêu calories. Các thực đơn cung cấp khoảng ${Math.min(...VN_PLANS.map((p) => planMacro(p).kcal)).toLocaleString('vi-VN')}–${Math.max(...VN_PLANS.map((p) => planMacro(p).kcal)).toLocaleString('vi-VN')} kcal; điều chỉnh bằng lượng cơm theo diễn biến cân nặng (xem cuối tài liệu).

## Cách cân đong

- Thịt, cá, tôm: cân **sống, phần ăn được** (bỏ xương, vỏ, đầu).
- Cơm: cân **sau khi nấu**. Cân 1 lần bát cơm nhà bạn để biết 1 bát khoảng bao nhiêu gram.
- 1 thìa cà phê dầu ≈ 5 g.

`;
for (const p of VN_PLANS) {
  const t = planMacro(p);
  v += `## ${p.name}\n\n*${p.note}*\n\n**Tổng ngày:** ${n0(t.kcal)} kcal · đạm ${n1(t.proteinG)} g · carb ${n0(t.carbG)} g · fat ${n0(t.fatG)} g\n\n`;
  for (const m of p.meals) {
    const mm = mealMacro(m);
    v += `### ${MEAL_LABELS[m.meal]}: ${m.title}\n\n${m.howTo}\n\n| Thực phẩm | Khối lượng | Đạm (g) | Carb (g) | Fat (g) | kcal |\n|---|---|---|---|---|---|\n`;
    for (const it of m.items) {
      const x = itemMacro(it);
      v += `| ${foodName(it.foodId)} | ${it.portions != null ? `${it.portions} phần (ước tính)` : `${it.grams} g`} | ${n1(x.proteinG)} | ${n1(x.carbG)} | ${n1(x.fatG)} | ${n0(x.kcal)} |\n`;
    }
    v += `| **Cộng bữa** | | **${n1(mm.proteinG)}** | ${n1(mm.carbG)} | ${n1(mm.fatG)} | **${n0(mm.kcal)}** |\n\n`;
  }
}
v += `## Đổi món tương đương lượng đạm (~21 g)

| Món | Khối lượng sống, phần ăn được |
|---|---|
| Thịt bò loại I | 100 g |
| Thịt lợn nạc | 110 g |
| Cá rô phi | 105 g |
| Cá ngừ | 100 g |
| Tôm đồng | 115 g |
| Giò lụa | 100 g |
| Trứng gà | ~140 g (khoảng 3 quả) |
| Đậu phụ | 190 g |

Rau đổi tự do giữa các loại (rau muống, cải, bắp cải, rau ngót, bí…). Tinh bột đổi theo năng lượng: 100 g cơm chín (130 kcal) tương đương khoảng 90 g bánh phở (129 kcal) hoặc 120 g bún (132 kcal).

## Điều chỉnh theo cân nặng

Cân 2–3 lần/tuần vào buổi sáng. Với mục tiêu tăng cơ, mức tăng khoảng 0,25–0,5% cân nặng mỗi tuần là hợp lý (Iraki et al., 2019); với 65 kg là khoảng 0,15–0,3 kg/tuần.
- Không tăng sau 2–3 tuần: thêm khoảng 50 g cơm ở bữa trưa và tối.
- Tăng nhanh hơn mức trên: bớt cơm và dầu ăn, giữ nguyên phần đạm.

## Ăn ngoài hàng quán

Phở, bún bò, cơm tấm, bánh mì ngoài hàng khác nhau nhiều về lượng thịt, bánh và dầu mỡ; chưa có bảng chính thức về năng lượng từng món theo khẩu phần hàng quán. Khi ăn ngoài, hãy ghi theo khối lượng ước lượng của từng nguyên liệu và coi là số liệu ước tính.

## Bảng thực phẩm dùng trong app (trên 100 g)

| Thực phẩm | Nguồn | kcal | Đạm | Carb | Fat |
|---|---|---|---|---|---|
${VN_FOODS.map((x) => `| ${x.name} | ${x.fctCode ? `Viện Dinh dưỡng (2007), mã ${x.fctCode}` : 'USDA (2019), đã nấu chín'} | ${x.kcal} | ${n1(x.proteinG)} | ${n1(x.carbG)} | ${n1(x.fatG)} |`).join('\n')}

*Ô lipid của bún và rau ngót trong bảng gốc để trống ("-"); app ghi là 0.*

## Tài liệu tham khảo

- Iraki, J., Fitschen, P., Espinar, S., & Helms, E. (2019). Nutrition recommendations for bodybuilders in the off-season: A narrative review. *Sports, 7*(7), Article 154. https://doi.org/10.3390/sports7070154
- Morton, R. W., Murphy, K. T., McKellar, S. R., Schoenfeld, B. J., Henselmans, M., Helms, E., Aragon, A. A., Devries, M. C., Banfield, L., Krieger, J. W., & Phillips, S. M. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. *British Journal of Sports Medicine, 52*(6), 376–384. https://doi.org/10.1136/bjsports-2017-097608
- Schoenfeld, B. J., & Aragon, A. A. (2018). How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. *Journal of the International Society of Sports Nutrition, 15*, Article 10. https://doi.org/10.1186/s12970-018-0215-1
- U.S. Department of Agriculture, Agricultural Research Service. (2019). *FoodData Central* [Data set]. https://fdc.nal.usda.gov/
- Viện Dinh dưỡng. (2007). *Bảng thành phần thực phẩm Việt Nam* [Vietnamese food composition table]. Nhà xuất bản Y học. Bản PDF: https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf
`;
out('THUC_DON_VIET_NAM.md', v);
console.log('✓ docs/THUC_DON_VIET_NAM.md');

// ---------- Món ăn miền Nam ----------
import { SOUTHERN_DISHES, DISH_CATEGORY_LABEL, dishMacro, ingredientById } from '../src/data/southernDishes';

let s2 = `# Món ăn quen thuộc miền Nam — năng lượng và đạm ước tính

> Có sẵn trong app: **Ăn uống → Thêm món → tab "Món ăn sẵn"**. Mỗi món là 1 phần ăn (dĩa/tô/ổ); nếu ăn nhiều hơn hoặc ít hơn, sửa số phần (ví dụ 1,5).

## Cách tính

- **Chưa có bảng chính thức về năng lượng món ăn hàng quán theo khẩu phần.** Nguồn công khai trên mạng lệch nhau nhiều (ví dụ một tô hủ tiếu được ghi từ khoảng 350 đến 650 kcal tùy nguồn).
- Vì vậy mỗi món được **tính từ công thức nguyên liệu**: khối lượng nguyên liệu trong 1 phần ăn ở quán bình dân (giả định, ghi rõ bên dưới) × giá trị dinh dưỡng của nguyên liệu trong *Bảng thành phần thực phẩm Việt Nam* (Viện Dinh dưỡng, 2007). Cơm chín lấy theo USDA FoodData Central (U.S. Department of Agriculture, 2019).
- Thịt, cá tính theo khối lượng sống, phần ăn được. **Không tính nước dùng** của phở, hủ tiếu, bún bò vì chưa có số liệu chính thống — năng lượng thực tế có thể cao hơn.
- Vì khẩu phần là giả định, mọi món đều gắn nhãn **"Ước tính"** trong app.

## Tóm tắt

| Món | Phần ăn | Khối lượng | kcal | Đạm (g) | Carb (g) | Fat (g) |
|---|---|---|---|---|---|---|
${SOUTHERN_DISHES.map((d) => {
  const m = dishMacro(d);
  return `| ${d.name} | ${d.portion} | ${d.category === 'do-uong' ? '—' : `~${m.grams} g`} | ${m.kcal} | ${n1(m.proteinG)} | ${n1(m.carbG)} | ${n1(m.fatG)} |`;
}).join('\n')}

**Mẹo chọn món cho người tập tăng cơ:** bữa chính nên đạt khoảng 26 g đạm trở lên (Schoenfeld & Aragon, 2018).
- **Đạt ≥ 26 g đạm:** ${SOUTHERN_DISHES.filter((d) => d.category !== 'do-uong' && dishMacro(d).proteinG >= 26).map((d) => d.name).join(', ')}.
- **Dưới 26 g — nên ăn kèm sữa, trứng hoặc thêm thịt:** ${SOUTHERN_DISHES.filter((d) => d.category !== 'do-uong' && dishMacro(d).proteinG < 26).map((d) => d.name).join(', ')}.
- Món nhiều dầu mỡ (fat ≥ 25 g/phần): ${SOUTHERN_DISHES.filter((d) => dishMacro(d).fatG >= 25).map((d) => d.name).join(', ')} — xin ít mỡ hành nếu muốn giảm năng lượng.

## Công thức từng món

`;
for (const cat of Object.keys(DISH_CATEGORY_LABEL) as (keyof typeof DISH_CATEGORY_LABEL)[]) {
  const list = SOUTHERN_DISHES.filter((d) => d.category === cat);
  if (!list.length) continue;
  s2 += `### ${DISH_CATEGORY_LABEL[cat]}\n\n`;
  for (const d of list) {
    const m = dishMacro(d);
    s2 += `#### ${d.name} (${d.portion})\n\n${d.note ? `*${d.note}*\n\n` : ''}| Nguyên liệu | Khối lượng | Nguồn |\n|---|---|---|\n`;
    for (const it of d.recipe) {
      const x = ingredientById(it.foodId)!;
      s2 += `| ${x.name} | ${it.grams} g | ${x.fctCode ? `Viện Dinh dưỡng (2007), mã ${x.fctCode}` : 'USDA (2019)'} |\n`;
    }
    s2 += `| **Cộng** | **~${m.grams} g** | **${m.kcal} kcal · đạm ${n1(m.proteinG)} g · carb ${n1(m.carbG)} g · fat ${n1(m.fatG)} g** |\n\n`;
  }
}
s2 += `## Tài liệu tham khảo

- Schoenfeld, B. J., & Aragon, A. A. (2018). How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. *Journal of the International Society of Sports Nutrition, 15*, Article 10. https://doi.org/10.1186/s12970-018-0215-1
- U.S. Department of Agriculture, Agricultural Research Service. (2019). *FoodData Central* [Data set]. https://fdc.nal.usda.gov/
- Viện Dinh dưỡng. (2007). *Bảng thành phần thực phẩm Việt Nam* [Vietnamese food composition table]. Nhà xuất bản Y học. https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf
`;
out('MON_AN_MIEN_NAM.md', s2);
console.log('✓ docs/MON_AN_MIEN_NAM.md');
