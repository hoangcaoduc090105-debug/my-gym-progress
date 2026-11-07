import { stagnation } from '../../src/domain/stagnation';
import { deloadTarget, deloadWeight } from '../../src/domain/deload';
import { session, set } from './fixtures';

const S = (date: string, kg: number, reps = 8, extra = {}) => session(date, [{ exerciseId: 'bench', sets: [set(kg, reps)] }], extra);

describe('stagnation', () => {
  it('tiến bộ: buổi gần đây vượt mốc cũ => không chững', () => {
    const r = stagnation([S('2026-01-01', 60), S('2026-01-08', 60), S('2026-01-15', 60), S('2026-01-22', 62.5)], 'bench', 'epley');
    expect(r).toEqual({ stagnant: false, reason: 'progress' });
  });
  it('chững: 4 buổi, 3 buổi mới nhất không vượt buổi thứ 4 trở về trước', () => {
    const r = stagnation(
      [S('2025-12-20', 62.5), S('2026-01-01', 60), S('2026-01-08', 60), S('2026-01-15', 57.5), S('2026-01-22', 60)],
      'bench',
      'epley',
    );
    expect(r).toEqual({ stagnant: true, sessions: 4 });
    // vừa đủ 4 buổi cũng xét được
    expect(stagnation([S('2026-01-01', 60), S('2026-01-08', 60), S('2026-01-15', 60), S('2026-01-22', 60)], 'bench', 'epley').stagnant).toBe(true);
  });
  it('có buổi deload xen trong 4 buổi => không báo chững', () => {
    const r = stagnation(
      [S('2026-01-01', 60), S('2026-01-08', 60), S('2026-01-15', 36, 8, { isDeload: true }), S('2026-01-22', 60)],
      'bench',
      'epley',
    );
    expect(r).toEqual({ stagnant: false, reason: 'deload' });
  });
  it('ít hơn 4 buổi => chưa đủ dữ liệu', () => {
    expect(stagnation([S('2026-01-01', 60), S('2026-01-08', 60), S('2026-01-15', 60)], 'bench', 'epley')).toEqual({ stagnant: false, reason: 'few-sessions' });
  });
  it('bỏ buổi đã xóa / chưa xong / không có bài', () => {
    const r = stagnation(
      [
        S('2026-01-01', 60),
        S('2026-01-08', 60),
        S('2026-01-15', 60),
        S('2026-01-20', 80, 8, { deletedAt: '2026-01-21T00:00:00.000Z' }),
        S('2026-01-21', 80, 8, { status: 'draft' }),
        session('2026-01-22', [{ exerciseId: 'squat', sets: [set(100, 5)] }]),
      ],
      'bench',
      'epley',
    );
    expect(r.stagnant).toBe(false);
  });
});

describe('deload', () => {
  it('60% làm tròn 0,5 kg; tạ đòn làm tròn về mức gắn được', () => {
    expect(deloadWeight(60)).toBe(36);
    expect(deloadWeight(17)).toBe(10); // 10,2 → 10
    expect(deloadWeight(100, { barWeightKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] })).toBe(60);
    expect(deloadWeight(70, { barWeightKg: 20, platesKg: [25, 20, 15, 10, 5] })).toBe(40);
  });
  it('bớt 1 hiệp, tối thiểu 1', () => {
    expect(deloadTarget({ sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: 90 }).sets).toBe(2);
    expect(deloadTarget({ sets: 1, repMin: 8, repMax: 12, targetRIR: 2, restSec: 90 }).sets).toBe(1);
  });
});
