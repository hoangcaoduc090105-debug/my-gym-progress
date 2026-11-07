import { countWorkingSets, setsByMuscle, totalVolume, weeklyBuckets } from '../../src/domain/volume';
import { exMap, session, set } from './fixtures';

describe('volume & sets', () => {
  const s1 = session('2026-11-02', [
    { exerciseId: 'db-bench-press', sets: [set(20, 10), set(20, 9), set(10, 12, null, { isWarmup: true }), set(20, 8, 2, { done: false })] },
    { exerciseId: 'push-up', sets: [set(0, 15)] },
  ]);

  it('chỉ đếm hiệp làm việc (done, không khởi động, reps > 0)', () => {
    expect(countWorkingSets([s1])).toBe(3);
  });

  it('khối lượng = Σ kg × lần, bỏ qua 0 kg', () => {
    expect(totalVolume([s1])).toBe(20 * 10 + 20 * 9);
  });

  it('nhóm cơ chính +1, nhóm cơ phụ × hệ số', () => {
    const c = setsByMuscle([s1], exMap, 0.5);
    // bench: chest 2, triceps 1, shoulders 1; push-up: chest 1, triceps .5, shoulders .5, abs .5
    expect(c.chest).toBe(3);
    expect(c.triceps).toBe(1.5);
    expect(c.shoulders).toBe(1.5);
    expect(c.abs).toBe(0.5);
    expect(c.quads).toBe(0);
  });

  it('hệ số nhóm cơ phụ = 0 thì chỉ tính nhóm chính', () => {
    const c = setsByMuscle([s1], exMap, 0);
    expect(c.triceps).toBe(0);
    expect(c.chest).toBe(3);
  });

  it('gom theo tuần Thứ Hai–CN, có tuần trống', () => {
    const s2 = session('2026-11-16', [{ exerciseId: 'db-curl', sets: [set(10, 10)] }]);
    const b = weeklyBuckets([s1, s2], '2026-11-04', '2026-11-18');
    expect(b.map((x) => x.weekStart)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(b.map((x) => x.sessions)).toEqual([1, 0, 1]);
    expect(b[0]!.sets).toBe(3);
  });

  it('hiệp reps = null không được tính', () => {
    const s = session('2026-11-03', [{ exerciseId: 'db-curl', sets: [set(10, null)] }]);
    expect(countWorkingSets([s])).toBe(0);
  });
});
