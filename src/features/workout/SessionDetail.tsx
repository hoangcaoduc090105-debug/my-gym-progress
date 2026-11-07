import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ImageDown, Minus, Pencil, Repeat, Trash2, Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { Badge, Button, Card, PageHeader, Spinner, Stat } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { useUnits } from '../../app/useUnits';
import { softDeleteSession, startRepeatSession } from '../../db/repo';
import { activeCompleted, isWorkingSet } from '../../domain/sets';
import { countWorkingSets, totalVolume } from '../../domain/volume';
import { prTimeline } from '../../domain/records';
import { sessionSummary } from '../../domain/summary';
import { estimate1RM } from '../../domain/oneRepMax';
import { formatDate, formatDuration, formatShort } from '../../lib/date';
import { downloadText, stampedName } from '../../lib/download';
import { fmt0, fmt1, signed } from '../../lib/format';

export function SessionDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const settings = useSettings();
  const u = useUnits();
  const exMap = useExerciseMap();
  const { confirm, toast, toastError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const data = useLiveQuery(async () => ({ s: await db.sessions.get(id), all: await db.sessions.toArray() }), [id]);
  if (!data || !exMap) return <Spinner />;
  const s = data.s;
  if (!s || s.deletedAt) return <PageHeader title="Không tìm thấy buổi tập" back="/lich-tap?tab=history" />;
  const prs = prTimeline(activeCompleted(data.all), settings.oneRmFormula).filter((e) => e.sessionId === s.id);
  const fmtE = (v: number | null) => (v == null ? fmt1(null) : u.fmt(v));
  const dur = s.finishedAt ? new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime() : NaN;
  const durLabel = Number.isFinite(dur) && dur < 6 * 3600_000 ? formatDuration(dur) : '—';
  const done = s.status === 'completed';
  // v1.9: so với buổi trước cùng ngày giáo án (hoặc cùng tên buổi); buổi deload không được so.
  const sum = done && !s.isDeload ? sessionSummary(s, data.all) : null;
  const nameOf = (exId: string) => exMap.get(exId)?.nameVi ?? exId;
  const topOf = (exId: string) => Math.max(0, ...s.exercises.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets.filter(isWorkingSet).map((x) => x.weightKg ?? 0)));

  async function saveImage() {
    if (!s) return;
    setSaving(true);
    try {
      const { renderSummaryPng } = await import('../../lib/summaryImage');
      const lines = sum
        ? [
            ...sum.deltas.map((d) => `${d.trend === 'up' ? '↑' : d.trend === 'down' ? '↓' : '→'} ${nameOf(d.exerciseId)}: ${u.fmtU(d.topKg)}`),
            ...sum.newExerciseIds.map((exId) => `• ${nameOf(exId)}: ${u.fmtU(topOf(exId))}`),
          ]
        : s.exercises.map((e) => `• ${nameOf(e.exerciseId)}: ${e.sets.filter(isWorkingSet).length} hiệp`);
      const blob = await renderSummaryPng({
        title: s.dayName,
        dateLabel: `${formatDate(s.date)}${sum?.previous ? ` · ${sum.volumePct == null ? '' : `${signed(sum.volumePct, 0)}% `}so với ${formatShort(sum.previous.date)}` : ''}`,
        stats: [
          { label: 'Hiệp', value: String(countWorkingSets([s])) },
          { label: `Khối lượng (${u.unit})`, value: fmt0(u.show(totalVolume([s]))) },
          { label: 'Thời lượng', value: durLabel },
        ],
        lines,
        prs: prs.map((p) => `${nameOf(p.exerciseId)}: ${p.type === 'weight' ? 'mức tạ' : 'e1RM'} ${u.fmtU(p.value)}`),
        badge: s.isDeload ? 'DELOAD' : prs.length ? `${prs.length} PR` : null,
      });
      downloadText(stampedName('buoi-tap', 'png'), blob, 'image/png');
      toast('Đã lưu ảnh tóm tắt');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={s.dayName}
        subtitle={
          <span className="flex items-center gap-2">
            {formatDate(s.date)}
            {s.isDeload && <Badge tone="warn">DELOAD</Badge>}
          </span>
        }
        back="/lich-tap?tab=history"
        action={
          done ? (
            <Button size="sm" variant="outline" icon={<ImageDown size={16} />} disabled={saving} onClick={() => void saveImage()}>
              Lưu ảnh tóm tắt
            </Button>
          ) : undefined
        }
      />
      {params.get('xong') && (
        <Card className="border-accent/50 bg-accent/10">
          <div className="font-semibold text-accent">Đã lưu buổi tập! 💪</div>
          <div className="text-sm text-muted">Nghỉ ngơi, ăn đủ protein và ngủ đủ giấc để phục hồi.</div>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Hiệp" value={countWorkingSets([s])} hint={sum?.setsDiff != null && sum.setsDiff !== 0 ? `${signed(sum.setsDiff, 0)} so với lần trước` : undefined} />
        <Stat
          label="Khối lượng"
          value={fmt0(u.show(totalVolume([s])))}
          unit={u.unit}
          tone={sum?.volumePct == null ? undefined : sum.volumePct > 0 ? 'ok' : sum.volumePct < 0 ? 'warn' : undefined}
          hint={sum?.volumePct != null ? `${signed(sum.volumePct, 0)}% so với lần trước` : undefined}
        />
        <Stat label="Thời lượng" value={durLabel} />
      </div>
      {sum && (
        <Card title="So với lần trước" id="so-sanh">
          {sum.previous ? (
            <>
              <p className="mb-2 text-xs text-muted">
                Buổi{' '}
                <Link to={`/lich-tap/buoi/${sum.previous.id}`} className="text-accent underline">
                  {formatShort(sum.previous.date)}
                </Link>
                : {sum.previous.sets} hiệp · {u.fmtU(sum.previous.volumeKg)}.
              </p>
              <ul className="space-y-1.5 text-sm" data-testid="exercise-deltas">
                {sum.deltas.map((d) => (
                  <li key={d.exerciseId} className="flex items-center gap-2">
                    {d.trend === 'up' ? <ArrowUpRight size={16} className="shrink-0 text-ok" /> : d.trend === 'down' ? <ArrowDownRight size={16} className="shrink-0 text-warn" /> : <Minus size={16} className="shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1 truncate">{nameOf(d.exerciseId)}</span>
                    <span className="tabular text-muted">
                      {u.fmt(d.prevTopKg)} → <strong className="text-text">{u.fmtU(d.topKg)}</strong>
                    </span>
                  </li>
                ))}
                {sum.newExerciseIds.map((exId) => (
                  <li key={exId} className="flex items-center gap-2 text-muted">
                    <Badge tone="info">Mới</Badge>
                    <span className="min-w-0 flex-1 truncate">{nameOf(exId)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">Lần đầu tập buổi này — lần sau app sẽ so sánh tạ và khối lượng với hôm nay.</p>
          )}
        </Card>
      )}
      {prs.length > 0 && (
        <Card title="Kỷ lục mới">
          <ul className="space-y-1.5 text-sm">
            {prs.map((p) => (
              <li key={p.type + p.exerciseId} className="flex items-center gap-2">
                <Trophy size={16} className="text-brand2-text" />
                <span className="flex-1">{exMap.get(p.exerciseId)?.nameVi}</span>
                <span className="tabular">
                  {p.type === 'weight' ? 'Mức tạ' : 'e1RM'}: {u.fmt(p.previous)} → <strong>{u.fmtU(p.value)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {s.exercises.map((se) => (
        <Card key={se.id}>
          <div className="mb-2 font-semibold">{exMap.get(se.exerciseId)?.nameVi ?? se.exerciseId}</div>
          <table className="w-full text-sm tabular">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 text-left font-normal">Hiệp</th>
                <th className="text-right font-normal">{u.unit}</th>
                <th className="text-right font-normal">Lần</th>
                <th className="text-right font-normal">RIR</th>
                <th className="text-right font-normal">e1RM</th>
              </tr>
            </thead>
            <tbody>
              {se.sets.map((x, i) => (
                <tr key={x.id} className={isWorkingSet(x) ? '' : 'text-muted line-through decoration-muted/40'}>
                  <td className="py-1">{x.isWarmup ? <Badge tone="warn">K</Badge> : i + 1}</td>
                  <td className="text-right">{x.weightKg == null ? '—' : u.fmt(x.weightKg)}</td>
                  <td className="text-right">{x.reps ?? '—'}</td>
                  <td className="text-right">{x.rir ?? '—'}</td>
                  <td className="text-right text-muted">{isWorkingSet(x) ? fmtE(estimate1RM(x.weightKg ?? 0, x.reps ?? 0, settings.oneRmFormula)) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {se.note && <p className="mt-2 rounded-lg bg-surface2 p-2 text-sm text-muted">{se.note}</p>}
        </Card>
      ))}
      {s.notes && (
        <Card title="Ghi chú">
          <p className="whitespace-pre-line text-sm">{s.notes}</p>
        </Card>
      )}
      <p className="text-xs text-muted">e1RM ước tính theo công thức {settings.oneRmFormula === 'epley' ? 'Epley' : 'Brzycki'}, chỉ tính với hiệp ≤ 10 lần.</p>
      <div className="grid grid-cols-3 gap-2">
        <Button icon={<Pencil size={16} />} onClick={() => nav(`/tap/${s.id}`)}>
          Sửa
        </Button>
        <Button
          icon={<Repeat size={16} />}
          onClick={async () => {
            try {
              const n = await startRepeatSession(s.id);
              nav(`/tap/${n.id}`);
            } catch (e) {
              toastError(e);
            }
          }}
        >
          Tập lại
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 size={16} />}
          onClick={async () => {
            if (await confirm({ title: 'Xóa buổi tập?', message: 'Buổi tập được chuyển vào Thùng rác và có thể khôi phục trong Cài đặt.', confirmText: 'Xóa', danger: true })) {
              await softDeleteSession(s.id).catch(toastError);
              toast('Đã chuyển vào Thùng rác');
              nav('/lich-tap?tab=history', { replace: true });
            }
          }}
        >
          Xóa
        </Button>
      </div>
    </div>
  );
}
