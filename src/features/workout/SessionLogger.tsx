import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeftRight, ArrowUp, BookOpen, ChevronDown, ChevronUp, Disc, Check, ClipboardCopy, Flame, Info, Minus, Plus, Timer, Trash2, TrendingUp } from 'lucide-react';
import { db } from '../../db/db';
import { MUSCLE_LABELS, type Exercise, type SessionExercise, type SetEntry, type Settings } from '../../db/types';
import { Badge, Button, Card, IconButton, Menu, Modal, NumberInput, PageHeader, Spinner, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { emptySet, finishSession, lastPerformances, replaceExerciseInProgramDay, softDeleteSession } from '../../db/repo';
import { swapExercise } from '../../domain/swap';
import { deloadWeight } from '../../domain/deload';
import { warmupSets } from '../../domain/warmup';
import { stagnationFor } from '../../db/history';
import { groupExercises, groupRestSec, isLastInGroup, moveBlock, nextInGroup, normalizeGroups } from '../../domain/superset';
import { suggestProgression, type Suggestion } from '../../domain/progression';
import { isWorkingSet } from '../../domain/sets';
import { formatClock, formatShort, todayISO } from '../../lib/date';
import { uid } from '../../lib/id';
import { persistAfterFirstWorkout } from '../../db/persistence';
import { useRestTimerActions } from './RestTimer';
import { useUnits } from '../../app/useUnits';
import { ExercisePicker } from './ExercisePicker';
import { useSessionWriter, type SaveState } from './useSessionWriter';
const ExerciseHistoryList = lazy(() => import('../library/ExerciseHistory'));
const PlateCalculator = lazy(() => import('./PlateCalculator'));
const SwapExerciseDialog = lazy(() => import('./SwapExerciseDialog'));
const ExerciseTechnique = lazy(() => import('../library/ExerciseTechnique').then((m) => ({ default: m.ExerciseTechnique })));

type Hint = { date: string; sets: SetEntry[] };

function hintFor(h: Hint | undefined, i: number): SetEntry | undefined {
  const w = h?.sets.filter(isWorkingSet) ?? [];
  return w[i] ?? w[w.length - 1];
}

export function SessionLogger() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const settings = useSettings();
  const exMap = useExerciseMap();
  const timer = useRestTimerActions();
  const units = useUnits();
  const { toast, toastError, confirm } = useFeedback();
  const { s, latest, load, commit, commitText, flush, retry, saveState } = useSessionWriter(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    void db.sessions.get(id).then((found) => {
      if (!found || found.deletedAt) {
        toast('Không tìm thấy buổi tập', 'error');
        nav('/lich-tap', { replace: true });
        return;
      }
      load(found);
    });
  }, [id, nav, toast, load]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const exKey = s?.exercises.map((e) => e.exerciseId).join('|') ?? '';
  const hints = useLiveQuery(async () => {
    // Quét MỘT lần cho mọi bài trong buổi (chỉ mục [status+date]).
    // Buổi deload không làm mốc cho buổi sau (gợi ý tăng tạ lấy buổi gần nhất KHÔNG deload).
    const map = await lastPerformances([...new Set(exKey.split('|').filter(Boolean))], id, { excludeDeload: true });
    const out: Record<string, Hint> = {};
    for (const [exId, lp] of map) out[exId] = { date: lp.date, sets: lp.exercise.sets };
    return out;
  }, [exKey, id]);
  const stag = useLiveQuery(
    () => stagnationFor([...new Set(exKey.split('|').filter(Boolean))], settings.oneRmFormula, id),
    [exKey, id, settings.oneRmFormula],
  );

  if (!s || !exMap) return <Spinner />;

  const updEx = (seId: string, fn: (e: SessionExercise) => SessionExercise) =>
    commit((c) => ({ ...c, exercises: c.exercises.map((e) => (e.id === seId ? fn(e) : e)) }));
  /** Sửa chữ (cảm nhận bài) — đi đường debounce. */
  const updExText = (seId: string, fn: (e: SessionExercise) => SessionExercise) =>
    commitText((c) => ({ ...c, exercises: c.exercises.map((e) => (e.id === seId ? fn(e) : e)) }));

  function toggleSet(se: SessionExercise, idx: number) {
    const set = se.sets[idx];
    if (!set) return;
    const ex = exMap!.get(se.exerciseId);
    if (set.done) {
      updEx(se.id, (e) => ({ ...e, sets: e.sets.map((x, i) => (i === idx ? { ...x, done: false } : x)) }));
      return;
    }
    const h = hintFor(hints?.[se.exerciseId], idx);
    const reps = set.reps ?? h?.reps ?? null;
    const hw = h?.weightKg ?? null;
    let weight = set.weightKg ?? (hw != null && s?.isDeload ? deloadWeight(hw, ex?.equipment === 'barbell' ? settings.barbell : null) : hw);
    if (weight == null && ex?.isBodyweight) weight = 0;
    if (reps == null || reps <= 0) return toast('Nhập số lần trước khi đánh dấu ✓', 'error');
    if (weight == null) return toast(`Nhập mức tạ (${units.unit}). Bài không dùng tạ thì nhập 0.`, 'error');
    updEx(se.id, (e) => ({ ...e, sets: e.sets.map((x, i) => (i === idx ? { ...x, reps, weightKg: weight, done: true } : x)) }));
    if (set.isWarmup) return;
    // Superset: bài chưa phải cuối nhóm => không nghỉ, chuyển ngay sang bài kế trong nhóm.
    const list = latest.current?.exercises ?? [];
    const pos = list.findIndex((x) => x.id === se.id);
    if (pos >= 0 && !isLastInGroup(list, pos)) {
      const n = nextInGroup(list, pos);
      const next = n != null ? list[n] : undefined;
      if (next) document.getElementById(`se-${next.id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return;
    }
    const rest = pos >= 0 ? groupRestSec(list, pos, (x) => x.target?.restSec) : null;
    timer.start(rest || se.target?.restSec || settings.restTimerDefaultSec, ex?.nameVi ?? '');
  }

  function copyLast(se: SessionExercise) {
    const h = hints?.[se.exerciseId];
    if (!h) return toast('Chưa có dữ liệu buổi trước cho bài này', 'info');
    const w = h.sets.filter(isWorkingSet);
    updEx(se.id, (e) => {
      const n = Math.max(e.sets.length, w.length);
      const sets = Array.from({ length: n }, (_, i) => {
        const old = e.sets[i] ?? emptySet();
        if (old.done) return old;
        const src = w[i] ?? w[w.length - 1];
        return { ...old, weightKg: src?.weightKg ?? old.weightKg, reps: src?.reps ?? old.reps, rir: src?.rir ?? old.rir };
      });
      return { ...e, sets };
    });
    toast('Đã chép thông số buổi trước (chưa ✓)', 'info');
  }

  /** Thay bài: hỏi phạm vi nếu buổi theo giáo án, rồi đổi bài trong buổi (giữ mục tiêu, ghi chú, hiệp đã làm). */
  async function doSwap(seId: string, newExerciseId: string) {
    const cur = latest.current;
    const se = cur?.exercises.find((x) => x.id === seId);
    if (!cur || !se || se.exerciseId === newExerciseId) return;
    const oldId = se.exerciseId;
    const newName = exMap!.get(newExerciseId)?.nameVi ?? 'bài mới';
    if (cur.programId && cur.programDayId) {
      const inProgram = await db.programs
        .get(cur.programId)
        .then((p) => !!p?.days.find((d) => d.id === cur.programDayId)?.exercises.some((e) => e.exerciseId === oldId));
      if (inProgram) {
        const whole = await confirm({
          title: `Thay bằng "${newName}" ở đâu?`,
          message: '"Chỉ buổi này": giáo án giữ nguyên. "Cả giáo án": các buổi sau của ngày này cũng dùng bài mới.',
          confirmText: 'Cả giáo án',
          cancelText: 'Chỉ buổi này',
        });
        if (whole) {
          try {
            await replaceExerciseInProgramDay(cur.programId, cur.programDayId, oldId, newExerciseId);
          } catch (e) {
            toastError(e);
          }
        }
      }
    }
    updEx(seId, (e) => swapExercise(e, newExerciseId));
    toast(`Đã thay bằng ${newName}`, 'info');
  }

  function copyAll() {
    s?.exercises.forEach((se) => hints?.[se.exerciseId] && copyLast(se));
  }

  async function finish() {
    const cur = latest.current!;
    const pending = cur.exercises.reduce((n, e) => n + e.sets.filter((x) => !x.done && (x.reps ?? 0) > 0).length, 0);
    const done = cur.exercises.reduce((n, e) => n + e.sets.filter(isWorkingSet).length, 0);
    const ok = await confirm({
      title: 'Hoàn thành buổi tập?',
      message: (
        <>
          <p>{done} hiệp làm việc sẽ được lưu vào lịch sử.</p>
          {pending > 0 && <p className="mt-2 text-warn">{pending} hiệp đã nhập số nhưng chưa ✓ sẽ không được tính.</p>}
        </>
      ),
      confirmText: 'Hoàn thành',
    });
    if (!ok) return;
    try {
      // Ghi nốt thay đổi đang chờ; nếu ghi thất bại thì KHÔNG kết thúc buổi (tránh mất dữ liệu).
      if (!(await flush())) return toast('Chưa lưu được thay đổi gần nhất — bấm "Thử lại" rồi hoàn thành.', 'error');
      await finishSession(cur.id);
      timer.stop();
      // Sau buổi tập hoàn thành đầu tiên: xin lại lưu trữ bền vững (trình duyệt hay cấp khi trang "được dùng thật").
      void persistAfterFirstWorkout();
      nav(`/lich-tap/buoi/${cur.id}?xong=1`, { replace: true });
    } catch (e) {
      toastError(e);
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: 'Hủy buổi tập này?',
      message: 'Buổi tập được chuyển vào Thùng rác (Cài đặt → Thùng rác) và có thể khôi phục.',
      confirmText: 'Hủy buổi',
      danger: true,
    });
    if (!ok) return;
    await flush();
    await softDeleteSession(s!.id).catch(toastError);
    timer.stop();
    nav('/lich-tap', { replace: true });
  }

  const elapsedMin = Math.max(0, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000));
  const isDraft = s.status === 'draft';
  const anyHints = hints && Object.keys(hints).length > 0;

  return (
    <div className="space-y-4 pb-24">
      {s.isDeload && (
        <div className="-mb-2 flex items-center gap-2" data-testid="deload-label">
          <Badge tone="warn">DELOAD</Badge>
          <span className="text-xs text-muted">Buổi nhẹ: tạ ≈ 60% buổi trước, bớt 1 hiệp — không tính kỷ lục / gợi ý tăng tạ.</span>
        </div>
      )}
      <PageHeader
        title={isDraft ? 'Đang tập' : 'Sửa buổi tập'}
        back={isDraft ? '/lich-tap' : `/lich-tap/buoi/${s.id}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Ngày tập"
              className="h-8 px-2 text-sm"
              value={s.date}
              max={todayISO()}
              onChange={(e) => { const v = e.target.value; if (v) commit((c) => ({ ...c, date: v })); }}
            />
            {isDraft && <span>{elapsedMin} phút</span>}
            <SaveStatus state={saveState} onRetry={() => void retry()} />
          </span>
        }
        action={
          <IconButton label="Bắt đầu đồng hồ nghỉ" onClick={() => timer.start(settings.restTimerDefaultSec, 'Thủ công')}>
            <Timer size={20} />
          </IconButton>
        }
      />
      <input
        aria-label="Tên buổi"
        className="w-full font-semibold"
        value={s.dayName}
        onChange={(e) => { const v = e.target.value; commitText((c) => ({ ...c, dayName: v })); }}
        onBlur={() => void flush()}
      />
      {anyHints && isDraft && (
        <Button size="sm" variant="ghost" icon={<ClipboardCopy size={16} />} onClick={copyAll}>
          Chép thông số buổi trước cho tất cả bài
        </Button>
      )}

      {s.exercises.length === 0 && <Card><p className="text-sm text-muted">Chưa có bài tập. Bấm "Thêm bài tập" bên dưới.</p></Card>}

      {groupExercises(s.exercises).map((g) => {
        const blocks = g.items.map(({ item: se, index: i, label }) => (
        <ExerciseBlock
          groupLabel={label}
          key={se.id}
          sessionId={s.id}
          isDeload={!!s.isDeload}
          stagnant={!s.isDeload && stag?.get(se.exerciseId)?.stagnant === true}
          se={se}
          ex={exMap.get(se.exerciseId)}
          hint={hints?.[se.exerciseId]}
          settings={settings}
          first={g.items[0]!.index === 0}
          last={g.items[g.items.length - 1]!.index === s.exercises.length - 1}
          onChange={(fn) => updEx(se.id, fn)}
          onChangeText={(fn) => updExText(se.id, fn)}
          onBlurText={() => void flush()}
          onToggle={(idx) => toggleSet(se, idx)}
          onCopyLast={() => copyLast(se)}
          onSwap={() => setSwapFor(se.id)}
          onMove={(d) => commit((c) => ({ ...c, exercises: moveBlock(c.exercises, i, d < 0 ? -1 : 1) }))}
          onRemove={async () => {
            const hasData = se.sets.some((x) => x.done);
            if (
              !hasData ||
              (await confirm({ title: 'Bỏ bài này khỏi buổi tập?', message: 'Các hiệp đã ghi của bài này trong buổi sẽ bị xóa.', danger: true, confirmText: 'Bỏ bài' }))
            )
              commit((c) => ({ ...c, exercises: normalizeGroups(c.exercises.filter((x) => x.id !== se.id)) }));
          }}
        />
        ));
        if (!g.letter) return blocks;
        return (
          <section key={g.groupId} aria-label={`Superset ${g.letter}`} className="space-y-2 rounded-2xl border-2 border-accent/50 p-1.5" data-testid="superset">
            <div className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-accent">Superset {g.letter} · làm xen kẽ, nghỉ sau bài cuối</div>
            {blocks}
          </section>
        );
      })}

      <Button block icon={<Plus size={18} />} onClick={() => setPickOpen(true)}>
        Thêm bài tập
      </Button>

      <Card title="Ghi chú buổi tập">
        <textarea
          aria-label="Ghi chú buổi tập"
          className="w-full"
          rows={2}
          placeholder="Năng lượng, giấc ngủ, cảm nhận chung…"
          value={s.notes}
          onChange={(e) => { const v = e.target.value; commitText((c) => ({ ...c, notes: v })); }}
          onBlur={() => void flush()}
        />
      </Card>

      {isDraft ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" onClick={() => void cancel()}>
            Hủy buổi
          </Button>
          <Button variant="primary" className="col-span-2" size="lg" icon={<Check size={20} />} onClick={() => void finish()}>
            Hoàn thành
          </Button>
        </div>
      ) : (
        <Button variant="primary" block size="lg" onClick={async () => { await flush(); nav(`/lich-tap/buoi/${s.id}`); }}>
          Xong
        </Button>
      )}
      <p className="text-center text-xs text-muted">Mọi thay đổi được lưu tự động trên thiết bị.</p>

      {swapFor && (
        <Suspense fallback={null}>
          <SwapExerciseDialog
            open
            ex={exMap.get(s.exercises.find((x) => x.id === swapFor)?.exerciseId ?? '')}
            currentId={s.exercises.find((x) => x.id === swapFor)?.exerciseId ?? ''}
            onClose={() => setSwapFor(null)}
            onPick={(newId) => void doSwap(swapFor, newId)}
          />
        </Suspense>
      )}

      <ExercisePicker
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={(exerciseId) =>
          commit((c) => ({
            ...c,
            exercises: [
              ...c.exercises,
              {
                id: uid('se'),
                exerciseId,
                target: { sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: settings.restTimerDefaultSec },
                note: '',
                sets: [emptySet(), emptySet(), emptySet()],
              },
            ],
          }))
        }
      />
    </div>
  );
}

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'error')
    return (
      <span role="alert" className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
        Lưu thất bại —
        <button type="button" className="underline" onClick={onRetry}>
          Thử lại
        </button>
      </span>
    );
  return (
    <span className="text-xs text-muted" aria-live="polite" data-testid="save-status">
      {state === 'saving' ? 'Đang lưu…' : 'Đã lưu'}
    </span>
  );
}

function SuggestionBanner({ sg, fmtU }: { sg: Suggestion; fmtU: (kg: number) => string }) {
  if (sg.kind === 'insufficient') return null;
  const up = sg.kind === 'increase' || sg.kind === 'increase-difficulty';
  return (
    <div className={cx('mb-3 flex gap-2 rounded-xl p-2.5 text-xs', up ? 'bg-accent/10 text-accent' : 'bg-surface2 text-muted')}>
      {up ? <TrendingUp size={16} className="shrink-0" /> : <Info size={16} className="shrink-0" />}
      <span>
        {sg.kind === 'increase' && <strong className="mr-1">Gợi ý: {fmtU(sg.toKg)}.</strong>}
        {sg.reason}
      </span>
    </div>
  );
}

function ExerciseBlock(props: {
  sessionId: string;
  isDeload: boolean;
  stagnant: boolean;
  groupLabel: string | null;
  se: SessionExercise;
  ex: Exercise | undefined;
  hint: Hint | undefined;
  settings: Settings;
  first: boolean;
  last: boolean;
  onChange: (fn: (e: SessionExercise) => SessionExercise) => void;
  onChangeText: (fn: (e: SessionExercise) => SessionExercise) => void;
  onBlurText: () => void;
  onToggle: (idx: number) => void;
  onCopyLast: () => void;
  onSwap: () => void;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const { se, ex, hint, settings, onChange } = props;
  const units = useUnits();
  const t = se.target;
  const sg = ex
    ? suggestProgression({
        target: t,
        lastSets: hint?.sets ?? [],
        region: ex.region,
        isBodyweight: ex.isBodyweight,
        settings: settings.progression,
        barbell: ex.equipment === 'barbell' ? settings.barbell : null,
        fmtWeightU: units.fmtU,
        unit: units.unit,
      })
    : null;
  const isBarbell = ex?.equipment === 'barbell';
  /** Tạ dự kiến từ buổi trước (buổi deload: ≈ 60%). */
  const planned = (kg: number) => (props.isDeload ? deloadWeight(kg, isBarbell ? settings.barbell : null) : kg);
  // Cột hẹp hơn (v1.9) để ô "Lần" trên màn 375 px không cắt gợi ý "10–12".
  const cols = isBarbell ? 'grid-cols-[28px_1fr_40px_1fr_52px_44px]' : 'grid-cols-[32px_1fr_1fr_56px_44px]';
  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  // Bài đã xong hết hiệp lúc mở trang => thu gọn (bấm tiêu đề để mở lại). Không tự thu gọn ngay khi ✓ hiệp cuối.
  const allDone = se.sets.length > 0 && se.sets.every((x) => x.done);
  const [collapsed, setCollapsed] = useState(allDone);
  const setField = (i: number, patch: Partial<SetEntry>) => onChange((e) => ({ ...e, sets: e.sets.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  let workIdx = 0;
  const name = ex?.nameVi ?? 'Bài tập đã bị xóa';
  // v1.9: mức tạ làm việc để tính khởi động — hiệp làm việc đầu tiên đã nhập, không thì tạ dự kiến từ buổi trước.
  const firstWork = se.sets.find((x) => !x.isWarmup && x.weightKg != null)?.weightKg ?? null;
  const hintKg = hintFor(hint, 0)?.weightKg;
  const warmKg = firstWork ?? (hintKg != null ? planned(hintKg) : null);
  const summary = se.sets
    .filter((x) => x.done)
    .map((x) => `${x.isWarmup ? 'K ' : ''}${units.fmt(x.weightKg ?? 0)}×${x.reps ?? 0}`)
    .join(', ');

  return (
    <Card id={`se-${se.id}`} className="scroll-mt-4">
      <div className="mb-2 flex items-center gap-1">
        {props.groupLabel && (
          <Badge tone="accent" className="shrink-0">
            {props.groupLabel}
          </Badge>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <Link to={`/thu-vien/${se.exerciseId}`} className="min-w-0 truncate font-semibold leading-tight hover:text-accent" title={name}>
              {name}
            </Link>
            {se.replacedFrom && (
              <Badge tone="info" className="shrink-0">
                Đã thay
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            {ex && <span className="shrink-0 text-accent">{MUSCLE_LABELS[ex.primaryMuscle]}</span>}
            {t && (
              <span className="min-w-0 truncate">
                {t.sets} × {t.repMin}–{t.repMax} · RIR {t.targetRIR} · nghỉ {formatClock(t.restSec)}
              </span>
            )}
          </div>
        </div>
        {ex && (
          <IconButton label="Xem kỹ thuật" onClick={() => setHowOpen(true)} className="text-info">
            <BookOpen size={18} />
          </IconButton>
        )}
        <Menu
          label="Thêm thao tác"
          items={[
            { label: 'Thay bài', icon: <ArrowLeftRight size={16} />, onSelect: props.onSwap },
            { label: 'Đưa lên', icon: <ArrowUp size={16} />, disabled: props.first, onSelect: () => props.onMove(-1) },
            { label: 'Đưa xuống', icon: <ArrowDown size={16} />, disabled: props.last, onSelect: () => props.onMove(1) },
            { label: 'Bỏ bài', icon: <Trash2 size={16} />, danger: true, onSelect: props.onRemove },
          ]}
        />
        <IconButton label={collapsed ? `Mở rộng ${name}` : `Thu gọn ${name}`} aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </IconButton>
      </div>

      {collapsed && (
        <button type="button" onClick={() => setCollapsed(false)} className="flex min-h-[44px] w-full items-center gap-2 rounded-xl bg-accent/10 px-3 text-left text-sm" data-testid="collapsed-summary">
          <Check size={16} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate">
            {se.sets.length} hiệp xong · <span className="tabular">{summary}</span>
          </span>
        </button>
      )}

      {!collapsed && hint && (
        <button
          type="button"
          onClick={() => setHistOpen(true)}
          aria-label="Xem 3 buổi gần nhất của bài này"
          className="mb-2 flex min-h-[44px] w-full items-center gap-1 rounded-lg text-left text-xs text-muted hover:bg-surface2"
        >
          <span className="min-w-0 flex-1">
            Lần trước ({formatShort(hint.date)}):{' '}
            <span className="tabular text-text">
              {hint.sets
                .filter(isWorkingSet)
                .map((x) => `${units.fmt(x.weightKg ?? 0)}×${x.reps}`)
                .join(', ')}
            </span>
          </span>
          <span className="shrink-0 text-info underline">3 buổi</span>
        </button>
      )}
      {!collapsed && (props.isDeload ? (
        <div className="mb-3 rounded-xl bg-warn/10 p-2.5 text-xs text-warn">Buổi nhẹ: dùng khoảng 60% mức tạ buổi trước (đã điền sẵn gợi ý), bớt 1 hiệp.</div>
      ) : (
        sg && <SuggestionBanner sg={sg} fmtU={units.fmtU} />
      ))}
      {!collapsed && props.stagnant && (
        <div className="-mt-1 mb-3 flex gap-2 rounded-xl bg-warn/10 p-2.5 text-xs text-warn" data-testid="stagnation">
          <Info size={16} className="shrink-0" />
          <span>4 buổi chưa tiến bộ — cân nhắc giảm tạ 10% hoặc nghỉ thêm.</span>
        </div>
      )}

      <div hidden={collapsed}>
      <div className={cx('grid items-center gap-1.5 text-center text-xs text-muted', cols)}>
        <div>Hiệp</div>
        <div className={isBarbell ? 'col-span-2' : undefined}>{units.unit}</div>
        <div>Lần</div>
        <div>RIR</div>
        <div>✓</div>
      </div>
      <div className="mt-1 space-y-1.5">
        {se.sets.map((set, i) => {
          const h = set.isWarmup ? undefined : hintFor(hint, workIdx);
          if (!set.isWarmup) workIdx += 1;
          return (
            <div
              key={set.id}
              className={cx('grid items-center gap-1.5 rounded-xl', cols, set.done && 'bg-accent/10')}
              data-testid="set-row"
            >
              <button
                type="button"
                title="Chạm để chuyển hiệp khởi động"
                aria-label={set.isWarmup ? 'Hiệp khởi động — chạm để đổi' : `Hiệp ${workIdx} — chạm để đánh dấu khởi động`}
                onClick={() => setField(i, { isWarmup: !set.isWarmup })}
                className={cx('h-11 rounded-lg text-sm font-semibold tabular', set.isWarmup ? 'text-warn' : 'text-muted')}
              >
                {set.isWarmup ? 'K' : workIdx}
              </button>
              <NumberInput
                aria-label={`Mức tạ hiệp ${i + 1}`}
                value={units.showN(set.weightKg)}
                min={0}
                max={units.unit === 'lb' ? 2205 : 1000}
                placeholder={h?.weightKg != null ? units.fmt(planned(h.weightKg)) : ex?.isBodyweight ? '0' : units.unit}
                onChange={(v) => setField(i, { weightKg: units.toKg(v, set.weightKg) })}
                className="px-1 text-center"
              />
              {isBarbell && (
                <button
                  type="button"
                  aria-label={`Đĩa tạ hiệp ${i + 1}`}
                  title="Tính đĩa mỗi bên"
                  onClick={() => setPlateFor(i)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface2 text-muted hover:text-text"
                >
                  <Disc size={18} />
                </button>
              )}
              <NumberInput
                aria-label={`Số lần hiệp ${i + 1}`}
                value={set.reps}
                min={0}
                max={1000}
                placeholder={h?.reps != null ? String(h.reps) : t ? `${t.repMin}-${t.repMax}` : 'lần'}
                onChange={(v) => setField(i, { reps: v == null ? null : Math.round(v) })}
                className="px-1 text-center"
              />
              <select
                aria-label={`RIR hiệp ${i + 1}`}
                value={set.rir ?? ''}
                onChange={(e) => setField(i, { rir: e.target.value === '' ? null : Number(e.target.value) })}
                className="px-1 text-center"
              >
                <option value="">–</option>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={set.done ? `Bỏ đánh dấu hiệp ${i + 1}` : `Hoàn thành hiệp ${i + 1}`}
                aria-pressed={set.done}
                onClick={() => props.onToggle(i)}
                className={cx('flex h-11 w-12 items-center justify-center rounded-xl', set.done ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
              >
                <Check size={22} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" icon={<Plus size={16} />} onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, emptySet()] }))}>
          Thêm hiệp
        </Button>
        {(warmKg != null || ex?.isBodyweight) && !se.sets.some((x) => x.isWarmup && x.done) && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Flame size={16} />}
            title={warmKg != null ? `Từ mức ${units.fmtU(warmKg)}: 40 % × 8, 60 % × 5, 80 % × 3` : undefined}
            onClick={() =>
              onChange((e) => ({
                ...e,
                // Thay các hiệp khởi động chưa làm (nếu có) bằng bộ mới; hiệp làm việc giữ nguyên.
                sets: [...warmupSets(warmKg ?? 0, { barbell: isBarbell ? settings.barbell : null, unit: units.unit, isBodyweight: !!ex?.isBodyweight }, () => uid('set')), ...e.sets.filter((x) => !(x.isWarmup && !x.done))],
              }))
            }
          >
            Thêm khởi động
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={<Minus size={16} />}
          disabled={se.sets.length === 0 || !!se.sets[se.sets.length - 1]?.done}
          onClick={() => onChange((e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
        >
          Bớt hiệp
        </Button>
        {hint && (
          <Button size="sm" variant="ghost" icon={<ClipboardCopy size={16} />} onClick={props.onCopyLast}>
            Chép lần trước
          </Button>
        )}
      </div>
      <textarea
        aria-label="Cảm nhận bài tập"
        className="mt-3 w-full text-sm"
        rows={1}
        placeholder="Cảm nhận: kỹ thuật, đau mỏi, độ khó…"
        value={se.note}
        onChange={(e) => { const v = e.target.value; props.onChangeText((x) => ({ ...x, note: v })); }}
        onBlur={props.onBlurText}
      />
      </div>
      {plateFor != null && (
        <Suspense fallback={null}>
          <PlateCalculator
            open
            onClose={() => setPlateFor(null)}
            initialKg={
              se.sets[plateFor]?.weightKg ??
              ((w) => (w == null ? null : planned(w)))(hintFor(hint, plateFor)?.weightKg ?? null) ??
              (sg?.kind === 'increase' ? sg.toKg : null)
            }
            barWeightKg={settings.barbell.barWeightKg}
            platesKg={settings.barbell.platesKg}
            onFill={(kg) => setField(plateFor, { weightKg: kg })}
            unit={units.unit}
          />
        </Suspense>
      )}
      {histOpen && (
        <Modal open onClose={() => setHistOpen(false)} title={`3 buổi gần nhất: ${ex?.nameVi ?? ''}`} wide>
          <Suspense fallback={<Spinner />}>
            <ExerciseHistoryList
              exerciseId={se.exerciseId}
              formula={settings.oneRmFormula}
              pageSize={3}
              filters={false}
              paged={false}
              excludeSessionId={props.sessionId}
              onNavigate={() => setHistOpen(false)}
            />
          </Suspense>
        </Modal>
      )}
      {ex && (
        <Modal open={howOpen} onClose={() => setHowOpen(false)} title={`Kỹ thuật: ${ex.nameVi}`} wide>
          <Suspense fallback={<Spinner />}>
            <ExerciseTechnique ex={ex} compact />
          </Suspense>
        </Modal>
      )}
    </Card>
  );
}
