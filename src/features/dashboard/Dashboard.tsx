import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, ChevronRight, Play, Plus, Utensils } from 'lucide-react';
import { db } from '../../db/db';
import { Button, Card, PageHeader, Spinner } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useProfile, useSettings } from '../../app/useAppData';
import { activeCompleted } from '../../domain/sets';
import { countWorkingSets } from '../../domain/volume';
import { latest, weeklyWeightChange, daysSinceLastCircumference } from '../../domain/bodyTrends';
import { nextWorkout } from '../../domain/schedule';
import { proteinProgress, sumLogs } from '../../domain/nutrition';
import { endOfWeek, formatDate, formatShort, startOfWeek, todayISO } from '../../lib/date';
import { fmt1, signed } from '../../lib/format';
import { startSession } from '../../db/repo';

/** Trang "Hôm nay": chỉ những gì cần ngay — buổi tập kế tiếp, cân nặng, protein, số buổi tuần này. */
export function Dashboard() {
  const nav = useNavigate();
  const { toastError } = useFeedback();
  const profile = useProfile();
  const settings = useSettings();
  const exMap = useExerciseMap();
  const today = todayISO();
  const data = useLiveQuery(async () => {
    const [sessions, metrics, programs, schedule, foodLogs] = await Promise.all([
      db.sessions.toArray(),
      db.bodyMetrics.toArray(),
      db.programs.toArray(),
      db.schedule.toArray(),
      db.foodLogs.where('date').equals(today).toArray(),
    ]);
    return { sessions, metrics, programs, schedule, foodLogs };
  }, [today]);
  if (!data || !exMap || !profile) return <Spinner />;

  const completed = activeCompleted(data.sessions);
  const thisWeek = completed.filter((s) => s.date >= startOfWeek(today) && s.date <= endOfWeek(today));
  const weight = latest(data.metrics, 'weightKg');
  const change = weeklyWeightChange(data.metrics, today);
  const active = data.programs.find((p) => p.isActive) ?? null;
  const next = nextWorkout({ program: active, programs: data.programs, sessions: data.sessions, schedule: data.schedule, today });
  const protein = proteinProgress(sumLogs(data.foodLogs).proteinG, profile.proteinTargetMinG, profile.proteinTargetMaxG);
  const sinceMeasure = daysSinceLastCircumference(data.metrics, today);
  const needMeasure = sinceMeasure == null || sinceMeasure >= settings.measurementReminderDays;
  const draft = data.sessions.find((s) => s.status === 'draft' && !s.deletedAt);
  const pct = Math.min(100, protein.pctOfMin);

  async function startNext() {
    if (!next) return;
    try {
      const s = await startSession({ programId: next.program.id, programDayId: next.day.id, scheduleId: next.source === 'scheduled' ? next.scheduleId : null });
      nav(`/tap/${s.id}`);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hôm nay"
        subtitle={formatDate(today)}
        action={
          <Button size="sm" variant="outline" icon={<BookOpen size={16} />} onClick={() => nav('/huong-dan')}>
            Hướng dẫn
          </Button>
        }
      />

      <section className="hero rounded-2xl p-5 shadow-card">
        <div className="inline-flex rounded-full bg-brand2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{draft ? 'Đang tập dở' : 'Buổi tập kế tiếp'}</div>
        {draft ? (
          <div className="mt-1 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xl font-bold">{draft.dayName}</div>
              <div className="text-sm text-white/80">Dữ liệu đã được lưu tự động.</div>
            </div>
            <Button variant="hero" icon={<Play size={18} />} onClick={() => nav(`/tap/${draft.id}`)}>
              Tiếp tục
            </Button>
          </div>
        ) : next ? (
          <div>
            <div className="mt-1 flex items-start gap-3">
              <div className="flex-1">
                <div className="text-2xl font-bold">{next.day.name}</div>
                <div className="text-sm text-white/80">
                  {next.day.exercises.length} bài · {next.source === 'scheduled' ? `lịch ${formatDate(next.date)}` : 'theo vòng giáo án'}
                </div>
              </div>
              <Button variant="hero" icon={<Play size={18} />} onClick={() => void startNext()}>
                Bắt đầu
              </Button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {next.day.exercises.map((e) => (
                <li key={e.id} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                  {exMap.get(e.exerciseId)?.nameVi ?? e.exerciseId}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-1 text-sm">
            Chưa có giáo án đang dùng.{' '}
            <Link className="font-semibold underline" to="/lich-tap?tab=programs">
              Chọn giáo án
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/co-the" className="rounded-2xl border border-line/70 bg-surface p-4 shadow-card">
          <div className="text-xs font-medium text-muted">Cân nặng</div>
          <div className="mt-1 text-2xl font-bold tabular">
            {weight ? fmt1(weight.value) : '—'}
            <span className="ml-1 text-sm font-medium text-muted">kg</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {change.status === 'ok' ? `${signed(change.delta)} kg so với tuần trước` : weight ? `đo ${formatShort(weight.date)}` : 'Chạm để ghi'}
          </div>
        </Link>
        <Link to="/lich-tap?tab=history" className="rounded-2xl border border-line/70 bg-surface p-4 shadow-card">
          <div className="text-xs font-medium text-muted">Buổi tập tuần này</div>
          <div className="mt-1 text-2xl font-bold tabular text-brand2-text">
            {thisWeek.length}
            <span className="ml-1 text-sm font-medium text-muted">/ 3</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">{countWorkingSets(thisWeek)} hiệp đã tập</div>
        </Link>
      </div>

      <Link to="/dinh-duong" className="block rounded-2xl border border-line/70 bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-accent" />
          <span className="flex-1 text-sm font-medium">Đạm (protein) hôm nay</span>
          <span className="text-sm font-semibold tabular">
            {fmt1(protein.consumed)} / {protein.min} g
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-brand2" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>{protein.status === 'below' ? `Còn thiếu ${fmt1(protein.remainingToMin)} g` : 'Đã đạt mục tiêu 🎉'}</span>
          <span className="flex items-center gap-1 font-medium text-accent">
            <Plus size={14} /> Ghi bữa ăn
          </span>
        </div>
      </Link>

      {needMeasure && (
        <Card className="border-warn/40">
          <div className="flex items-center gap-3">
            <Bell size={20} className="shrink-0 text-warn" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">Đến lúc đo cơ thể</div>
              <div className="text-muted">{sinceMeasure == null ? 'Bạn chưa đo vòng nào.' : `Đã ${sinceMeasure} ngày từ lần đo vòng gần nhất.`}</div>
            </div>
            <Button size="sm" onClick={() => nav('/co-the?moi=1')}>
              Ghi số đo
            </Button>
          </div>
        </Card>
      )}

      <Link to="/phan-tich" className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-4 text-sm shadow-card">
        <BarChart3 size={18} className="text-info" />
        <span className="flex-1">
          <span className="font-medium">Xem tiến bộ chi tiết</span>
          <span className="block text-xs text-muted">Sức mạnh từng bài, kỷ lục, số hiệp theo nhóm cơ</span>
        </span>
        <ChevronRight size={18} className="text-muted" />
      </Link>
    </div>
  );
}
