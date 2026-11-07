import { kcalFromMacros, proteinProgress, suggestProteinRange, sumLogs } from '../../src/domain/nutrition';
import type { FoodLog } from '../../src/db/types';

const log = (servings: number, isVerified: boolean): FoodLog => ({
  id: Math.random().toString(),
  date: '2026-11-07',
  meal: 'lunch',
  foodId: 'f',
  servings,
  createdAt: '',
  food: { name: 'x', servingLabel: '100 g', kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6, isVerified },
});

describe('nutrition', () => {
  it('cộng macro theo khẩu phần và đánh dấu ước tính', () => {
    const t = sumLogs([log(1.5, true), log(1, false)]);
    expect(t.proteinG).toBe(77.5);
    expect(t.kcal).toBe(412.5);
    expect(t.hasEstimates).toBe(true);
    expect(sumLogs([log(1, true)]).hasEstimates).toBe(false);
  });
  it('tiến độ protein', () => {
    expect(proteinProgress(52.5, 105, 130)).toMatchObject({ pctOfMin: 50, remainingToMin: 52.5, status: 'below' });
    expect(proteinProgress(120, 105, 130).status).toBe('inRange');
    expect(proteinProgress(140, 105, 130).status).toBe('above');
  });
  it('gợi ý protein 1,6–2,0 g/kg làm tròn 5 g: 65 kg => 105–130 g', () => {
    expect(suggestProteinRange(65)).toEqual({ min: 105, max: 130 });
    expect(suggestProteinRange(10)).toBeNull();
  });
  it('kcal từ macro 4/4/9', () => {
    expect(kcalFromMacros(30, 50, 10)).toBe(410);
  });
});
