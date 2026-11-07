/**
 * Ảnh tóm tắt buổi tập (PNG 1080×1350) vẽ bằng canvas, hoàn toàn trên thiết bị — để gửi bạn bè.
 * Phần dữ liệu (summaryCardLines) thuần để test; phần vẽ cần canvas thật (không chạy trong jsdom).
 */
export interface SummaryCard {
  title: string;
  dateLabel: string;
  stats: { label: string; value: string }[];
  /** Dòng so sánh/bài tập (tối đa 6 được vẽ). */
  lines: string[];
  /** Kỷ lục mới (tối đa 4 được vẽ). */
  prs: string[];
  badge?: string | null;
}

export const MAX_LINES = 6;
export const MAX_PRS = 4;

/** Rút gọn một chuỗi theo số ký tự, thêm "…" khi cắt. */
export function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Chuẩn bị dữ liệu vẽ: cắt số dòng, cắt độ dài dòng, loại dòng rỗng. */
export function summaryCardLines(card: SummaryCard): { lines: string[]; prs: string[]; moreLines: number; morePrs: number } {
  const lines = card.lines.map((l) => l.trim()).filter(Boolean);
  const prs = card.prs.map((l) => l.trim()).filter(Boolean);
  return {
    lines: lines.slice(0, MAX_LINES).map((l) => clip(l, 44)),
    prs: prs.slice(0, MAX_PRS).map((l) => clip(l, 44)),
    moreLines: Math.max(0, lines.length - MAX_LINES),
    morePrs: Math.max(0, prs.length - MAX_PRS),
  };
}

export async function renderSummaryPng(card: SummaryCard): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ vẽ ảnh.');
  const font = (px: number, weight = 400) => `${weight} ${px}px "Be Vietnam Pro", system-ui, -apple-system, sans-serif`;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#005e68');
  g.addColorStop(1, '#0d1a1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = font(34, 600);
  ctx.fillText('MY GYM PROGRESS', 80, 110);
  if (card.badge) {
    ctx.font = font(30, 700);
    const w = ctx.measureText(card.badge).width + 40;
    ctx.fillStyle = '#f16f33';
    ctx.beginPath();
    ctx.roundRect(W - 80 - w, 72, w, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(card.badge, W - 80 - w + 20, 109);
  }

  ctx.fillStyle = '#fff';
  ctx.font = font(64, 700);
  ctx.fillText(clip(card.title, 26), 80, 220);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = font(36);
  ctx.fillText(card.dateLabel, 80, 280);

  // Ba ô số
  const stats = card.stats.slice(0, 3);
  const bw = (W - 160 - 24 * (stats.length - 1)) / Math.max(1, stats.length);
  stats.forEach((st, i) => {
    const x = 80 + i * (bw + 24);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(x, 340, bw, 190, 28);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = font(28, 500);
    ctx.fillText(st.label, x + 28, 395);
    ctx.fillStyle = '#fff';
    ctx.font = font(60, 700);
    ctx.fillText(clip(st.value, 10), x + 28, 480);
  });

  const { lines, prs, moreLines } = summaryCardLines(card);
  let y = 620;
  ctx.fillStyle = '#fff';
  ctx.font = font(36, 500);
  for (const l of lines) {
    ctx.fillText(l, 80, y);
    y += 56;
  }
  if (moreLines > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = font(30);
    ctx.fillText(`… và ${moreLines} bài khác`, 80, y);
    y += 56;
  }
  if (prs.length) {
    y += 30;
    ctx.fillStyle = '#f16f33';
    ctx.font = font(34, 700);
    ctx.fillText('🏆 KỶ LỤC MỚI', 80, y);
    y += 54;
    ctx.fillStyle = '#fff';
    ctx.font = font(34, 500);
    for (const p of prs) {
      ctx.fillText(p, 80, y);
      y += 52;
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(26);
  ctx.fillText('Ghi bằng My Gym Progress · dữ liệu lưu trên thiết bị', 80, H - 70);

  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh.'))), 'image/png'));
}
