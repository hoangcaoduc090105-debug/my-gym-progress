import { MUSCLE_LABELS, type MuscleGroup } from '../db/types';
import { cx } from './ui';

/**
 * Bản đồ cơ thể đơn giản (SVG, chạy offline): nhìn trước và nhìn sau.
 * Nhóm cơ chính tô đậm, nhóm cơ phụ tô nhạt.
 */
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'path'; d: string };

const BODY: Shape[] = [
  { kind: 'circle', cx: 50, cy: 13, r: 9 },
  { kind: 'rect', x: 46, y: 21, w: 8, h: 7, r: 2 },
  { kind: 'rect', x: 32, y: 27, w: 36, h: 62, r: 11 },
  { kind: 'rect', x: 20, y: 30, w: 11, h: 36, r: 5.5 },
  { kind: 'rect', x: 69, y: 30, w: 11, h: 36, r: 5.5 },
  { kind: 'rect', x: 18, y: 66, w: 10, h: 30, r: 5 },
  { kind: 'rect', x: 72, y: 66, w: 10, h: 30, r: 5 },
  { kind: 'rect', x: 33, y: 86, w: 34, h: 18, r: 8 },
  { kind: 'rect', x: 34, y: 100, w: 15, h: 48, r: 7 },
  { kind: 'rect', x: 51, y: 100, w: 15, h: 48, r: 7 },
  { kind: 'rect', x: 35, y: 147, w: 13, h: 42, r: 6 },
  { kind: 'rect', x: 52, y: 147, w: 13, h: 42, r: 6 },
];

const FRONT: Partial<Record<MuscleGroup, Shape[]>> = {
  shoulders: [
    { kind: 'circle', cx: 29, cy: 34, r: 7 },
    { kind: 'circle', cx: 71, cy: 34, r: 7 },
  ],
  chest: [
    { kind: 'rect', x: 35, y: 33, w: 14, h: 15, r: 5 },
    { kind: 'rect', x: 51, y: 33, w: 14, h: 15, r: 5 },
  ],
  biceps: [
    { kind: 'rect', x: 21.5, y: 42, w: 8, h: 20, r: 4 },
    { kind: 'rect', x: 70.5, y: 42, w: 8, h: 20, r: 4 },
  ],
  abs: [{ kind: 'rect', x: 41, y: 51, w: 18, h: 34, r: 4 }],
  quads: [
    { kind: 'rect', x: 36, y: 104, w: 11, h: 40, r: 5 },
    { kind: 'rect', x: 53, y: 104, w: 11, h: 40, r: 5 },
  ],
  calves: [
    { kind: 'rect', x: 37.5, y: 152, w: 8, h: 26, r: 4 },
    { kind: 'rect', x: 54.5, y: 152, w: 8, h: 26, r: 4 },
  ],
};

const BACK: Partial<Record<MuscleGroup, Shape[]>> = {
  shoulders: [
    { kind: 'circle', cx: 29, cy: 34, r: 7 },
    { kind: 'circle', cx: 71, cy: 34, r: 7 },
  ],
  back: [{ kind: 'path', d: 'M37 29 L63 29 L67 56 L58 83 L42 83 L33 56 Z' }],
  triceps: [
    { kind: 'rect', x: 21.5, y: 40, w: 8, h: 22, r: 4 },
    { kind: 'rect', x: 70.5, y: 40, w: 8, h: 22, r: 4 },
  ],
  glutes: [
    { kind: 'rect', x: 35, y: 88, w: 14, h: 16, r: 7 },
    { kind: 'rect', x: 51, y: 88, w: 14, h: 16, r: 7 },
  ],
  hamstrings: [
    { kind: 'rect', x: 36, y: 108, w: 11, h: 36, r: 5 },
    { kind: 'rect', x: 53, y: 108, w: 11, h: 36, r: 5 },
  ],
  calves: [
    { kind: 'rect', x: 36.5, y: 150, w: 10, h: 26, r: 5 },
    { kind: 'rect', x: 53.5, y: 150, w: 10, h: 26, r: 5 },
  ],
};

function draw(s: Shape, key: string, cls: string) {
  if (s.kind === 'circle') return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} className={cls} />;
  if (s.kind === 'path') return <path key={key} d={s.d} className={cls} />;
  return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} className={cls} />;
}

function Figure({ map, primary, secondary, label }: { map: Partial<Record<MuscleGroup, Shape[]>>; primary: MuscleGroup; secondary: MuscleGroup[]; label: string }) {
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 100 192" className="h-44 w-auto" role="img" aria-label={label}>
        {BODY.map((s, i) => draw(s, `b${i}`, 'fill-surface2 stroke-line'))}
        {(Object.keys(map) as MuscleGroup[]).map((m) => {
          const cls = m === primary ? 'fill-accent' : secondary.includes(m) ? 'fill-accent/35' : 'fill-line/70';
          return map[m]!.map((s, i) => draw(s, `${m}${i}`, cls));
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

export function MuscleMap({ primary, secondary, className }: { primary: MuscleGroup; secondary: MuscleGroup[]; className?: string }) {
  const sec = secondary.filter((m) => m !== primary);
  return (
    <div className={cx('rounded-2xl bg-surface2/60 p-3', className)}>
      <div className="flex justify-center gap-6">
        <Figure map={FRONT} primary={primary} secondary={sec} label="Nhìn trước" />
        <Figure map={BACK} primary={primary} secondary={sec} label="Nhìn sau" />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent" /> Cơ chính: <strong>{MUSCLE_LABELS[primary]}</strong>
        </span>
        {sec.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-accent/35" /> Cơ phụ: {sec.map((m) => MUSCLE_LABELS[m]).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
