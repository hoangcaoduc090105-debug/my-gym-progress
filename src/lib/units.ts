/**
 * Đơn vị khối lượng hiển thị (v1.8). LƯU TRỮ LUÔN LÀ KG — chỉ đổi lúc hiển thị và lúc nhập.
 * 1 lb = 0,45359237 kg (định nghĩa quốc tế, 1959).
 */
import { fmt1 } from './format';

export type WeightUnit = 'kg' | 'lb';
export const KG_PER_LB = 0.45359237;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** kg → số hiển thị theo đơn vị (làm tròn 1 chữ số thập phân). */
export function toDisplay(kg: number, unit: WeightUnit = 'kg'): number {
  return unit === 'lb' ? round1(kg / KG_PER_LB) : round1(kg);
}

/**
 * Số người dùng nhập (theo đơn vị) → kg để lưu.
 * `originalKg`: giá trị kg đang lưu của ô đó — nếu người dùng không đổi số hiển thị thì GIỮ NGUYÊN kg gốc
 * (không "trôi" 60 → 132,3 lb → 60,01 kg). Không có gốc thì làm tròn 0,01 kg.
 */
export function fromDisplay(value: number, unit: WeightUnit = 'kg', originalKg?: number | null): number {
  if (originalKg != null && toDisplay(originalKg, unit) === value) return originalKg;
  return unit === 'lb' ? round2(value * KG_PER_LB) : value;
}

export function unitLabel(unit: WeightUnit = 'kg'): WeightUnit {
  return unit;
}

/** "220,5" (không kèm đơn vị). */
export function fmtWeight(kg: number, unit: WeightUnit = 'kg'): string {
  return fmt1(toDisplay(kg, unit));
}

/** "220,5 lb". */
export function fmtWeightU(kg: number, unit: WeightUnit = 'kg'): string {
  return `${fmtWeight(kg, unit)} ${unit}`;
}

/** Đòn và đĩa mặc định theo đơn vị — lưu dưới dạng kg tương ứng. */
export const LB_BAR = 45;
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];
export const STANDARD_LB_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25];
export const lbToKg = (lb: number) => lb * KG_PER_LB;
