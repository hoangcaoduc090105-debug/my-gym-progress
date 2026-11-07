import { useMemo } from 'react';
import { useSettings } from './useAppData';
import { fmtWeight, fmtWeightU, fromDisplay, toDisplay, type WeightUnit } from '../lib/units';

export interface Units {
  unit: WeightUnit;
  /** kg → số hiển thị. */
  show: (kg: number) => number;
  /** kg (có thể null) → số hiển thị (null giữ null) — cho NumberInput. */
  showN: (kg: number | null | undefined) => number | null;
  /** Số nhập → kg; giữ kg gốc nếu số hiển thị không đổi. */
  toKg: (value: number | null, originalKg?: number | null) => number | null;
  /** "42,5" */
  fmt: (kg: number) => string;
  /** "42,5 kg" / "93,7 lb" */
  fmtU: (kg: number) => string;
}

export function makeUnits(unit: WeightUnit): Units {
  return {
    unit,
    show: (kg) => toDisplay(kg, unit),
    showN: (kg) => (kg == null ? null : toDisplay(kg, unit)),
    toKg: (v, orig) => (v == null ? null : fromDisplay(v, unit, orig)),
    fmt: (kg) => fmtWeight(kg, unit),
    fmtU: (kg) => fmtWeightU(kg, unit),
  };
}

/** Bộ đổi đơn vị theo Cài đặt (kg/lb). */
export function useUnits(): Units {
  const { weightUnit } = useSettings();
  return useMemo(() => makeUnits(weightUnit), [weightUnit]);
}
