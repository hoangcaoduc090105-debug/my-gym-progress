import { Suspense, lazy, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, Trophy } from 'lucide-react';
import { ExerciseTechnique } from './ExerciseTechnique';
import { db } from '../../db/db';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../../db/types';
import { Badge, Button, Card, PageHeader, Spinner, Tabs } from '../../components/ui';
const ExerciseHistoryList = lazy(() => import('./ExerciseHistory'));
import { useFeedback } from '../../components/feedback';
import { useSettings } from '../../app/useAppData';
import { useUnits } from '../../app/useUnits';
import { deleteCustomExercise } from '../../db/repo';
import { activeCompleted } from '../../domain/sets';
import { recordsByExercise, strengthSeries } from '../../domain/records';
import { formatDate, formatShort } from '../../lib/date';

export function ExerciseDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const settings = useSettings();
  const u = useUnits();
  const { confirm, toast, toastError } = useFeedback();
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const data = useLiveQuery(async () => {
    const ex = await db.exercises.get(id);
    const alts = ex ? (await db.exercises.bulkGet(ex.alternativeIds)).filter((x) => !!x) : [];
    const sessions = activeCompleted(await db.sessions.toArray());
    return { ex: ex ?? null, alts, sessions };
  }, [id]);
  if (!data) return <Spinner />;
  const { ex, alts, sessions } = data;
  if (!ex) return <PageHeader title="Không tìm thấy bài tập" back="/thu-vien" />;
  const rec = recordsByExercise(sessions, settings.oneRmFormula).get(ex.id);
  const series = strengthSeries(sessions, ex.id, settings.oneRmFormula).slice(-6).reverse();

  return (
    <div className="space-y-4">
      <PageHeader title={ex.nameVi} subtitle={ex.nameEn} back={true} />
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="accent">Chính: {MUSCLE_LABELS[ex.primaryMuscle]}</Badge>
        {ex.secondaryMuscles.map((m) => (
          <Badge key={m}>Phụ: {MUSCLE_LABELS[m]}</Badge>
        ))}
        <Badge tone="info">{EQUIPMENT_LABELS[ex.equipment]}</Badge>
        {ex.isCustom && <Badge tone="info">Tự tạo</Badge>}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Tổng quan' },
          { value: 'history', label: 'Lịch sử' },
        ]}
      />
      {tab === 'history' ? (
        <Card>
          <Suspense fallback={<Spinner />}>
            <ExerciseHistoryList exerciseId={ex.id} formula={settings.oneRmFormula} />
          </Suspense>
        </Card>
      ) : (
      <>

      <Card title="Hướng dẫn kỹ thuật">
        <ExerciseTechnique ex={ex} />
      </Card>
      {alts.length > 0 && (
        <Card title="Bài tập thay thế">
          <div className="flex flex-wrap gap-2">
            {alts.map((a) => (
              <Link key={a!.id} to={`/thu-vien/${a!.id}`} className="rounded-xl bg-surface2 px-3 py-2 text-sm hover:bg-line">
                {a!.nameVi}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card title="Lịch sử của bạn">
        {!rec ? (
          <p className="text-sm text-muted">Chưa tập bài này.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface2 p-3">
                <div className="text-xs text-muted">Mức tạ cao nhất</div>
                <div className="flex items-center gap-1 text-lg font-bold tabular">
                  <Trophy size={16} className="text-brand2-text" />
                  {rec.heaviest ? `${u.fmtU(rec.heaviest.weightKg)} × ${rec.heaviest.reps}` : '—'}
                </div>
                {rec.heaviest && <div className="text-xs text-muted">{formatDate(rec.heaviest.date)}</div>}
              </div>
              <div className="rounded-xl bg-surface2 p-3">
                <div className="text-xs text-muted">e1RM ước tính tốt nhất</div>
                <div className="text-lg font-bold tabular">{rec.bestE1RM ? u.fmtU(rec.bestE1RM.value) : '—'}</div>
                <div className="text-xs text-muted">{rec.bestE1RM ? `từ ${u.fmt(rec.bestE1RM.weightKg)}×${rec.bestE1RM.reps}` : 'cần hiệp ≤ 10 lần'}</div>
              </div>
            </div>
            <table className="w-full tabular">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-normal">Ngày</th>
                  <th className="text-right font-normal">Tạ max ({u.unit})</th>
                  <th className="text-right font-normal">e1RM</th>
                  <th className="text-right font-normal">Khối lượng</th>
                </tr>
              </thead>
              <tbody>
                {series.map((p) => (
                  <tr key={p.date}>
                    <td className="py-1">{formatShort(p.date)}</td>
                    <td className="text-right">{u.fmt(p.maxWeight)}</td>
                    <td className="text-right">{p.e1rm == null ? '—' : u.fmt(p.e1rm)}</td>
                    <td className="text-right">{u.fmt(p.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link to="/phan-tich" className="text-xs text-info">
              Xem biểu đồ trong Phân tích →
            </Link>
          </div>
        )}
      </Card>

      </>
      )}

      {ex.source && <p className="text-xs text-muted">Nguồn tham khảo kỹ thuật: {ex.source}. Hướng dẫn mang tính tham khảo, không thay thế huấn luyện viên.</p>}

      {ex.isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Pencil size={16} />} onClick={() => nav(`/thu-vien/${ex.id}/sua`)}>
            Sửa
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={async () => {
              if (!(await confirm({ title: 'Xóa bài tập tự tạo?', message: 'Chỉ xóa được khi bài chưa có trong lịch sử hoặc giáo án.', danger: true, confirmText: 'Xóa' }))) return;
              try {
                await deleteCustomExercise(ex.id);
                toast('Đã xóa bài tập');
                nav('/thu-vien', { replace: true });
              } catch (e) {
                toastError(e);
              }
            }}
          >
            Xóa
          </Button>
        </div>
      )}
    </div>
  );
}
