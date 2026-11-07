import { nearestLoadable, platesPerSide, roundToLoadable, DEFAULT_PLATES_KG } from '../../src/domain/plates';
import { suggestProgression, DEFAULT_PROGRESSION } from '../../src/domain/progression';
import { set } from './fixtures';

const P = DEFAULT_PLATES_KG;

describe('platesPerSide', () => {
  it('100 kg / đòn 20 ⇒ mỗi bên [25, 15]', () => {
    expect(platesPerSide(100, 20, P)).toEqual({ perSide: [25, 15], achievedKg: 100, exact: true });
  });
  it('61 kg ⇒ không gắn chính xác; gần nhất 60 hoặc 62,5', () => {
    const r = platesPerSide(61, 20, P);
    expect(r.exact).toBe(false);
    expect(r.achievedKg).toBe(60);
    const n = nearestLoadable(61, 20, P);
    expect([60, 62.5]).toContain(n.nearest);
    expect(n.down).toBe(60);
    expect(n.up).toBe(62.5);
  });
  it('61,25 kg cần đĩa 0,625 — không có ⇒ không chính xác; 62,5 kg = [20, 1,25]', () => {
    expect(platesPerSide(62.5, 20, P)).toEqual({ perSide: [20, 1.25], achievedKg: 62.5, exact: true });
  });
  it('đòn rỗng và nhẹ hơn đòn', () => {
    expect(platesPerSide(20, 20, P)).toEqual({ perSide: [], achievedKg: 20, exact: true });
    expect(platesPerSide(15, 20, P).exact).toBe(false);
  });
  it('không tham lam sai: chỉ có đĩa 15 và 10, 60 kg ⇒ mỗi bên [10, 10]', () => {
    expect(platesPerSide(60, 20, [15, 10])).toEqual({ perSide: [10, 10], achievedKg: 60, exact: true });
  });
  it('không có đĩa 1,25 ⇒ bước nhỏ nhất là 5 kg tổng', () => {
    const noSmall = [25, 20, 15, 10, 5, 2.5];
    expect(nearestLoadable(61, 20, noSmall)).toMatchObject({ down: 60, up: 65 });
    expect(platesPerSide(62.5, 20, noSmall).exact).toBe(false);
    const loadable = [];
    for (let t = 20; t <= 40; t += 1.25) if (platesPerSide(t, 20, noSmall).exact) loadable.push(t);
    expect(loadable).toEqual([20, 25, 30, 35, 40]);
  });
});

describe('gợi ý tăng tạ với tạ đòn', () => {
  it('roundToLoadable luôn lớn hơn mức cũ và gắn được', () => {
    expect(roundToLoadable(62.75, 60, 20, P)).toBe(62.5);
    expect(roundToLoadable(60.2, 60, 20, P)).toBe(62.5);
    expect(roundToLoadable(62.5, 60, 20, [25, 20, 15, 10, 5])).toBe(70);
  });
  it('suggestProgression với barbell trả mức gắn được', () => {
    const target = { sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: 120 };
    const lastSets = [set(60, 12, 2), set(60, 12, 2), set(60, 12, 2)];
    const plain = suggestProgression({ target, lastSets, region: 'lower', isBodyweight: false, settings: { ...DEFAULT_PROGRESSION, lowerIncrementKg: 3 } });
    expect(plain).toMatchObject({ kind: 'increase', toKg: 63 });
    const bb = suggestProgression({
      target,
      lastSets,
      region: 'lower',
      isBodyweight: false,
      settings: { ...DEFAULT_PROGRESSION, lowerIncrementKg: 3 },
      barbell: { barWeightKg: 20, platesKg: [25, 20, 15, 10, 5] },
    });
    expect(bb).toMatchObject({ kind: 'increase', toKg: 60 + 10 });
    expect(platesPerSide((bb as { toKg: number }).toKg, 20, [25, 20, 15, 10, 5]).exact).toBe(true);
  });
});
