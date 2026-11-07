const nf1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export const fmt1 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : nf1.format(n));
export const fmt0 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : nf0.format(n));
export const fmt2 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : nf2.format(n));

export function signed(n: number, digits = 1): string {
  const s = n.toFixed(digits).replace('.', ',');
  return n > 0 ? `+${s}` : s;
}

/**
 * Chuyển chuỗi người dùng nhập thành số theo thói quen gõ của người Việt:
 * - "62,5" và "62.5" → 62.5
 * - "1.200", "1 200", "1.200,5" → 1200, 1200, 1200.5 (dấu chấm/khoảng trắng đi với đúng 3 chữ số là phân cách nghìn)
 * - "1,200" → 1.2 (dấu phẩy luôn là dấu thập phân)
 * Trả về null nếu không hợp lệ.
 */
export function parseNumber(input: string): number | null {
  let t = input.replace(/\s+/g, '');
  if (t === '') return null;
  if (t.includes(',')) {
    const parts = t.split(',');
    if (parts.length !== 2) return null;
    t = `${parts[0]!.replace(/\./g, '')}.${parts[1]!}`;
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
