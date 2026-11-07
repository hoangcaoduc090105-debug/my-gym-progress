import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Dumbbell, Play, Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../../db/types';
import { Badge, Button, Card, Explain, PageHeader, Spinner, Stat, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useProfile, useSettings } from '../../app/useAppData';
import { activeCompleted } from '../../domain/sets';
import { countWorkingSets, setsByMuscle } from '../../domain/volume';
import { latest, weeklyWeightChange, daysSinceLastCircumference } from '../../domain/bodyTrends';
import { nextWorkout } from '../../domain/schedule';
import { prTimeline } from '../../domain/records';
import { addDays, endOfWeek, formatDate, formatShort, startOfWeek, todayISO } from '../../lib/date';
import { fmt1, signed } from '../../lib/format';
import { startSession } from '../../db/repo';

export function Dashboard() {
  const nav = useNavigate();
  const { toastError } = useFeedback();
  const profile = useProfile();
  const settings = useSettings();
  const exMap = useExerciseMap();
  const data = useLiveQuery(async () => {
    const [sessions, metrics, programs, schedule] = await Promise.all([
      db.sessions.toArray(),
      db.bodyMetrics.toArray(),
      db.programs.toArray(),
      db.schedule.toArray(),
    ]);
    return { sessions, metrics, programs, schedule };
  }, []);
  if (!data || !exMap || !profile) return <Spinner />;

  const today = todayISO();
  const wStart = startOfWeek(today);
  const wEnd = endOfWeek(today);
  const completed = activeCompleted(data.sessions);
  const thisWeek = completed.filter((s) => s.date >= wStart && s.date <= wEnd);
  const weekSets = countWorkingSets(thisWeek);
  const muscle = setsByMuscle(thisWeek, exMap, settings.secondaryMuscleFactor);
  const weight = latest(data.metrics, 'weightKg');
  const change = weeklyWeightChange(data.metrics, today);
  const active = data.programs.find((p) => p.isActive) ?? null;
  const next = nextWorkout({ program: active, programs: data.programs, sessions: data.sessions, schedule: data.schedule, today });
  const recentPRs = prTimeline(completed, settings.oneRmFormula)
    .filter((e) => e.date >= addDays(today, -14) && e.type === 'weight')
    .slice(-4)
    .reverse();
  const lastSession = completed[completed.length - 1];
  const sinceMeasure = daysSinceLastCircumference(data.metrics, today);
  const needMeasure = sinceMeasure == null || sinceMeasure >= settings.measurementReminderDays;
  const draft = data.sessions.find((s) => s.status === 'draft' && !s.deletedAt);

  async function startNext() {
    if (!next) return;
    try {
      const s = await startSession({
        programId: next.program.id,
        programDayId: next.day.id,
        scheduleId: next.source === 'scheduled' ? next.scheduleId : null,
      });
      nav(`/tap/${s.id}`);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tổng quan" subtitle={formatDate(today)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cân nặng hiện tại" value={weight ? fmt1(weight.value) : '—'} unit="kg" hint={weight ? `đo ${formatShort(weight.date)}` : 'chưa có dữ liệu'} />
        <Stat label="Chiều cao" value={fmt1(profile.heightCm)} unit="cm" />
        <Stat
          label="Thay đổi trong tuần"
          value={change.status === 'ok' ? signed(change.delta) : '—'}
          unit={change.status === 'ok' ? 'kg' : undefined}
          hint={change.status === 'ok' ? 'TB 7 ngày so với 7 ngày trước' : `cần ≥${change.needed} lần cân/tuần`}
        />
        <Stat label="Buổi tập tuần này" value={thisWeek.length} hint={`${weekSets} hiệp làm việc`} tone={thisWeek.length > 0 ? 'accent' : undefined} />
      </div>

      <Card title="Buổi tập kế tiếp">
        {draft ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{draft.dayName}</div>
              <div className="text-sm text-muted">Đang tập dở — dữ liệu đã được lưu tự động.</div>
            </div>
            <Button variant="primary" icon={<Play size={18} />} onClick={() => nav(`/tap/${draft.id}`)}>
              Tiếp tục
            </Button>
          </div>
        ) : next ? (
          <div>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-lg font-semibold">{next.day.name}</div>
                <div className="text-sm text-muted">
                  {next.program.name}
                  {next.source === 'scheduled' ? ` · đã đặt lịch ${formatDate(next.date)}` : ' · theo vòng giáo án'}
                </div>
              </div>
              <Button variant="primary" icon={<Play size={18} />} onClick={() => void startNext()}>
                Bắt đầu
              </Button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {next.day.exercises.map((e) => (
                <li key={e.id}>
                  <Badge>{exMap.get(e.exerciseId)?.nameVi ?? e.exerciseId}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-muted">
            Chưa có giáo án đang dùng.{' '}
            <Link className="text-accent" to="/lich-tap">
              Chọn giáo án
            </Link>
          </div>
        )}
      </Card>

      <Card title="Nhóm cơ đã tập tuần này" action={<span className="text-xs text-muted">số hiệp</span>}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {MUSCLE_GROUPS.map((m) => (
            <div key={m} className={cx('flex items-center justify-between rounded-xl px-3 py-2 text-sm', muscle[m] > 0 ? 'bg-accent/10' : 'bg-surface2')}>
              <span className={muscle[m] > 0 ? 'text-text' : 'text-muted'}>{MUSCLE_LABELS[m]}</span>
              <span className={cx('font-semibold tabular', muscle[m] > 0 ? 'text-accent' : 'text-muted')}>{fmt1(muscle[m])}</span>
            </div>
          ))}
        </div>
        <Explain>
          <p>Chỉ đếm hiệp làm việc (đã ✓, không phải khởi động) của các buổi đã hoàn thành trong tuần (Thứ Hai–Chủ Nhật).</p>
          <p>Nhóm cơ chính của bài: +1 hiệp. Mỗi nhóm cơ phụ: +{fmt1(settings.secondaryMuscleFactor)} hiệp (chỉnh trong Cài đặt).</p>
        </Explain>
      </Card>

      <Card title="Tiến độ gần đây">
        {completed.length === 0 ? (
          <div className="text-sm text-muted">Chưa có buổi tập nào. Hoàn thành buổi đầu tiên để bắt đầu theo dõi.</div>
        ) : (
          <div className="space-y-3">
            {lastSession && (
              <Link to={`/lich-tap/buoi/${lastSession.id}`} className="flex items-center gap-3 rounded-xl bg-surface2 p-3">
                <Dumbbell size={18} className="text-muted" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Buổi gần nhất: {lastSession.dayName}</div>
                  <div className="text-muted">
                    {formatDate(lastSession.date)} · {countWorkingSets([lastSession])} hiệp
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            )}
            {recentPRs.length > 0 ? (
              <ul className="space-y-1.5">
                {recentPRs.map((p) => (
                  <li key={`${p.sessionId}-${p.exerciseId}`} className="flex items-center gap-2 text-sm">
                    <Trophy size={16} className="text-warn" />
                    <span className="flex-1">{exMap.get(p.exerciseId)?.nameVi}</span>
                    <span className="tabular text-muted">
                      {fmt1(p.previous)} → <span className="font-semibold text-text">{fmt1(p.value)} kg</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted">Chưa có kỷ lục mức tạ mới trong 14 ngày qua.</div>
            )}
          </div>
        )}
      </Card>

      {needMeasure && (
        <Card className="border-warn/40">
          <div className="flex items-center gap-3">
            <Bell size={20} className="shrink-0 text-warn" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">Nhắc ghi nhận số đo cơ thể</div>
              <div className="text-muted">
                {sinceMeasure == null ? 'Bạn chưa ghi số đo vòng nào.' : `Đã ${sinceMeasure} ngày kể từ lần đo vòng gần nhất.`} Nên đo mỗi{' '}
                {settings.measurementReminderDays} ngày, cùng điều kiện (buổi sáng, trước ăn).
              </div>
            </div>
            <Button size="sm" onClick={() => nav('/co-the?moi=1')}>
              Ghi số đo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
