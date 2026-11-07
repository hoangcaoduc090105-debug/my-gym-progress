// In kích thước gzip của từng chunk trong dist/assets (dùng node:zlib, không thêm thư viện). Chạy sau `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist', import.meta.url).pathname;
const ASSETS = join(DIST, 'assets');
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entry = html.match(/assets\/(index-[\w-]+\.js)/)?.[1];
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB';
const rows = readdirSync(ASSETS)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => {
    const buf = readFileSync(join(ASSETS, f));
    return { f, raw: statSync(join(ASSETS, f)).size, gz: gzipSync(buf, { level: 9 }).length };
  })
  .sort((a, b) => b.gz - a.gz);
console.log('chunk'.padEnd(48), '     raw', '    gzip');
for (const r of rows) console.log(`${r.f === entry ? '* ' : '  '}${r.f.padEnd(46)} ${kb(r.raw)} ${kb(r.gz)}`);
const woff2 = readdirSync(ASSETS).filter((f) => f.endsWith('.woff2'));
const main = rows.find((r) => r.f === entry);
console.log(`\n* chunk chính: ${entry} — ${main ? (main.gz / 1024).toFixed(1) : '?'} KB gzip (${main?.gz ?? '?'} B)`);
console.log(`Tệp woff2: ${woff2.length}`);
