import { warmupSets } from '../../src/domain/warmup';
import { KG_PER_LB, toDisplay } from '../../src/lib/units';

const bar20 = { barWeightKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] };

describe('warmupSets (v1.9)', () => {
  it('tạ đòn 100 kg: 40/60/80 kg, mỗi bậc gắn được, isWarmup và chưa done', () => {
    const w = warmupSets(100, { barbell: bar20 }, () => 'x');
    expect(w.map((s) => [s.weightKg, s.reps])).toEqual([
      [40, 8],
      [60, 5],
      [80, 3],
    ]);
    expect(w.every((s) => s.isWarmup && !s.done && s.rir === null)).toBe(true);
  });

  it('tạ đòn nhẹ (40 kg): bậc dưới đòn trống thành đòn trống, bậc trùng bị bỏ', () => {
    const w = warmupSets(40, { barbell: bar20 });
    // 16 → 20 (đòn trống), 24 → 25 (mức gắn được gần nhất), 32 → 32,5
    expect(w.map((s) => s.weightKg)).toEqual([20, 25, 32.5]);
    expect(warmupSets(25, { barbell: bar20 }).map((s) => s.weightKg)).toEqual([20]); // 10→20, 15→20 trùng, 20→20 trùng
  });

  it('tạ đơn/máy (kg): làm tròn 2,5 kg, bỏ bậc ≥ tạ làm việc', () => {
    expect(warmupSets(30).map((s) => s.weightKg)).toEqual([12.5, 17.5, 25]);
    expect(warmupSets(5).map((s) => s.weightKg)).toEqual([2.5]); // 2→2,5; 3→2,5 trùng; 4→5 ≥ 5 bỏ
  });

  it('đơn vị lb: làm tròn 2,5 lb', () => {
    const work = 50 * KG_PER_LB; // 50 lb
    const w = warmupSets(work, { unit: 'lb' });
    expect(w.map((s) => toDisplay(s.weightKg ?? 0, 'lb'))).toEqual([20, 30, 40]);
  });

  it('trọng lượng cơ thể: 1 hiệp 8 lần không tạ; tạ 0 mà không phải bodyweight thì rỗng', () => {
    expect(warmupSets(0, { isBodyweight: true }).map((s) => [s.weightKg, s.reps])).toEqual([[0, 8]]);
    expect(warmupSets(0)).toEqual([]);
  });
});
