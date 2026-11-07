import { streakShown, weeklyStreak } from '../../src/domain/streak';

// 2026-11-07 là Thứ Bảy; tuần hiện tại bắt đầu Thứ Hai 2026-11-02.
const d = (s: string) => ({ date: s });

describe('weeklyStreak (v1.9)', () => {
  it('không có buổi: 0 tuần, tuần này 0/3', () => {
    expect(weeklyStreak([], 3, '2026-11-07')).toEqual({ weeks: 0, thisWeek: { done: 0, target: 3 }, thisWeekMet: false });
  });

  it('3 tuần trước đều đủ, tuần này chưa đủ => chuỗi 3, hiển thị 3 (tuần dở không làm đứt)', () => {
    const s = [
      ...['2026-10-12', '2026-10-14', '2026-10-16'],
      ...['2026-10-19', '2026-10-21', '2026-10-23'],
      ...['2026-10-26', '2026-10-28', '2026-10-30'],
      '2026-11-03',
    ].map(d);
    const r = weeklyStreak(s, 3, '2026-11-07');
    expect(r.weeks).toBe(3);
    expect(r.thisWeek).toEqual({ done: 1, target: 3 });
    expect(streakShown(r)).toBe(3);
  });

  it('tuần này đủ => hiển thị +1; một tuần thiếu ở giữa làm đứt chuỗi', () => {
    const s = [
      ...['2026-10-12', '2026-10-14', '2026-10-16'], // đủ, nhưng bị tuần 19/10 (chỉ 2 buổi) chặn
      ...['2026-10-19', '2026-10-21'],
      ...['2026-10-26', '2026-10-28', '2026-10-30'],
      ...['2026-11-02', '2026-11-04', '2026-11-06'],
    ].map(d);
    const r = weeklyStreak(s, 3, '2026-11-07');
    expect(r.weeks).toBe(1);
    expect(r.thisWeekMet).toBe(true);
    expect(streakShown(r)).toBe(2);
  });

  it('mục tiêu tối thiểu 1; buổi cùng ngày đếm riêng từng buổi', () => {
    const r = weeklyStreak(['2026-10-30', '2026-10-30'].map(d), 0, '2026-11-07');
    expect(r.thisWeek.target).toBe(1);
    expect(r.weeks).toBe(1);
  });
});
