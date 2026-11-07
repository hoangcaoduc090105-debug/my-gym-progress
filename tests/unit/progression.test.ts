import { DEFAULT_PROGRESSION, roundUpToLbStep, suggestProgression } from '../../src/domain/progression';
import { KG_PER_LB, toDisplay } from '../../src/lib/units';
import type { ExerciseTarget } from '../../src/db/types';
import { set } from './fixtures';

const target: ExerciseTarget = { sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: 90 };
const base = { target, region: 'upper' as const, isBodyweight: false, settings: DEFAULT_PROGRESSION };

describe('suggestProgression (double progression)', () => {
  it('đủ hiệp, đạt repMax, RIR ≥ ngưỡng => gợi ý tăng 2,5 kg (thân trên)', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12, 2), set(20, 12, 2), set(20, 12, 3)] });
    expect(r).toMatchObject({ kind: 'increase', fromKg: 20, toKg: 22.5 });
  });
  it('thân dưới tăng 5 kg', () => {
    const r = suggestProgression({ ...base, region: 'lower', lastSets: [set(60, 12), set(60, 12), set(60, 12)] });
    expect(r).toMatchObject({ kind: 'increase', toKg: 65 });
  });
  it('chưa đạt repMax ở mọi hiệp => giữ mức tạ', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12), set(20, 11), set(20, 10)] });
    expect(r.kind).toBe('keep');
  });
  it('thiếu hiệp => giữ', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12), set(20, 12)] });
    expect(r.kind).toBe('keep');
  });
  it('RIR thấp hơn ngưỡng => giữ, không ép tập tới thất bại', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12, 2), set(20, 12, 1), set(20, 12, 0)] });
    expect(r.kind).toBe('keep');
  });
  it('không ghi RIR => vẫn gợi ý nhưng đánh dấu rirMissing', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12, null), set(20, 12, null), set(20, 12, null)] });
    expect(r).toMatchObject({ kind: 'increase', rirMissing: true });
  });
  it('chế độ % làm tròn theo bước', () => {
    const r = suggestProgression({
      ...base,
      settings: { ...DEFAULT_PROGRESSION, mode: 'percent', percent: 5, roundToKg: 1.25 },
      lastSets: [set(40, 12), set(40, 12), set(40, 12)],
    });
    expect(r).toMatchObject({ kind: 'increase', toKg: 42.5 });
  });
  it('chế độ % với tạ nhẹ vẫn tăng ít nhất 1 bước', () => {
    const r = suggestProgression({
      ...base,
      settings: { ...DEFAULT_PROGRESSION, mode: 'percent', percent: 2, roundToKg: 1.25 },
      lastSets: [set(5, 12), set(5, 12), set(5, 12)],
    });
    expect(r.kind).toBe('increase');
    if (r.kind === 'increase') expect(r.toKg).toBeGreaterThan(5);
  });
  it('bài trọng lượng cơ thể 0 kg => gợi ý tăng độ khó', () => {
    const r = suggestProgression({ ...base, isBodyweight: true, lastSets: [set(0, 12), set(0, 12), set(0, 12)] });
    expect(r.kind).toBe('increase-difficulty');
  });
  it('không có dữ liệu / không có mục tiêu', () => {
    expect(suggestProgression({ ...base, lastSets: [] }).kind).toBe('insufficient');
    expect(suggestProgression({ ...base, target: null, lastSets: [set(20, 12)] }).kind).toBe('insufficient');
  });
  it('bỏ qua hiệp khởi động và hiệp chưa hoàn thành', () => {
    const r = suggestProgression({
      ...base,
      lastSets: [set(10, 15, 4, { isWarmup: true }), set(20, 12), set(20, 12), set(20, 12), set(20, 3, 0, { done: false })],
    });
    expect(r.kind).toBe('increase');
  });
});

describe('gợi ý tăng tạ khi dùng lb (v1.8.2)', () => {
  const lb = (x: number) => x * KG_PER_LB;
  it('roundUpToLbStep: về bội số 2,5 lb và luôn lớn hơn mức cũ', () => {
    expect(toDisplay(roundUpToLbStep(lb(230.5), lb(225)), 'lb')).toBe(230);
    expect(toDisplay(roundUpToLbStep(lb(226), lb(225)), 'lb')).toBe(227.5);
    // làm tròn xuống rơi đúng mức cũ => đẩy lên một bước
    expect(toDisplay(roundUpToLbStep(lb(225.4), lb(225)), 'lb')).toBe(227.5);
  });
  it('tạ đơn 225 lb + 2,5 kg => gợi ý 230 lb, không phải 230,5', () => {
    const top = lb(225);
    const r = suggestProgression({ ...base, unit: 'lb', lastSets: [set(top, 12), set(top, 12), set(top, 12)] });
    expect(r.kind).toBe('increase');
    if (r.kind === 'increase') {
      expect(toDisplay(r.toKg, 'lb')).toBe(230);
      expect(r.toKg).toBeGreaterThan(top);
    }
  });
  it('thân dưới 100 lb + 5 kg => 110 lb', () => {
    const top = lb(100);
    const r = suggestProgression({ ...base, unit: 'lb', region: 'lower', lastSets: [set(top, 12), set(top, 12), set(top, 12)] });
    if (r.kind === 'increase') expect(toDisplay(r.toKg, 'lb')).toBe(110);
    else throw new Error(r.kind);
  });
  it('kg (mặc định) không đổi hành vi; tạ đòn ưu tiên đĩa thật kể cả khi unit lb', () => {
    const r = suggestProgression({ ...base, lastSets: [set(20, 12), set(20, 12), set(20, 12)] });
    expect(r).toMatchObject({ kind: 'increase', toKg: 22.5 });
    const bar = { barWeightKg: lb(45), platesKg: [45, 35, 25, 10, 5, 2.5].map(lb) };
    const top = lb(135);
    const b = suggestProgression({ ...base, unit: 'lb', barbell: bar, lastSets: [set(top, 12), set(top, 12), set(top, 12)] });
    if (b.kind === 'increase') expect(toDisplay(b.toKg, 'lb')).toBe(140);
    else throw new Error(b.kind);
  });
});
