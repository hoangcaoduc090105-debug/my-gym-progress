import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2, LineChart as LineIcon } from 'lucide-react';

import { useResolvedTheme, type ResolvedTheme } from '../lib/theme';

/**
 * Bảng màu biểu đồ đã kiểm định bằng validate_palette (dataviz) cho từng nền:
 * - Sáng (nền #ffffff): #059669, #2563eb — PASS dải sáng, chroma, CVD ΔE 24,9, tương phản ≥ 3:1.
 * - Tối (nền #121821): #7a9a10, #2b88c4 — PASS dải sáng, chroma, CVD ΔE 23,2, tương phản ≥ 3:1.
 */
const PALETTE: Record<ResolvedTheme, { series: [string, string]; grid: string; axis: string; surface: string; muted: string }> = {
  light: { series: ['#059669', '#2563eb'], grid: '#e8eeed', axis: '#6b7280', surface: '#ffffff', muted: '#cbd5d3' },
  dark: { series: ['#7a9a10', '#2b88c4'], grid: '#1f2836', axis: '#8a97a8', surface: '#121821', muted: '#3b4656' },
};
function usePalette() {
  return PALETTE[useResolvedTheme()];
}

export interface Datum {
  label: string;
  [k: string]: number | string | null;
}

export interface SeriesDef {
  key: string;
  name: string;
  unit: string;
}

function TooltipBox({ active, payload, label, series }: { active?: boolean; payload?: { dataKey: string; value: number | null; color: string }[]; label?: string; series: SeriesDef[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface2 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-text">{label}</div>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {s?.name}: <span className="font-semibold text-text tabular">{p.value == null ? '—' : p.value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} {s?.unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: SeriesDef[] }) {
  const SERIES = usePalette().series;
  if (series.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted">
      {series.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function DataTable({ data, series }: { data: Datum[]; series: SeriesDef[] }) {
  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full text-sm tabular">
        <thead className="sticky top-0 bg-surface text-xs text-muted">
          <tr>
            <th className="py-1 text-left font-normal">Thời điểm</th>
            {series.map((s) => (
              <th key={s.key} className="text-right font-normal">
                {s.name} ({s.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.label} className="border-t border-line/50">
              <td className="py-1">{d.label}</td>
              {series.map((s) => (
                <td key={s.key} className="text-right">
                  {d[s.key] == null ? '—' : Number(d[s.key]).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Khung biểu đồ + nút chuyển sang bảng số liệu (để không phụ thuộc màu sắc). */
export function ChartFrame({ data, series, children, height = 220 }: { data: Datum[]; series: SeriesDef[]; children: ReactNode; height?: number }) {
  const [table, setTable] = useState(false);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <Legend series={series} />
        <button type="button" className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-text" onClick={() => setTable((t) => !t)}>
          {table ? <LineIcon size={14} /> : <Table2 size={14} />} {table ? 'Biểu đồ' : 'Bảng'}
        </button>
      </div>
      {table ? <DataTable data={data} series={series} /> : <div style={{ height }}>{children}</div>}
    </div>
  );
}

export function TrendLineChart({ data, series, height, zeroBased = false }: { data: Datum[]; series: SeriesDef[]; height?: number; zeroBased?: boolean }) {
  const { series: SERIES, grid: GRID, axis: AXIS, surface } = usePalette();
  return (
    <ChartFrame data={data} series={series} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis stroke={AXIS} tickLine={false} axisLine={false} width={44} domain={zeroBased ? [0, 'auto'] : ['auto', 'auto']} allowDecimals />
          <Tooltip content={<TooltipBox series={series} />} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={SERIES[i]}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: surface, fill: SERIES[i] }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: surface }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SimpleBarChart({
  data,
  series,
  height,
  horizontal = false,
  highlight,
}: {
  data: Datum[];
  series: SeriesDef;
  height?: number;
  horizontal?: boolean;
  highlight?: (d: Datum) => boolean;
}) {
  const { series: SERIES, grid: GRID, axis: AXIS, muted } = usePalette();
  return (
    <ChartFrame data={data} series={[series]} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, bottom: 0, left: horizontal ? 8 : -12 }} barCategoryGap={4}>
          <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" stroke={AXIS} tickLine={false} axisLine={false} allowDecimals />
              <YAxis type="category" dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} width={72} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
              <YAxis stroke={AXIS} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
            </>
          )}
          <Tooltip content={<TooltipBox series={[series]} />} cursor={{ fill: 'rgba(127,127,127,0.08)' }} />
          <Bar dataKey={series.key} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.label} fill={highlight && !highlight(d) ? muted : SERIES[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
