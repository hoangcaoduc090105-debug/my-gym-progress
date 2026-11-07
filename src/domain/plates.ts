/**
 * Máy tính đĩa tạ (thuần). Tính bằng gram nguyên để tránh sai số dấu phẩy động.
 * Mỗi loại đĩa dùng không giới hạn số cặp (một đĩa mỗi bên = một cặp).
 */
export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
/** Đĩa có thể bật/tắt trong Cài đặt (kg). */
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

const g = (kg: number) => Math.round(kg * 1000);
const kg = (grams: number) => Math.round(grams) / 1000;

interface Dp {
  /** count[s] = số đĩa ít nhất để một bên nặng đúng s gram (Infinity = không gắn được). */
  count: Float64Array;
  /** pick[s] = đĩa cuối cùng (gram) trong cách gắn tốt nhất. */
  pick: Int32Array;
  unit: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Bảng quy hoạch động cho tổng mỗi bên tới `maxSideG` (gram), bước = ƯCLN các đĩa. */
function buildDp(platesG: number[], maxSideG: number): Dp {
  const plates = [...new Set(platesG.filter((p) => p > 0))].sort((a, b) => b - a);
  const unit = plates.reduce((a, b) => gcd(a, b), 0) || 1;
  const n = Math.floor(maxSideG / unit) + 1;
  const count = new Float64Array(n).fill(Infinity);
  const pick = new Int32Array(n).fill(-1);
  count[0] = 0;
  for (let i = 1; i < n; i++) {
    for (const p of plates) {
      const k = p / unit;
      if (k > i) continue;
      const c = count[i - k]! + 1;
      // Ít đĩa hơn thắng; bằng nhau thì giữ đĩa lớn hơn (duyệt từ lớn → nhỏ nên giữ lựa chọn đầu).
      if (c < count[i]!) {
        count[i] = c;
        pick[i] = p;
      }
    }
  }
  return { count, pick, unit };
}

function compose(dp: Dp, sideG: number): number[] {
  const out: number[] = [];
  let i = Math.round(sideG / dp.unit);
  while (i > 0 && dp.pick[i]! > 0) {
    const p = dp.pick[i]!;
    out.push(kg(p));
    i -= p / dp.unit;
  }
  return out.sort((a, b) => b - a);
}

/** Mức tổng (kg) gắn được ngay dưới / ngay trên `totalKg` (null nếu không có). */
export function nearestLoadable(totalKg: number, barKg: number, platesKg: number[]): { down: number | null; up: number | null; nearest: number } {
  const bar = g(barKg);
  const t = g(totalKg);
  if (t <= bar) return { down: t === bar ? barKg : null, up: barKg, nearest: barKg };
  const platesG = platesKg.map(g);
  const maxP = Math.max(0, ...platesG);
  const side = (t - bar) / 2;
  const dp = buildDp(platesG, Math.ceil(side) + maxP);
  const ok = (sG: number) => sG % dp.unit === 0 && Number.isFinite(dp.count[sG / dp.unit]!);
  let down: number | null = null;
  for (let s = Math.floor(side / dp.unit) * dp.unit; s >= 0; s -= dp.unit) {
    if (ok(s)) {
      down = kg(bar + 2 * s);
      break;
    }
  }
  let up: number | null = null;
  for (let s = Math.ceil(side / dp.unit) * dp.unit; s <= side + maxP; s += dp.unit) {
    if (ok(s)) {
      up = kg(bar + 2 * s);
      break;
    }
  }
  const nearest = down == null ? (up ?? barKg) : up == null ? down : totalKg - down <= up - totalKg ? down : up;
  return { down, up, nearest };
}

/**
 * Đĩa mỗi bên cho tổng `totalKg` (gồm đòn). Gắn đúng được => exact; không thì trả cách gắn của mức
 * gắn được ngay dưới. Ít đĩa nhất, ưu tiên đĩa lớn.
 */
export function platesPerSide(totalKg: number, barKg: number, platesKg: number[]): { perSide: number[]; achievedKg: number; exact: boolean } {
  const bar = g(barKg);
  const t = g(totalKg);
  if (t <= bar) return { perSide: [], achievedKg: barKg, exact: t === bar };
  const r = nearestLoadable(totalKg, barKg, platesKg);
  const exact = r.down != null && g(r.down) === t;
  const targetKg = r.down ?? barKg;
  const sideG = (g(targetKg) - bar) / 2;
  const platesG = platesKg.map(g);
  const dp = buildDp(platesG, sideG);
  return { perSide: compose(dp, sideG), achievedKg: targetKg, exact };
}

/** Làm tròn mức tạ gợi ý về mức gắn được; luôn > `aboveKg` (để gợi ý tăng thật sự là tăng). */
export function roundToLoadable(kgWanted: number, aboveKg: number, barKg: number, platesKg: number[]): number {
  const r = nearestLoadable(kgWanted, barKg, platesKg);
  if (r.nearest > aboveKg) return r.nearest;
  if (r.up != null && r.up > aboveKg) return r.up;
  const next = nearestLoadable(aboveKg + 0.001, barKg, platesKg).up;
  return next ?? kgWanted;
}
