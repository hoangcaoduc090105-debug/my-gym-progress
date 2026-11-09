// Tạo icon PNG cho PWA từ public/icons/favicon.svg bằng Chromium (Playwright). Chạy: npm run icons
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

// Nền cho icon maskable (phần đệm quanh logo) — trùng màu nền của logo.
const MASK_BG = '#0e2a2e';
const svg = readFileSync(new URL('../public/icons/favicon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.12 },
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const inner = Math.round(t.size * (1 - t.pad * 2));
  const html = `<html><body style="margin:0;background:${MASK_BG};display:flex;align-items:center;justify-content:center;width:${t.size}px;height:${t.size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `).replace(t.pad ? 'rx="112"' : '__', 'rx="0"')}</div></body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: new URL(`../public/icons/${t.file}`, import.meta.url).pathname, omitBackground: false });
  console.log('✓', t.file);
}
await browser.close();
