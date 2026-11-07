import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Pencil, Repeat, Trash2, Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { Badge, Button, Card, PageHeader, Spinner, Stat } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { softDeleteSession, startRepeatSession } from '../../db/repo';
import { activeCompleted, isWorkingSet } from '../../domain/sets';
import { countWorkingSets, totalVolume } from '../../domain/volume';
import { prTimeline } from '../../domain/records';
import { estimate1RM } from '../../domain/oneRepMax';
import { formatDate, formatDuration } from '../../lib/date';
import { fmt0, fmt1 } from '../../lib/format';

export function SessionDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const settings = useSettings();
  const exMap = useExerciseMap();
  const { confirm, toast, toastError } = useFeedback();
  const data = useLiveQuery(async () => ({ s: await db.sessions.get(id), all: await db.sessions.toArray() }), [id]);
  if (!data || !exMap) return <Spinner />;
  const s = data.s;
  if (!s || s.deletedAt) return <PageHeader title="Không tìm thấy buổi tập" back="/lich-tap?tab=history" />;
  const prs = prTimeline(activeCompleted(data.all), settings.oneRmFormula).filter((e) => e.sessionId === s.id);
  const dur = s.finishedAt ? new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime() : NaN;

  return (
    <div className="space-y-4">
      <PageHeader title={s.dayName} subtitle={formatDate(s.date)} back="/lich-tap?tab=history" />
      {params.get('xong') && (
        <Card className="border-accent/50 bg-accent/10">
          <div className="font-semibold text-accent">Đã lưu buổi tập! 💪</div>
          <div className="text-sm text-muted">Nghỉ ngơi, ăn đủ protein và ngủ đủ giấc để phục hồi.</div>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Hiệp" value={countWorkingSets([s])} />
        <Stat label="Khối lượng" value={fmt0(totalVolume([s]))} unit="kg" />
        <Stat label="Thời lượng" value={Number.isFinite(dur) && dur < 6 * 3600_000 ? formatDuration(dur) : '—'} />
      </div>
      {prs.length > 0 && (
        <Card title="Kỷ lục mới">
          <ul className="space-y-1.5 text-sm">
            {prs.map((p) => (
              <li key={p.type + p.exerciseId} className="flex items-center gap-2">
                <Trophy size={16} className="text-warn" />
                <span className="flex-1">{exMap.get(p.exerciseId)?.nameVi}</span>
                <span className="tabular">
                  {p.type === 'weight' ? 'Mức tạ' : 'e1RM'}: {fmt1(p.previous)} → <strong>{fmt1(p.value)} kg</strong>
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
                <th className="text-right font-normal">kg</th>
                <th className="text-right font-normal">Lần</th>
                <th className="text-right font-normal">RIR</th>
                <th className="text-right font-normal">e1RM</th>
              </tr>
            </thead>
            <tbody>
              {se.sets.map((x, i) => (
                <tr key={x.id} className={isWorkingSet(x) ? '' : 'text-muted line-through decoration-muted/40'}>
                  <td className="py-1">{x.isWarmup ? <Badge tone="warn">K</Badge> : i + 1}</td>
                  <td className="text-right">{fmt1(x.weightKg)}</td>
                  <td className="text-right">{x.reps ?? '—'}</td>
                  <td className="text-right">{x.rir ?? '—'}</td>
                  <td className="text-right text-muted">{isWorkingSet(x) ? fmt1(estimate1RM(x.weightKg ?? 0, x.reps ?? 0, settings.oneRmFormula)) : ''}</td>
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
