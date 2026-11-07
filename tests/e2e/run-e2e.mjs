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
    await page.getByRole('button', { name: 'Tạo thực phẩm mới' }).click();
    await page.getByLabel('Tên *').fill('Ức gà luộc');
    await page.getByLabel('Protein (g)').fill('31');
    await page.getByLabel('Fat (g)').fill('3,6');
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click();
    await page.getByRole('button', { name: /Ức gà luộc/ }).click();
    await page.getByText('/ 105–130 g').waitFor();
    await page.getByText('Còn 74 g').waitFor();
    await page.getByText('Ước tính').first().waitFor();
    // Chấm điểm bữa: 31 g ≥ 26 g/bữa → Phù hợp
    await page.getByTestId('meal-verdict').getByText('Bữa này: Phù hợp').waitFor();
    // Nạp món cơ bản rồi thêm 1 quả trứng vào bữa trưa → bữa thiếu đạm + có gợi ý bù
    await page.getByRole('tab', { name: 'Món của tôi' }).click();
    await page.getByRole('button', { name: /món ăn sẵn \+/ }).click();
    await page.getByText(/^Trứng gà/).first().waitFor();
    await page.getByRole('tab', { name: 'Hôm nay' }).click();
    await page.getByRole('button', { name: 'Thêm món' }).nth(1).click();
    await page.getByRole('tab', { name: 'Món ăn sẵn' }).click();
    await page.getByRole('button', { name: /Cơm tấm sườn bì chả/ }).waitFor();
    await shot('05c-dishes');
    await page.getByRole('tab', { name: 'Nguyên liệu' }).click();
    await page.getByRole('button', { name: /^Trứng gà/ }).first().click();
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

  await check('Offline: tắt mạng, tải lại — app và dữ liệu vẫn hoạt động', async () => {
    await page.goto(BASE);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor({ timeout: 10000 });
    await page.getByText('65,4').first().waitFor();
    await page.goto(BASE + '#/thu-vien');
    await page.getByText('Đẩy ngực tạ đơn').first().waitFor();
    await context.setOffline(false);
  });

  await check('Chuyển giao diện Tối và quay lại Sáng (lưu trên thiết bị)', async () => {
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: /Tối/ }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goto(BASE);
    await page.getByRole('heading', { name: 'Hôm nay' }).waitFor();
    await shot('09-dashboard-dark');
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goto(BASE + '#/cai-dat');
    await page.getByRole('tab', { name: /Sáng/ }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  });

  await check('Điều hướng gọn: 4 mục + Thêm', async () => {
    await page.goto(BASE);
    const nav = page.locator('nav[aria-label="Điều hướng chính"]').last();
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
