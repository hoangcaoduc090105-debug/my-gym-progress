import type { BodyField, BodyMetric } from '../db/types';
import { addDays, diffDays, monthKey, startOfWeek } from '../lib/date';
import { THRESHOLDS } from './thresholds';

export interface Point {
  date: string;
  value: number;
}

export function seriesOf(metrics: BodyMetric[], field: BodyField): Point[] {
  // Cùng ngày: sắp theo thời điểm ghi để "lần đo mới nhất" là lần ghi sau cùng.
  return metrics
    .filter((m) => !m.deletedAt)
    .map((m) => ({ date: m.date, value: m[field], at: m.createdAt ?? '' }))
    .filter((p): p is Point & { at: string } => typeof p.value === 'number' && Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at))
    .map(({ date, value }) => ({ date, value }));
}

export function latest(metrics: BodyMetric[], field: BodyField): Point | null {
  const s = seriesOf(metrics, field);
  return s.length ? s[s.length - 1]! : null;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export type WeeklyChange =
  | { status: 'ok'; currentAvg: number; previousAvg: number; delta: number; currentCount: number; previousCount: number }
  | { status: 'insufficient'; currentCount: number; previousCount: number; needed: number };

/** So sánh trung bình 7 ngày gần nhất với 7 ngày trước đó. Cần ≥2 lần cân mỗi cửa sổ. */
export function weeklyWeightChange(metrics: BodyMetric[], today: string): WeeklyChange {
  const s = seriesOf(metrics, 'weightKg');
  const cur = s.filter((p) => p.date > addDays(today, -7) && p.date <= today);
  const prev = s.filter((p) => p.date > addDays(today, -14) && p.date <= addDays(today, -7));
  const needed = THRESHOLDS.minWeighInsPerWeek;
  if (cur.length < needed || prev.length < needed) {
    return { status: 'insufficient', currentCount: cur.length, previousCount: prev.length, needed };
  }
  const currentAvg = avg(cur.map((p) => p.value));
  const previousAvg = avg(prev.map((p) => p.value));
  return {
    status: 'ok',
    currentAvg: round2(currentAvg),
    previousAvg: round2(previousAvg),
    delta: round2(currentAvg - previousAvg),
    currentCount: cur.length,
    previousCount: prev.length,
  };
}

export type Granularity = 'day' | 'week' | 'month';

export interface AggPoint {
  key: string;
  value: number;
  count: number;
  min: number;
  max: number;
}

/** Gom theo ngày/tuần/tháng: giá trị = trung bình các lần đo trong kỳ. */
export function aggregate(points: Point[], g: Granularity): AggPoint[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const key = g === 'day' ? p.date : g === 'week' ? startOfWeek(p.date) : monthKey(p.date);
    groups.set(key, [...(groups.get(key) ?? []), p.value]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({ key, value: round2(avg(vals)), count: vals.length, min: Math.min(...vals), max: Math.max(...vals) }));
}

export type Trend =
  | { status: 'ok'; slopePerWeek: number; points: number; spanDays: number; first: Point; last: Point }
  | { status: 'insufficient'; points: number; spanDays: number; reason: string };

/** Hồi quy tuyến tính bình phương tối thiểu; độ dốc quy đổi ra đơn vị/tuần. */
export function linearTrend(points: Point[]): Trend {
  const n = points.length;
  const spanDays = n >= 2 ? diffDays(points[n - 1]!.date, points[0]!.date) : 0;
  if (n < THRESHOLDS.minTrendPoints) {
    return { status: 'insufficient', points: n, spanDays, reason: `Cần ít nhất ${THRESHOLDS.minTrendPoints} lần đo (hiện có ${n}).` };
  }
  if (spanDays < THRESHOLDS.minTrendSpanDays) {
    return {
      status: 'insufficient',
      points: n,
      spanDays,
      reason: `Các lần đo cần trải dài ít nhất ${THRESHOLDS.minTrendSpanDays} ngày (hiện ${spanDays} ngày).`,
    };
  }
  const x0 = points[0]!.date;
  const xs = points.map((p) => diffDays(p.date, x0));
  const ys = points.map((p) => p.value);
  const mx = avg(xs);
  const my = avg(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;
  return { status: 'ok', slopePerWeek: round2(slopePerDay * 7), points: n, spanDays, first: points[0]!, last: points[n - 1]! };
}

export function daysSinceLastCircumference(metrics: BodyMetric[], today: string): number | null {
  const fields: BodyField[] = ['chestCm', 'waistCm', 'shouldersCm', 'armCm', 'thighCm', 'calfCm'];
  const dates = metrics
    .filter((m) => !m.deletedAt && fields.some((f) => typeof m[f] === 'number' && (m[f] as number) > 0))
    .map((m) => m.date)
    .sort();
  if (dates.length === 0) return null;
  return diffDays(today, dates[dates.length - 1]!);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
