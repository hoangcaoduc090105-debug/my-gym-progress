// Kiểm thử đầu-cuối trên bản build thật (vite preview) bằng Playwright/Chromium.
// Chạy: npm run build && npm run test:e2e   (SCREENSHOT_DIR=... để lưu ảnh chụp)
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SCREENSHOT_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview không khởi động')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), res()));
  server.on('exit', (c) => rej(new Error('preview thoát ' + c)));
});

const launchOpts = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, serviceWorkers: 'allow' });
const page = await context.newPage();
page.setDefaultTimeout(15000);

const external = [];
const consoleErrors = [];
context.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
});
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

let step = 0;
const results = [];
async function check(name, fn) {
  step++;
  try {
    await fn();
    results.push(`✓ ${step}. ${name}`);
    console.log(`✓ ${step}. ${name}`);
  } catch (e) {
    console.error(`✗ ${step}. ${name}\n   ${e.message}`);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `fail-${step}.png`), fullPage: true }).catch(() => {});
    throw e;
  }
}
const shot = async (n) => SHOTS && page.screenshot({ path: join(SHOTS, `${n}.png`), fullPage: true });
/** Chờ ô nhập có đúng giá trị (NumberInput đồng bộ chữ trong useEffect — đọc ngay sau thao tác có thể còn chữ cũ). */
const waitValue = async (locator, expected, timeout = 5000) => {
  const end = Date.now() + timeout;
  let v = await locator.inputValue();
  while (v !== expected && Date.now() < end) {
    await page.waitForTimeout(50);
    v = await locator.inputValue();
  }
  assert.equal(v, expected);
};
const noOverflow = async () => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= iw + 1, `tràn ngang: scrollWidth ${sw} > ${iw}`);
};

try {
  await check('Lần đầu mở: chuyển tới màn hình hồ sơ, không có dữ liệu cá nhân dựng sẵn', async () => {
    await page.goto(BASE);
    await page.getByRole('heading', { name: 'My Gym Progress' }).waitFor();
    assert.equal(await page.getByLabel('Chiều cao (cm) *').inputValue(), '');
    await shot('01-onboarding');
  });

  await check('Tạo hồ sơ 174 cm / 65 kg, gợi ý protein 105–130 g', async () => {
    await page.getByLabel('Chiều cao (cm) *').fill('174');
    await page.getByLabel('Cân nặng hiện tại (kg)').fill('65');
    assert.equal(await page.getByLabel('Tối thiểu (g)').inputValue(), '105');
    assert.equal(await page.getByLabel('Tối đa (g)').inputValue(), '130');
    await page.getByRole('button', { name: 'Bắt đầu' }).click();
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor();
    await page.getByText('Buổi A', { exact: true }).first().waitFor();
    await noOverflow();
    await shot('02-dashboard');
  });

  let sessionUrl = '';
  await check('Bắt đầu Buổi A, ghi hiệp, đồng hồ nghỉ chạy', async () => {
    await page.goto(BASE + '#/lich-tap');
    await page.getByRole('button', { name: 'Bắt đầu Buổi A' }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    sessionUrl = page.url();
    await page.getByLabel('Mức tạ hiệp 1').first().fill('16');
    await page.getByLabel('Số lần hiệp 1').first().fill('12');
    await page.getByLabel('RIR hiệp 1').first().selectOption('2');
    await page.getByRole('button', { name: 'Hoàn thành hiệp 1' }).first().click();
    await page.getByRole('timer').waitFor();
    await page.getByLabel('Mức tạ hiệp 2').first().fill('16');
    await page.getByLabel('Số lần hiệp 2').first().fill('11');
    await page.getByRole('button', { name: 'Hoàn thành hiệp 2' }).first().click();
    await noOverflow();
    await shot('03-logger');
    await page.getByRole('button', { name: 'Xem kỹ thuật' }).first().click();
    await page.getByRole('dialog').getByRole('img', { name: 'Nhìn trước' }).waitFor();
    await page.getByRole('dialog').getByText('Làm nhanh 3 bước').waitFor();
    const yt = await page.getByRole('dialog').getByRole('link', { name: /Xem video mẫu trên YouTube/ }).getAttribute('href');
    assert.ok(yt.startsWith('https://www.youtube.com/results?search_query=Goblet'));
    await page.getByRole('dialog').getByRole('button', { name: 'Hướng dẫn chi tiết' }).click();
    await page.getByRole('dialog').getByText('Chuẩn bị tư thế').waitFor();
    await shot('03b-technique');
    await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();
  });

  await check('Tải lại trang giữa buổi: không mất hiệp đã ghi', async () => {
    await page.waitForTimeout(300);
    await page.reload();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    assert.equal(await page.getByLabel('Mức tạ hiệp 1').first().inputValue(), '16');
    assert.equal(await page.getByLabel('Số lần hiệp 2').first().inputValue(), '11');
    assert.equal(await page.getByRole('button', { name: 'Bỏ đánh dấu hiệp 1' }).count() >= 1, true);
    await page.getByRole('timer').waitFor();
  });

  await check('Hoàn thành buổi tập, lịch sử cập nhật', async () => {
    await page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    await page.getByText('Đã lưu buổi tập!').waitFor();
    await page.goto(BASE + '#/lich-tap?tab=history');
    await page.getByText('2 hiệp').first().waitFor();
    await page.goto(BASE + '#/lich-tap');
    await page.getByRole('button', { name: 'Bắt đầu Buổi B' }).waitFor();
    assert.ok(sessionUrl.includes('#/tap/'));
  });

  await check('Ghi số đo cơ thể (cân nặng + vòng eo)', async () => {
    await page.goto(BASE + '#/co-the');
    await page.getByRole('button', { name: 'Ghi số đo' }).click();
    await page.getByLabel('Cân nặng (kg)').fill('65,4');
    await page.getByLabel('Vòng eo (cm)').fill('76');
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click();
    await page.getByText('76 cm').waitFor();
    await page.getByRole('tab', { name: 'Biểu đồ' }).click();
    await page.locator('.recharts-surface').first().waitFor();
    await page.getByText('Chưa đủ dữ liệu để tính xu hướng').waitFor();
    await shot('04-body');
  });

  await check('Dinh dưỡng: tạo thực phẩm (ước tính), ghi nhật ký, protein cập nhật', async () => {
    await page.goto(BASE + '#/dinh-duong');
    await page.getByRole('button', { name: 'Thêm món' }).first().click();
    await page.getByRole('button', { name: '+ Món mới' }).click();
    await page.getByLabel('Tên *').fill('Ức gà luộc');
    await page.getByLabel('Protein (g)').fill('31');
    await page.getByLabel('Fat (g)').fill('3,6');
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click();
    // Tìm kiếm không dấu trong bộ chọn món
    await page.getByLabel('Tìm món').fill('uc ga');
    await page.getByRole('button', { name: 'Thêm Ức gà luộc' }).click();
    await page.getByText('/ 105–130 g').waitFor();
    await page.getByText('Còn 74 g').waitFor();
    await page.getByText('Ước tính').first().waitFor();
    // Chấm điểm bữa: 31 g ≥ 26 g/bữa → Phù hợp
    await page.getByTestId('meal-verdict').getByText('Bữa này: Phù hợp').waitFor();
    // Nạp món cơ bản rồi thêm 1 quả trứng vào bữa trưa → bữa thiếu đạm + có gợi ý bù
    await page.getByRole('tab', { name: 'Món của tôi' }).click();
    await page.getByRole('button', { name: /món ăn sẵn \+/ }).click();
    await page.getByRole('button', { name: /Thịt · cá · trứng · đậu/ }).click();
    await page.getByText(/^Trứng gà/).first().waitFor();
    await shot('05d-my-foods');
    await page.getByRole('tab', { name: 'Hôm nay' }).click();
    await page.getByRole('button', { name: 'Thêm món' }).nth(1).click();
    // Tab Gợi ý: bữa trưa gợi ý nhóm Cơm trước
    await page.getByText('Hợp cho bữa trưa').waitFor();
    await page.getByRole('button', { name: 'Thêm Cơm tấm sườn', exact: true }).waitFor();
    await page.getByText('Cơm tấm', { exact: true }).first().waitFor();
    await shot('05e-picker-suggest');
    await page.getByRole('tab', { name: 'Món ăn sẵn' }).click();
    await page.getByRole('button', { name: /Chè · trái cây/ }).click();
    await page.getByRole('button', { name: 'Thêm Cơm tấm sườn bì chả', exact: true }).waitFor();
    await shot('05c-dishes');
    await page.getByRole('tab', { name: 'Nguyên liệu' }).click();
    await page.getByRole('button', { name: 'Thêm Trứng gà', exact: true }).click();
    await page.getByText('Bữa này: Thiếu đạm').waitFor();
    await page.getByRole('button', { name: /\+ .*đạm/ }).first().waitFor();
    // Thực đơn Việt Nam mẫu: áp dụng cho hôm nay
    await page.getByRole('tab', { name: 'Thực đơn Việt' }).click();
    await page.getByText('Ngày tập B — Phở bò, cơm thịt rim, tôm rang').waitFor();
    await page.getByRole('button', { name: 'Xem gram từng món' }).first().click();
    await page.getByText('Thịt bò loại I (sống)').first().waitFor();
    await shot('05b-vn-plans');
    await page.getByRole('button', { name: 'Dùng cho hôm nay' }).nth(1).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Thêm vào hôm nay' }).click();
    await page.getByText(/Đã thêm 16 món/).waitFor();
    await page.getByText('Bánh phở').first().waitFor();
    await noOverflow();
    await shot('05-nutrition');
  });

  await check('Trang Hướng dẫn: dùng app, tập đúng cách, từng động tác', async () => {
    await page.goto(BASE + '#/huong-dan');
    await page.getByText('Ghi từng hiệp khi đang tập').waitFor();
    await page.getByRole('tab', { name: 'Tập đúng cách' }).click();
    await page.getByText('Chọn mức tạ khởi đầu').waitFor();
    await page.getByText(/Cheung, K\., Hume/).waitFor();
    await shot('08-guide');
    await page.getByRole('tab', { name: 'Từng động tác' }).click();
    await page.getByRole('link', { name: /Squat tạ ấm/ }).click();
    await page.getByRole('img', { name: 'Nhìn sau' }).waitFor();
    await page.getByText('Làm nhanh 3 bước').waitFor();
    await page.getByRole('button', { name: 'Hướng dẫn chi tiết' }).click();
    await page.getByText('Mẹo cho người mới').waitFor();
    await noOverflow();
    await shot('08b-exercise');
  });

  await check('Phân tích: biểu đồ và kỷ lục hiển thị', async () => {
    await page.goto(BASE + '#/phan-tich');
    await page.getByText('Kỷ lục cá nhân (Personal Records)').waitFor();
    assert.ok((await page.locator('.recharts-surface').count()) >= 3);
    await page.getByRole('button', { name: /Cách tính/ }).first().click();
    await noOverflow();
    await shot('06-analytics');
  });

  await check('Chi tiết bài: tab Lịch sử có buổi đã tập', async () => {
    await page.goto(BASE + '#/thu-vien/goblet-squat');
    await page.getByRole('tab', { name: 'Lịch sử' }).click();
    await page.getByTestId('history-row').first().waitFor();
    assert.ok((await page.getByTestId('history-row').count()) >= 1);
    assert.match(await page.getByTestId('history-row').first().innerText(), /16×12 · 16×11/);
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await page.getByTestId('history-row').first().waitFor();
    await shot('13-exercise-history');
  });

  let backupPath = '';
  await check('Xuất JSON chứa buổi tập, số đo, nhật ký ăn', async () => {
    await page.goto(BASE + '#/cai-dat');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Xuất toàn bộ dữ liệu (JSON)' }).click()]);
    backupPath = join(SHOTS ?? '/tmp', 'e2e-backup.json');
    await dl.saveAs(backupPath);
    const b = JSON.parse(readFileSync(backupPath, 'utf8'));
    assert.equal(b.app, 'my-gym-progress');
    assert.equal(b.data.sessions.length, 1);
    assert.equal(b.data.bodyMetrics.length, 2);
    assert.equal(b.data.foodLogs.length, 18);
    assert.equal(b.data.profile[0].heightCm, 174);
  });

  await check('Xuất CSV lịch sử tập', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV lịch sử tập' }).click()]);
    const p = join(SHOTS ?? '/tmp', 'e2e.csv');
    await dl.saveAs(p);
    const csv = readFileSync(p, 'utf8');
    assert.ok(csv.includes('Squat tạ ấm/tạ đơn trước ngực'));
  });

  await check('Nhập tệp lỗi: báo lỗi, không thay đổi dữ liệu', async () => {
    const bad = join(SHOTS ?? '/tmp', 'bad.json');
    writeFileSync(bad, JSON.stringify({ app: 'my-gym-progress', formatVersion: 1, data: { bodyMetrics: [{ id: 'x', date: 'sai' }] } }));
    await page.getByTestId('import-input').setInputFiles(bad);
    await page.getByText('Tệp không hợp lệ — chưa có dữ liệu nào bị thay đổi.').waitFor();
  });

  await check('Nhập lại JSON (thay thế toàn bộ) có xác nhận', async () => {
    await page.getByTestId('import-input').setInputFiles(backupPath);
    await page.getByText('Kiểm tra tệp sao lưu').waitFor();
    await page.getByRole('tab', { name: 'Thay thế toàn bộ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Nhập' }).click();
    await page.getByRole('button', { name: 'Thay thế toàn bộ' }).last().click();
    await page.getByText(/Đã nhập \d+ bản ghi/).waitFor();
    await page.goto(BASE + '#/lich-tap?tab=history');
    await page.getByText('2 hiệp').first().waitFor();
  });

  // Chỉ dùng cho các bước sau: hủy buổi đang tập dở (nếu có) để không chặn buổi mới.
  const cancelCurrent = async () => {
    await page.getByRole('button', { name: 'Hủy buổi', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy buổi', exact: true }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor({ state: 'detached' });
  };

  await check('Hủy buổi tập rồi khôi phục từ Thùng rác', async () => {
    await page.goto(BASE + '#/lich-tap');
    await page.getByRole('button', { name: 'Bắt đầu Buổi B' }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    const draftUrl = page.url();
    await cancelCurrent();
    await page.goto(BASE + '#/cai-dat');
    const row = page.locator('#thung-rac li').filter({ hasText: 'Buổi tập: Buổi B' });
    await row.waitFor();
    await row.getByRole('button', { name: 'Khôi phục' }).click();
    await page.getByText('Đã khôi phục').waitFor();
    await row.waitFor({ state: 'detached' });
    // Buổi dở đã quay lại: mở được và hủy lần nữa để dọn
    await page.goto(draftUrl);
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    await cancelCurrent();
  });

  await check('Thay bài giữa buổi bằng bài gợi ý', async () => {
    await page.goto(BASE + '#/lich-tap');
    await page.getByRole('button', { name: /^Bắt đầu Buổi/ }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    await page.getByRole('button', { name: 'Thay bài' }).first().click();
    const dlg = page.getByRole('dialog', { name: /^Thay bài:/ });
    await dlg.getByText('Bài thay thế gợi ý').waitFor();
    const alt = dlg.getByRole('button', { name: /^Thay bằng / }).first();
    const newName = (await alt.getAttribute('aria-label')).replace(/^Thay bằng /, '');
    await shot('12-swap');
    await alt.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Chỉ buổi này' }).click();
    await page.getByText('Đã thay bài giữa buổi').first().waitFor();
    await page.getByRole('link', { name: newName, exact: true }).first().waitFor();
    await cancelCurrent();
  });

  await check('Máy tính đĩa tạ trên bài tạ đòn: thấy "Mỗi bên"', async () => {
    await page.goto(BASE + '#/lich-tap');
    const dayC = page.locator('li, div').filter({ hasText: /^Buổi C/ }).filter({ has: page.getByRole('button', { name: 'Tập', exact: true }) }).last();
    await dayC.getByRole('button', { name: 'Tập', exact: true }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    const bbCard = page.locator('section').filter({ has: page.getByRole('button', { name: 'Đĩa tạ hiệp 1' }) }).first();
    await bbCard.getByRole('button', { name: 'Đĩa tạ hiệp 1' }).click();
    const dlg = page.getByRole('dialog', { name: 'Đĩa tạ' });
    await dlg.getByLabel('Tổng tạ (kg, gồm đòn)').fill('100');
    await dlg.getByText('Mỗi bên', { exact: true }).waitFor();
    await dlg.getByText(/Mỗi bên: 25 \+ 15/).waitFor();
    await dlg.getByLabel('Tổng tạ (kg, gồm đòn)').fill('61');
    await dlg.getByRole('button', { name: 'Gần nhất: 60 kg' }).waitFor();
    await shot('15-plates');
    await dlg.getByRole('button', { name: 'Gần nhất: 60 kg' }).click();
    await waitValue(bbCard.getByLabel('Mức tạ hiệp 1'), '60');
    await cancelCurrent();
  });

  await check('Tạo giáo án mới, đổi tên; rời trang khi chưa lưu thì hỏi', async () => {
    await page.goto(BASE + '#/lich-tap?tab=programs');
    await page.getByRole('button', { name: 'Tạo giáo án mới' }).click();
    await page.getByRole('heading', { name: 'Tạo giáo án' }).waitFor();
    await page.getByLabel('Tên giáo án').fill('Giáo án thử E2E');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await page.getByText('Đã lưu giáo án').waitFor();
    const card = page.locator('section, div').filter({ hasText: 'Giáo án thử E2E' }).filter({ has: page.getByRole('button', { name: 'Sửa', exact: true }) }).last();
    await card.getByRole('button', { name: 'Sửa', exact: true }).click();
    await page.getByRole('heading', { name: 'Sửa giáo án' }).waitFor();
    await page.getByLabel('Tên giáo án').fill('Giáo án E2E đã đổi tên');
    // Bấm link điều hướng khi chưa lưu → hỏi; Hủy → ở lại
    await page.locator('nav[aria-label="Điều hướng nhanh"]').getByRole('link', { name: 'Hôm nay', exact: true }).click();
    await page.getByRole('dialog', { name: 'Có thay đổi chưa lưu. Rời trang?' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByRole('heading', { name: 'Sửa giáo án' }).waitFor();
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await page.getByText('Đã lưu giáo án').waitFor();
    await page.getByText('Giáo án E2E đã đổi tên').first().waitFor();
    assert.equal(await page.getByText('Giáo án thử E2E').count(), 0);
  });

  await check('Superset: ghép 2 bài trong giáo án, lưu, mở lại thấy A1/A2', async () => {
    await page.goto(BASE + '#/lich-tap?tab=programs');
    const card = page.locator('section, div').filter({ hasText: 'Giáo án E2E đã đổi tên' }).filter({ has: page.getByRole('button', { name: 'Sửa', exact: true }) }).last();
    await card.getByRole('button', { name: 'Sửa', exact: true }).click();
    await page.getByRole('heading', { name: 'Sửa giáo án' }).waitFor();
    for (const q of ['dead bug', 'plank']) {
      await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.getByLabel('Tìm bài tập').fill(q);
      await dlg.getByRole('listitem').getByRole('button').first().click();
      await dlg.waitFor({ state: 'detached' });
    }
    assert.equal(await page.getByTestId('program-exercise').count(), 2);
    await page.getByRole('button', { name: 'Ghép với bài dưới' }).first().click();
    await page.getByText('A1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await page.getByText('Đã lưu giáo án').waitFor();
    await card.getByRole('button', { name: 'Sửa', exact: true }).click();
    await page.getByRole('heading', { name: 'Sửa giáo án' }).waitFor();
    await page.getByText('A1', { exact: true }).waitFor();
    await page.getByText('A2', { exact: true }).waitFor();
    await page.getByLabel('Superset A').waitFor();
    await shot('14-superset');
    await page.getByRole('button', { name: 'Quay lại' }).click();
  });

  await check('Ô đang báo lỗi nhận đúng ký tự đầu tiên (v1.7.1)', async () => {
    await page.goto(BASE + '#/lich-tap/giao-an/program-default-fullbody');
    const name = page.getByLabel('Tên giáo án');
    await name.fill('');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await page.getByText('Cần tên giáo án').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-invalid')), 'true');
    await page.keyboard.type('X');
    assert.equal(await name.inputValue(), 'X');
    assert.equal(await page.getByText('Cần tên giáo án').count(), 0);
    // Rời trang không lưu: bỏ thay đổi và bản nháp
    await page.getByRole('button', { name: 'Quay lại' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Rời trang' }).click();
    await page.getByRole('heading', { name: 'Sửa giáo án' }).waitFor({ state: 'detached' });
  });

  await check('Đặt lịch một buổi tập', async () => {
    await page.goto(BASE + '#/lich-tap?tab=calendar');
    await page.getByRole('button', { name: 'Đặt lịch', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: /^Đặt lịch — / });
    await dlg.waitFor();
    await dlg.getByRole('button', { name: 'Buổi C', exact: true }).first().click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByText(/^Lịch đã đặt · /).first().waitFor();
    await page.getByRole('button', { name: 'Gỡ lịch' }).first().waitFor();
    await shot('11-schedule');
  });

  await check('"Tập lại" một buổi đã hoàn thành', async () => {
    await page.goto(BASE + '#/lich-tap?tab=history');
    await page.getByText('2 hiệp').first().click();
    await page.getByRole('button', { name: 'Tập lại' }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    assert.equal(await page.getByLabel('Mức tạ hiệp 1').first().inputValue(), '');
    assert.ok((await page.getByLabel('Mức tạ hiệp 2').count()) >= 1, 'giữ số hiệp của buổi gốc');
    await cancelCurrent();
  });

  await check('Nhập sao lưu chế độ Gộp: giữ dữ liệu mới trên máy', async () => {
    await page.goto(BASE + '#/cai-dat');
    await page.getByTestId('import-input').setInputFiles(backupPath);
    await page.getByText('Kiểm tra tệp sao lưu').waitFor();
    assert.equal(await page.getByRole('tab', { name: 'Gộp', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('dialog').getByRole('button', { name: 'Nhập' }).click();
    await page.getByRole('button', { name: 'Gộp dữ liệu' }).last().click();
    await page.getByText(/Đã nhập \d+ bản ghi/).waitFor();
    await page.goto(BASE + '#/lich-tap?tab=programs');
    await page.getByText('Giáo án E2E đã đổi tên').first().waitFor();
    await page.goto(BASE + '#/lich-tap?tab=history');
    await page.getByText('2 hiệp').first().waitFor();
  });

  await check('Nhập "1.200" vào mục tiêu calories → lưu → hiển thị 1.200 kcal', async () => {
    await page.goto(BASE + '#/cai-dat');
    await page.getByLabel('Mục tiêu calories (kcal)').fill('1.200');
    await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
    await page.goto(BASE + '#/dinh-duong');
    await page.getByText('/ 1.200 kcal').waitFor();
    await page.goto(BASE + '#/cai-dat');
    assert.equal(await page.getByLabel('Mục tiêu calories (kcal)').inputValue(), '1200');
  });

  await check('Đổi đơn vị sang lb trong Cài đặt: trang tập hiện "lb"', async () => {
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: 'lb (pound)' }).click();
    await page.getByLabel('Đòn (lb)').waitFor();
    await waitValue(page.getByLabel('Đòn (lb)'), '45');
    await page.getByRole('button', { name: 'Lưu cài đặt tập luyện' }).click();
    await page.getByText('Đã lưu cài đặt tập luyện').waitFor();
    await page.goto(BASE + '#/lich-tap');
    await page.getByRole('button', { name: /^Bắt đầu Buổi/ }).click();
    await page.getByRole('heading', { name: 'Đang tập' }).waitFor();
    await page.getByText('lb', { exact: true }).first().waitFor();
    await page.getByLabel('Mức tạ hiệp 1').first().fill('225');
    await shot('16-lb');
    await cancelCurrent();
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: 'kg', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu cài đặt tập luyện' }).click();
    await page.getByText('Đã lưu cài đặt tập luyện').waitFor();
  });

  await check('Offline: tắt mạng, tải lại — app và dữ liệu vẫn hoạt động', async () => {
    await page.goto(BASE);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    // Trang phải do service worker điều khiển (đã precache xong) trước khi tắt mạng.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor({ timeout: 10000 });
    await page.getByText('65,4').first().waitFor();
    await page.goto(BASE + '#/thu-vien');
    await page.getByText('Đẩy ngực tạ đơn').first().waitFor();
    await context.setOffline(false);
  });

  await check('Chuyển giao diện Tối (chụp Phân tích) và quay lại Sáng (lưu trên thiết bị)', async () => {
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: /Tối/ }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goto(BASE);
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor();
    await shot('09-dashboard-dark');
    await page.goto(BASE + '#/phan-tich');
    await page.getByText('Kỷ lục cá nhân (Personal Records)').waitFor();
    assert.ok((await page.locator('.recharts-surface').count()) >= 3);
    await shot('09b-analytics-dark');
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: /Sáng/ }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  });

  await check('Điều hướng gọn: 4 mục + Thêm', async () => {
    await page.goto(BASE);
    const nav = page.locator('nav[aria-label="Điều hướng nhanh"]');
    for (const n of ['Hôm nay', 'Tập', 'Cơ thể', 'Ăn uống', 'Thêm']) await nav.getByRole('link', { name: n, exact: true }).waitFor();
    await nav.getByRole('link', { name: 'Thêm', exact: true }).click();
    await page.getByRole('link', { name: /Thư viện bài tập/ }).waitFor();
    await page.getByRole('link', { name: /Phân tích/ }).waitFor();
    await shot('10-more');
  });

  await check('Desktop: thanh điều hướng bên, không tràn', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(BASE);
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor();
    await noOverflow();
    await shot('07-desktop');
  });

  await check('Không có request ra ngoài và không có lỗi console', async () => {
    assert.deepEqual(external, [], 'request ra ngoài: ' + external.join(', '));
    const real = consoleErrors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    assert.deepEqual(real, [], 'lỗi console: ' + real.join('\n'));
  });

  console.log(`\nE2E ĐẠT: ${results.length}/${results.length} bước.`);
} catch (e) {
  process.exitCode = 1;
  throw e;
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM'); // tắt cả nhóm tiến trình (npx + vite preview)
  } catch {
    server.kill();
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 200);
}
