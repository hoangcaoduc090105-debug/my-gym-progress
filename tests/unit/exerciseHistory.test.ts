import { formatSets, historyRows, rangeStart, workingSetsOf } from '../../src/domain/exerciseHistory';
import { prTimeline } from '../../src/domain/records';
import { session, set } from './fixtures';

describe('exerciseHistory', () => {
  it('gộp hiệp của bài trong buổi (kể cả bài xuất hiện 2 lần), bỏ khởi động / chưa ✓ / bài khác', () => {
    const s = session('2026-03-01', [
      { exerciseId: 'squat', sets: [set(20, 10, 2, { isWarmup: true }), set(40, 10), set(40, 9)] },
      { exerciseId: 'bench', sets: [set(30, 8)] },
      { exerciseId: 'squat', sets: [set(40, 8), set(45, 5, 2, { done: false })] },
    ]);
    expect(workingSetsOf(s, 'squat')).toEqual([
      { weightKg: 40, reps: 10 },
      { weightKg: 40, reps: 9 },
      { weightKg: 40, reps: 8 },
    ]);
    expect(formatSets(workingSetsOf(s, 'squat'))).toBe('40×10 · 40×9 · 40×8');
    expect(formatSets([{ weightKg: 42.5, reps: 8 }])).toBe('42,5×8');
  });

  it('mới nhất trước; cùng ngày thì buổi bắt đầu sau đứng trước; bỏ buổi không có bài / đã xóa / chưa xong', () => {
    const a = session('2026-01-01', [{ exerciseId: 'squat', sets: [set(40, 10)] }]);
    const b = session('2026-02-01', [{ exerciseId: 'squat', sets: [set(42.5, 10)] }], { startedAt: '2026-02-01T08:00:00.000Z' });
    const b2 = session('2026-02-01', [{ exerciseId: 'squat', sets: [set(45, 8)] }], { startedAt: '2026-02-01T18:00:00.000Z' });
    const other = session('2026-03-01', [{ exerciseId: 'bench', sets: [set(30, 8)] }]);
    const del = session('2026-04-01', [{ exerciseId: 'squat', sets: [set(50, 8)] }], { deletedAt: '2026-04-02T00:00:00.000Z' });
    const draft = session('2026-05-01', [{ exerciseId: 'squat', sets: [set(50, 8)] }], { status: 'draft' });
    const rows = historyRows([a, b, b2, other, del, draft], 'squat', 'epley');
    expect(rows.map((r) => r.sessionId)).toEqual([b2.id, b.id, a.id]);
    expect(rows[0]!.bestE1RM).toBeCloseTo(45 * (1 + 8 / 30), 5);
  });

  it('đánh dấu PR theo PREvent (lần đầu không phải PR)', () => {
    const a = session('2026-01-01', [{ exerciseId: 'squat', sets: [set(40, 10)] }]);
    const b = session('2026-01-08', [{ exerciseId: 'squat', sets: [set(40, 8)] }]);
    const c = session('2026-01-15', [{ exerciseId: 'squat', sets: [set(45, 8)] }]);
    const prIds = new Set(prTimeline([a, b, c], 'epley').filter((e) => e.exerciseId === 'squat').map((e) => e.sessionId));
    const rows = historyRows([a, b, c], 'squat', 'epley', prIds);
    expect(rows.map((r) => [r.date, r.isPR])).toEqual([
      ['2026-01-15', true],
      ['2026-01-08', false],
      ['2026-01-01', false],
    ]);
  });

  it('rangeStart: 3 tháng / 1 năm / tất cả', () => {
    expect(rangeStart('3m', '2026-11-07')).toBe('2026-08-07');
    expect(rangeStart('1y', '2026-11-07')).toBe('2025-11-07');
    expect(rangeStart('all', '2026-11-07')).toBeUndefined();
  });
});
