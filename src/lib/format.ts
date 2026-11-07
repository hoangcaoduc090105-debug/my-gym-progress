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

/** Chuyển chuỗi người dùng nhập ("62,5" hoặc "62.5") thành số; trả về null nếu không hợp lệ. */
export function parseNumber(input: string): number | null {
  const t = input.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
