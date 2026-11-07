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

> Bản đơn giản, đi theo từng bước. Nội dung này cũng có trong app: **Tổng quan → nút "Hướng dẫn"**.

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
| **📖** | Xem cách tập đúng của bài |
| **Chép lần trước** | Điền nhanh số liệu buổi trước |

## Câu hỏi thường gặp

**Tôi lỡ đóng app khi đang tập?** Mở lại sẽ thấy thẻ "Buổi tập đang diễn ra" → bấm **Tiếp tục**. Không mất dữ liệu.

**Tôi muốn ghi buổi tập của hôm qua?** Lịch tập → tab **Lịch** → chọn ngày → **Ghi buổi tự do**. Hoặc đổi ngày ở đầu màn hình tập.

**Tôi muốn đổi bài tập trong giáo án?** Lịch tập → tab **Giáo án** → **Sửa** → bỏ bài cũ, **Thêm bài tập** mới → **Lưu**.

**Màn hình quá sáng khi tập buổi tối?** Cài đặt → **Giao diện** → chọn **Tối**.

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
