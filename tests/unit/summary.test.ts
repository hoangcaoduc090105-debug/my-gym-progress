import { previousComparable, sessionSummary } from '../../src/domain/summary';
import { session, set } from './fixtures';

const dayA = { programId: 'p', programDayId: 'day-a', dayName: 'Buổi A' };
const dayB = { programId: 'p', programDayId: 'day-b', dayName: 'Buổi B' };

describe('sessionSummary (v1.9)', () => {
  it('lần đầu: không có buổi trước, mọi bài là bài mới', () => {
    const cur = session('2026-11-07', [{ exerciseId: 'goblet-squat', sets: [set(20, 10), set(20, 10)] }], dayA);
    const r = sessionSummary(cur, [cur]);
    expect(r.previous).toBeNull();
    expect(r.volumeKg).toBe(400);
    expect(r.sets).toBe(2);
    expect(r.newExerciseIds).toEqual(['goblet-squat']);
    expect(r.deltas).toEqual([]);
  });

  it('hơn buổi trước: % khối lượng, chênh hiệp, bài tăng tạ', () => {
    const prev = session('2026-11-03', [{ exerciseId: 'goblet-squat', sets: [set(20, 10), set(20, 10)] }], dayA);
    const cur = session('2026-11-07', [{ exerciseId: 'goblet-squat', sets: [set(22.5, 10), set(22.5, 10), set(22.5, 8)] }], dayA);
    const r = sessionSummary(cur, [prev, cur]);
    expect(r.previous?.id).toBe(prev.id);
    expect(r.volumeKg).toBe(630);
    expect(r.volumePct).toBe(58); // (630-400)/400
    expect(r.setsDiff).toBe(1);
    expect(r.deltas[0]).toMatchObject({ exerciseId: 'goblet-squat', topKg: 22.5, prevTopKg: 20, trend: 'up' });
  });

  it('kém buổi trước: trend down; bài mới được liệt kê riêng', () => {
    const prev = session('2026-11-03', [{ exerciseId: 'goblet-squat', sets: [set(22.5, 10)] }], dayA);
    const cur = session('2026-11-07', [
      { exerciseId: 'goblet-squat', sets: [set(20, 10)] },
      { exerciseId: 'push-up', sets: [set(0, 15)] },
    ], dayA);
    const r = sessionSummary(cur, [prev, cur]);
    expect(r.deltas[0]?.trend).toBe('down');
    expect(r.newExerciseIds).toEqual(['push-up']);
    expect(r.volumePct).toBe(-11); // (200-225)/225
  });

  it('chỉ so với buổi cùng ngày giáo án; bỏ qua deload và buổi sau; không có programDayId thì so theo tên', () => {
    const a1 = session('2026-11-01', [{ exerciseId: 'goblet-squat', sets: [set(20, 10)] }], dayA);
    const b1 = session('2026-11-03', [{ exerciseId: 'goblet-squat', sets: [set(40, 10)] }], dayB);
    const aDeload = session('2026-11-05', [{ exerciseId: 'goblet-squat', sets: [set(12, 10)] }], { ...dayA, isDeload: true });
    const cur = session('2026-11-07', [{ exerciseId: 'goblet-squat', sets: [set(22.5, 10)] }], dayA);
    const later = session('2026-11-09', [{ exerciseId: 'goblet-squat', sets: [set(30, 10)] }], dayA);
    expect(previousComparable(cur, [a1, b1, aDeload, cur, later])?.id).toBe(a1.id);
    const free1 = session('2026-11-02', [{ exerciseId: 'push-up', sets: [set(0, 10)] }], { dayName: 'Tự do' });
    const free2 = session('2026-11-08', [{ exerciseId: 'push-up', sets: [set(0, 12)] }], { dayName: 'Tự do' });
    expect(previousComparable(free2, [free1, free2, cur])?.id).toBe(free1.id);
  });

  it('buổi trước toàn hiệp 0 kg => volumePct null, setsDiff vẫn tính', () => {
    const prev = session('2026-11-03', [{ exerciseId: 'push-up', sets: [set(0, 10)] }], dayA);
    const cur = session('2026-11-07', [{ exerciseId: 'push-up', sets: [set(0, 12), set(0, 10)] }], dayA);
    const r = sessionSummary(cur, [prev, cur]);
    expect(r.volumePct).toBeNull();
    expect(r.setsDiff).toBe(1);
    expect(r.deltas[0]?.trend).toBe('same');
  });
});
