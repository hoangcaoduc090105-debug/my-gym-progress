import { prTimeline, recordsByExercise, strengthSeries } from '../../src/domain/records';
import { session, set } from './fixtures';

const sessions = [
  session('2026-10-01', [{ exerciseId: 'db-bench-press', sets: [set(20, 10), set(20, 8)] }]),
  session('2026-10-04', [{ exerciseId: 'db-bench-press', sets: [set(22.5, 8), set(20, 12)] }]),
  session('2026-10-08', [{ exerciseId: 'db-bench-press', sets: [set(22.5, 6)] }]),
];

describe('records', () => {
  it('mức tạ cao nhất, e1RM, khối lượng hiệp tốt nhất', () => {
    const r = recordsByExercise(sessions, 'epley').get('db-bench-press')!;
    expect(r.heaviest).toMatchObject({ weightKg: 22.5, reps: 8, date: '2026-10-04' });
    // 20×12 => vượt 10 lần nên không tính e1RM; 22.5×8 = 28.5
    expect(r.bestE1RM).toMatchObject({ value: 28.5, date: '2026-10-04' });
    expect(r.bestSetVolume?.value).toBe(240);
    expect(r.totalSets).toBe(5);
  });

  it('lần tập đầu tiên không phải PR; buổi sau vượt mốc là PR', () => {
    const ev = prTimeline(sessions, 'epley');
    expect(ev.filter((e) => e.date === '2026-10-01')).toHaveLength(0);
    expect(ev.find((e) => e.type === 'weight')).toMatchObject({ date: '2026-10-04', value: 22.5, previous: 20 });
    expect(ev.filter((e) => e.date === '2026-10-08')).toHaveLength(0);
  });

  it('chuỗi sức mạnh theo buổi', () => {
    const s = strengthSeries(sessions, 'db-bench-press', 'epley');
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ date: '2026-10-01', maxWeight: 20, volume: 360 });
  });
});
