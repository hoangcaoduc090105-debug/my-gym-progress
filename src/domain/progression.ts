import type { BodyRegion, ExerciseTarget, ProgressionSettings, SetEntry } from '../db/types';
import { isWorkingSet } from './sets';
import { roundToLoadable } from './plates';

export type Suggestion =
  | { kind: 'increase'; fromKg: number; toKg: number; reason: string; rirMissing: boolean }
  | { kind: 'increase-difficulty'; reason: string }
  | { kind: 'keep'; reason: string }
  | { kind: 'insufficient'; reason: string };

export const DEFAULT_PROGRESSION: ProgressionSettings = {
  minRIR: 2,
  mode: 'fixed',
  upperIncrementKg: 2.5,
  lowerIncrementKg: 5,
  percent: 5,
  roundToKg: 1.25,
};

function roundTo(n: number, step: number): number {
  if (!(step > 0)) return Math.round(n * 100) / 100;
  return Math.round(Math.round(n / step) * step * 100) / 100;
}

/**
 * Double progression: khi MỌI hiệp làm việc ở mức tạ cao nhất đạt số lần tối đa của khoảng mục tiêu
 * VÀ RIR (nếu có ghi) ≥ ngưỡng => gợi ý tăng tạ. Chỉ là gợi ý, không sửa giáo án.
 */
export function suggestProgression(params: {
  target: ExerciseTarget | null;
  lastSets: SetEntry[];
  region: BodyRegion;
  isBodyweight: boolean;
  settings: ProgressionSettings;
  /** v1.8: bài tạ đòn => làm tròn mức gợi ý về mức gắn được với đòn + đĩa đang có. */
  barbell?: { barWeightKg: number; platesKg: number[] } | null;
  /** v1.8: định dạng khối lượng trong câu gợi ý (đơn vị kg/lb). Mặc định "60 kg". */
  fmtWeightU?: (kg: number) => string;
}): Suggestion {
  const { target, region, isBodyweight, settings } = params;
  const W = params.fmtWeightU ?? ((k: number) => `${k} kg`);
  if (!target) return { kind: 'insufficient', reason: 'Bài tập chưa có mục tiêu số hiệp/số lần trong giáo án.' };
  const working = params.lastSets
    .filter(isWorkingSet)
    .map((s) => ({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0, rir: s.rir }));
  if (working.length === 0) return { kind: 'insufficient', reason: 'Chưa có dữ liệu buổi trước cho bài này.' };

  const topKg = Math.max(...working.map((s) => s.weightKg));
  const atTop = working.filter((s) => s.weightKg === topKg);

  if (atTop.length < target.sets) {
    return {
      kind: 'keep',
      reason: `Buổi trước có ${atTop.length}/${target.sets} hiệp ở mức tạ cao nhất. Hoàn thành đủ ${target.sets} hiệp trước khi tăng.`,
    };
  }
  const allAtTopReps = atTop.every((s) => s.reps >= target.repMax);
  if (!allAtTopReps) {
    const minReps = Math.min(...atTop.map((s) => s.reps));
    return {
      kind: 'keep',
      reason: `Giữ mức tạ, tăng dần số lần tới ${target.repMax} ở mọi hiệp (thấp nhất buổi trước: ${minReps}).`,
    };
  }
  const rirValues = atTop.map((s) => s.rir).filter((r): r is number => r != null);
  const rirMissing = rirValues.length < atTop.length;
  if (rirValues.length > 0 && Math.min(...rirValues) < settings.minRIR) {
    return {
      kind: 'keep',
      reason: `Đã đạt ${target.repMax} lần nhưng RIR thấp nhất là ${Math.min(...rirValues)} (< ${settings.minRIR}). Giữ mức tạ để củng cố.`,
    };
  }
  if (isBodyweight && topKg <= 0) {
    return {
      kind: 'increase-difficulty',
      reason: `Đạt ${target.repMax} lần ở mọi hiệp. Có thể thêm tạ hoặc chọn biến thể khó hơn.`,
    };
  }

  const fixedStep = region === 'lower' ? settings.lowerIncrementKg : settings.upperIncrementKg;
  let toKg: number;
  if (settings.mode === 'percent') {
    const raw = topKg * (1 + settings.percent / 100);
    toKg = roundTo(raw, settings.roundToKg);
    if (toKg <= topKg) toKg = roundTo(topKg + Math.max(settings.roundToKg, 0.5), settings.roundToKg || 0.5);
  } else {
    toKg = roundTo(topKg + fixedStep, 0.25);
  }
  if (params.barbell && params.barbell.platesKg.length > 0) {
    toKg = roundToLoadable(toKg, topKg, params.barbell.barWeightKg, params.barbell.platesKg);
  }
  return {
    kind: 'increase',
    fromKg: topKg,
    toKg,
    rirMissing,
    reason: `Mọi hiệp đạt ${target.repMax} lần ở ${W(topKg)}${rirMissing ? ' (một số hiệp chưa ghi RIR)' : ''}. Có thể thử ${W(toKg)} và quay về ${target.repMin} lần.`,
  };
}
