import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, History, Pencil, Play, Plus, Trash2, Zap } from 'lucide-react';
import { db } from '../../db/db';
import type { Program, ScheduledWorkout, WorkoutSession } from '../../db/types';
import { Badge, Button, Card, EmptyState, IconButton, Modal, PageHeader, Spinner, Tabs, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { addSchedule, deleteProgram, duplicateProgram, removeSchedule, setActiveProgram, startSession } from '../../db/repo';
import { nextWorkout } from '../../domain/schedule';
import { countWorkingSets, totalVolume } from '../../domain/volume';
import { activeCompleted } from '../../domain/sets';
import { addDays, formatDate, formatDuration, parseISODate, startOfWeek, toISODate, todayISO } from '../../lib/date';
import { fmt0 } from '../../lib/format';

type Tab = 'start' | 'calendar' | 'programs' | 'history';

export function WorkoutHome() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'start';
  const data = useLiveQuery(async () => {
    const [programs, sessions, schedule] = await Promise.all([db.programs.toArray(), db.sessions.toArray(), db.schedule.toArray()]);
    return { programs, sessions, schedule };
  }, []);
  if (!data) return <Spinner />;
  return (
    <div>
      <PageHeader title="Lịch tập" subtitle="Giáo án, lịch theo ngày và nhật ký buổi tập" />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'start', label: 'Bắt đầu' },
          { value: 'calendar', label: 'Lịch' },
          { value: 'programs', label: 'Giáo án' },
          { value: 'history', label: 'Lịch sử' },
        ]}
      />
      {tab === 'start' && <StartTab {...data} />}
      {tab === 'calendar' && <CalendarTab {...data} />}
      {tab === 'programs' && <ProgramsTab programs={data.programs} />}
      {tab === 'history' && <HistoryTab sessions={data.sessions} />}
    </div>
  );
}

function useStarter() {
  const nav = useNavigate();
  const { toastError } = useFeedback();
  return async (p: Parameters<typeof startSession>[0]) => {
    try {
      const s = await startSession(p);
      nav(`/tap/${s.id}`);
    } catch (e) {
      toastError(e);
    }
  };
}

function StartTab({ programs, sessions, schedule }: { programs: Program[]; sessions: WorkoutSession[]; schedule: ScheduledWorkout[] }) {
  const nav = useNavigate();
  const start = useStarter();
  const active = programs.find((p) => p.isActive) ?? null;
  const draft = sessions.find((s) => s.status === 'draft' && !s.deletedAt);
  const next = nextWorkout({ program: active, programs, sessions, schedule, today: todayISO() });

  if (draft) {
    return (
      <Card>
        <div className="font-semibold">{draft.dayName}</div>
        <div className="mb-3 text-sm text-muted">Bạn đang có một buổi tập chưa hoàn thành.</div>
        <Button variant="primary" block size="lg" icon={<Play size={20} />} onClick={() => nav(`/tap/${draft.id}`)}>
          Tiếp tục buổi tập
        </Button>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {next && (
        <Card className="border-accent/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">Gợi ý tiếp theo</div>
          <div className="mt-1 text-xl font-bold">{next.day.name}</div>
          <div className="mb-3 text-sm text-muted">
            {next.source === 'scheduled' ? `Đã đặt lịch ${formatDate(next.date)}` : 'Theo thứ tự vòng giáo án'} · {next.day.exercises.length} bài
          </div>
          <Button
            variant="primary"
            size="lg"
            block
            icon={<Play size={20} />}
            onClick={() => void start({ programId: next.program.id, programDayId: next.day.id, scheduleId: next.source === 'scheduled' ? next.scheduleId : null })}
          >
            Bắt đầu {next.day.name}
          </Button>
        </Card>
      )}
      {active ? (
        <Card title={`Giáo án: ${active.name}`}>
          <ul className="space-y-2">
            {active.days.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl bg-surface2 p-3">
                <div className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted">
                    {d.exercises.length} bài · {d.exercises.reduce((n, e) => n + e.sets, 0)} hiệp
                  </div>
                </div>
                <Button size="sm" icon={<Play size={16} />} onClick={() => void start({ programId: active.id, programDayId: d.id })}>
                  Tập
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState title="Chưa chọn giáo án" action={<Link className="text-accent" to="/lich-tap?tab=programs">Mở danh sách giáo án</Link>} />
      )}
      <Button block icon={<Zap size={18} />} onClick={() => void start({})}>
        Buổi tự do (tự chọn bài)
      </Button>
    </div>
  );
}

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function CalendarTab({ programs, sessions, schedule }: { programs: Program[]; sessions: WorkoutSession[]; schedule: ScheduledWorkout[] }) {
  const today = todayISO();
  const nav = useNavigate();
  const start = useStarter();
  const { toastError, confirm } = useFeedback();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [planOpen, setPlanOpen] = useState(false);

  const visible = sessions.filter((s) => !s.deletedAt);
  const days = useMemo(() => {
    const first = `${month}-01`;
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [month]);
  const byDate = (d: string) => ({
    s: visible.filter((x) => x.date === d),
    sch: schedule.filter((x) => x.date === d),
  });
  const shiftMonth = (k: number) => {
    const d = parseISODate(`${month}-01`);
    d.setMonth(d.getMonth() + k);
    setMonth(toISODate(d).slice(0, 7));
  };
  const sel = byDate(selected);
  const active = programs.find((p) => p.isActive);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <IconButton label="Tháng trước" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={20} />
          </IconButton>
          <div className="font-semibold">Tháng {month.slice(5)}/{month.slice(0, 4)}</div>
          <IconButton label="Tháng sau" onClick={() => shiftMonth(1)}>
            <ChevronRight size={20} />
          </IconButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEK_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const { s, sch } = byDate(d);
            const inMonth = d.startsWith(month);
            const done = s.some((x) => x.status === 'completed');
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                aria-label={formatDate(d)}
                aria-pressed={d === selected}
                className={cx(
                  'flex aspect-square flex-col items-center justify-center rounded-xl text-sm',
                  !inMonth && 'opacity-30',
                  d === selected ? 'bg-accent text-accent-ink' : d === today ? 'bg-surface2 text-text ring-1 ring-accent/60' : 'text-text hover:bg-surface2',
                )}
              >
                <span className="tabular">{Number(d.slice(8))}</span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {done && <span className={cx('h-1.5 w-1.5 rounded-full', d === selected ? 'bg-accent-ink' : 'bg-accent')} />}
                  {sch.length > 0 && <span className={cx('h-1.5 w-1.5 rounded-full', d === selected ? 'bg-accent-ink' : 'bg-info')} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Đã tập
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-info" /> Đã đặt lịch
          </span>
        </div>
      </Card>

      <Card title={formatDate(selected)}>
        <div className="space-y-2">
          {sel.s.map((s) => (
            <Link key={s.id} to={s.status === 'draft' ? `/tap/${s.id}` : `/lich-tap/buoi/${s.id}`} className="flex items-center gap-3 rounded-xl bg-surface2 p-3">
              <div className="flex-1">
                <div className="font-medium">{s.dayName}</div>
                <div className="text-xs text-muted">{s.status === 'draft' ? 'Đang tập dở' : `${countWorkingSets([s])} hiệp`}</div>
              </div>
              <Badge tone={s.status === 'draft' ? 'warn' : 'accent'}>{s.status === 'draft' ? 'Dở' : 'Xong'}</Badge>
            </Link>
          ))}
          {sel.sch.map((x) => {
            const p = programs.find((pp) => pp.id === x.programId);
            const d = p?.days.find((dd) => dd.id === x.programDayId);
            const used = visible.some((s) => s.scheduleId === x.id && s.status === 'completed');
            return (
              <div key={x.id} className="flex items-center gap-2 rounded-xl border border-info/40 p-3">
                <div className="flex-1">
                  <div className="font-medium">{d?.name ?? 'Buổi đã bị xóa khỏi giáo án'}</div>
                  <div className="text-xs text-muted">{used ? 'Đã hoàn thành' : `Lịch đã đặt · ${p?.name ?? ''}`}</div>
                </div>
                {!used && p && d && (
                  <Button size="sm" variant="primary" icon={<Play size={16} />} onClick={() => void start({ programId: p.id, programDayId: d.id, scheduleId: x.id, date: selected })}>
                    Tập
                  </Button>
                )}
                <IconButton
                  label="Gỡ lịch"
                  onClick={async () => {
                    if (await confirm({ title: 'Gỡ lịch đã đặt?', message: 'Chỉ gỡ lịch hẹn, không ảnh hưởng buổi tập đã ghi.', confirmText: 'Gỡ', danger: true }))
                      await removeSchedule(x.id).catch(toastError);
                  }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            );
          })}
          {sel.s.length === 0 && sel.sch.length === 0 && <div className="text-sm text-muted">Không có buổi tập hay lịch hẹn.</div>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button icon={<CalendarPlus size={18} />} onClick={() => setPlanOpen(true)} disabled={programs.length === 0}>
            Đặt lịch
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => void start({ date: selected })} disabled={selected > today}>
            Ghi buổi tự do
          </Button>
        </div>
        {selected > today && <p className="mt-2 text-xs text-muted">Chỉ ghi buổi tập cho hôm nay hoặc ngày đã qua. Ngày tương lai hãy dùng "Đặt lịch".</p>}
      </Card>

      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title={`Đặt lịch — ${formatDate(selected)}`}>
        <div className="space-y-4">
          {[...programs].sort((a, b) => Number(b.isActive) - Number(a.isActive)).map((p) => (
            <div key={p.id}>
              <div className="mb-2 text-sm font-semibold text-muted">
                {p.name} {p.id === active?.id && <Badge tone="accent">Đang dùng</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {p.days.map((d) => (
                  <Button
                    key={d.id}
                    onClick={async () => {
                      try {
                        await addSchedule({ date: selected, programId: p.id, programDayId: d.id });
                        setPlanOpen(false);
                      } catch (e) {
                        toastError(e);
                      }
                    }}
                  >
                    {d.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
      <p className="text-center text-xs text-muted">
        <button className="underline" onClick={() => nav('/lich-tap?tab=history')}>
          Xem toàn bộ lịch sử
        </button>
      </p>
    </div>
  );
}

function ProgramsTab({ programs }: { programs: Program[] }) {
  const nav = useNavigate();
  const { confirm, toast, toastError } = useFeedback();
  return (
    <div className="space-y-3">
      {programs.length === 0 && <EmptyState title="Chưa có giáo án" />}
      {[...programs].sort((a, b) => Number(b.isActive) - Number(a.isActive)).map((p) => (
        <Card key={p.id} className={p.isActive ? 'border-accent/50' : undefined}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                {p.isActive && <Badge tone="accent">Đang dùng</Badge>}
              </div>
              <div className="mt-0.5 text-sm text-muted">{p.days.map((d) => d.name).join(' · ')}</div>
              {p.description && <p className="mt-2 text-xs text-muted">{p.description}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!p.isActive && (
              <Button size="sm" variant="primary" onClick={() => void setActiveProgram(p.id).then(() => toast('Đã chuyển giáo án')).catch(toastError)}>
                Dùng giáo án này
              </Button>
            )}
            <Button size="sm" icon={<Pencil size={16} />} onClick={() => nav(`/lich-tap/giao-an/${p.id}`)}>
              Sửa
            </Button>
            <Button size="sm" icon={<Copy size={16} />} onClick={() => void duplicateProgram(p.id).then(() => toast('Đã nhân bản')).catch(toastError)}>
              Nhân bản
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                const ok = await confirm({
                  title: `Xóa giáo án "${p.name}"?`,
                  message: 'Lịch sử các buổi đã tập vẫn được giữ nguyên. Các lịch hẹn của giáo án này sẽ bị gỡ.',
                  confirmText: 'Xóa giáo án',
                  danger: true,
                });
                if (ok) await deleteProgram(p.id).then(() => toast('Đã xóa giáo án')).catch(toastError);
              }}
            >
              Xóa
            </Button>
          </div>
        </Card>
      ))}
      <Button block icon={<Plus size={18} />} onClick={() => nav('/lich-tap/giao-an/moi')}>
        Tạo giáo án mới
      </Button>
    </div>
  );
}

function HistoryTab({ sessions }: { sessions: WorkoutSession[] }) {
  const list = activeCompleted(sessions).reverse();
  if (list.length === 0) return <EmptyState icon={<History size={28} />} title="Chưa có buổi tập nào" />;
  return (
    <Card>
      <ul className="divide-y divide-line/60">
        {list.map((s) => (
          <li key={s.id}>
            <Link to={`/lich-tap/buoi/${s.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.dayName}</div>
                <div className="text-xs text-muted">
                  {formatDate(s.date)} · {countWorkingSets([s])} hiệp · {fmt0(totalVolume([s]))} kg
                  {s.finishedAt && ` · ${formatDuration(new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())}`}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
