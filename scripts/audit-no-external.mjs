// Kiểm tra bản build: không có tham chiếu tới AI/LLM API hay dịch vụ bên ngoài. Thất bại => exit 1.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const FORBIDDEN = [
  /api\.anthropic\.com/i,
  /api\.openai\.com/i,
  /generativelanguage\.googleapis/i,
  /api\.mistral\.ai/i,
  /api\.cohere/i,
  /x-api-key/i,
  /\bsk-[A-Za-z0-9]{20,}/,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /google-analytics|googletagmanager/i,
  /\bsentry\.io\b/i,
];
// fetch/XHR/WebSocket/sendBeacon tới URL tuyệt đối http(s)
const NETWORK_CALL = /(fetch|sendBeacon|new\s+WebSocket|\.open)\(\s*["'`](https?:|wss?:)\/\//g;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let problems = 0;
const files = walk(DIST).filter((f) => /\.(js|html|css|webmanifest|json)$/.test(f));
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const re of FORBIDDEN) {
    if (re.test(src)) {
      console.error(`✗ ${f}: khớp mẫu cấm ${re}`);
      problems++;
    }
  }
  for (const m of src.matchAll(NETWORK_CALL)) {
    console.error(`✗ ${f}: lời gọi mạng tới URL tuyệt đối: ${m[0]}`);
    problems++;
  }
}
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!/connect-src 'self'/.test(html)) {
  console.error("✗ index.html thiếu CSP connect-src 'self'");
  problems++;
}
if (problems) {
  console.error(`\n${problems} vấn đề. Bản build KHÔNG đạt yêu cầu không kết nối ra ngoài.`);
  process.exit(1);
}
console.log(`✓ Đã quét ${files.length} tệp: không có AI API, không có lời gọi mạng ra ngoài, CSP connect-src 'self' có mặt.`);
