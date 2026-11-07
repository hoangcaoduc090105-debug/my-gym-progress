import { aggregate, latest, daysSinceLastCircumference, linearTrend, seriesOf, weeklyWeightChange } from '../../src/domain/bodyTrends';
import type { BodyMetric } from '../../src/db/types';

const m = (date: string, v: Partial<BodyMetric>): BodyMetric => ({
  id: date + JSON.stringify(v),
  date,
  createdAt: date,
  updatedAt: date,
  ...v,
});

describe('bodyTrends', () => {
  it('thay đổi tuần cần ≥ 2 lần cân mỗi cửa sổ', () => {
    const data = [m('2026-11-01', { weightKg: 65 }), m('2026-11-06', { weightKg: 65.4 })];
    const r = weeklyWeightChange(data, '2026-11-07');
    expect(r.status).toBe('insufficient');
  });

  it('so sánh trung bình 7 ngày', () => {
    const data = [
      m('2026-10-25', { weightKg: 65 }),
      m('2026-10-28', { weightKg: 65.2 }),
      m('2026-11-02', { weightKg: 65.4 }),
      m('2026-11-06', { weightKg: 65.6 }),
    ];
    const r = weeklyWeightChange(data, '2026-11-07');
    expect(r).toMatchObject({ status: 'ok', previousAvg: 65.1, currentAvg: 65.5, delta: 0.4 });
  });

  it('bỏ qua bản ghi đã xóa và trường trống', () => {
    const data = [m('2026-11-01', { weightKg: 65 }), m('2026-11-02', { weightKg: 99, deletedAt: 'x' }), m('2026-11-03', { waistCm: 78 })];
    expect(seriesOf(data, 'weightKg')).toHaveLength(1);
  });

  it('nhiều lần đo cùng ngày: lấy lần ghi sau cùng', () => {
    const a = { ...m('2026-11-07', { weightKg: 65.4 }), id: 'a', createdAt: '2026-11-07T10:00:00Z' };
    const b = { ...m('2026-11-07', { weightKg: 65 }), id: 'b', createdAt: '2026-11-07T08:00:00Z' };
    expect(latest([a, b], 'weightKg')?.value).toBe(65.4);
    expect(latest([b, a], 'weightKg')?.value).toBe(65.4);
  });

  it('gom theo tuần và tháng lấy trung bình', () => {
    const pts = [
      { date: '2026-11-02', value: 64 },
      { date: '2026-11-04', value: 66 },
      { date: '2026-11-10', value: 70 },
    ];
    expect(aggregate(pts, 'week')).toEqual([
      { key: '2026-11-02', value: 65, count: 2, min: 64, max: 66 },
      { key: '2026-11-09', value: 70, count: 1, min: 70, max: 70 },
    ]);
    expect(aggregate(pts, 'month')[0]).toMatchObject({ key: '2026-11', count: 3 });
  });

  it('xu hướng: không đủ điểm hoặc không đủ ngày => insufficient', () => {
    expect(linearTrend([{ date: '2026-11-01', value: 80 }, { date: '2026-11-20', value: 79 }]).status).toBe('insufficient');
    expect(
      linearTrend([
        { date: '2026-11-01', value: 80 },
        { date: '2026-11-03', value: 79 },
        { date: '2026-11-05', value: 79 },
      ]).status,
    ).toBe('insufficient');
  });

  it('xu hướng tuyến tính: giảm 0,5 cm mỗi tuần', () => {
    const t = linearTrend([
      { date: '2026-10-01', value: 80 },
      { date: '2026-10-08', value: 79.5 },
      { date: '2026-10-15', value: 79 },
      { date: '2026-10-22', value: 78.5 },
    ]);
    expect(t).toMatchObject({ status: 'ok', slopePerWeek: -0.5, points: 4, spanDays: 21 });
  });

  it('ngày kể từ lần đo vòng gần nhất', () => {
    expect(daysSinceLastCircumference([m('2026-11-01', { weightKg: 65 })], '2026-11-07')).toBeNull();
    expect(daysSinceLastCircumference([m('2026-10-24', { waistCm: 78 })], '2026-11-07')).toBe(14);
  });
});
