import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, BookOpen, Check, ClipboardCopy, Info, Minus, Plus, Timer, Trash2, TrendingUp } from 'lucide-react';
import { ExerciseTechnique } from '../library/ExerciseTechnique';
import { db } from '../../db/db';
import { MUSCLE_LABELS, type Exercise, type SessionExercise, type SetEntry, type Settings } from '../../db/types';
import { Badge, Button, Card, IconButton, Modal, NumberInput, PageHeader, Spinner, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { emptySet, finishSession, lastPerformances, softDeleteSession } from '../../db/repo';
import { suggestProgression, type Suggestion } from '../../domain/progression';
import { isWorkingSet } from '../../domain/sets';
import { formatClock, formatShort, todayISO } from '../../lib/date';
import { fmt1 } from '../../lib/format';
import { uid } from '../../lib/id';
import { useRestTimerActions } from './RestTimer';
import { ExercisePicker } from './ExercisePicker';
import { useSessionWriter, type SaveState } from './useSessionWriter';

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
  const { toast, toastError, confirm } = useFeedback();
  const { s, latest, load, commit, commitText, flush, retry, saveState } = useSessionWriter(null);
  const [pickOpen, setPickOpen] = useState(false);
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
    const map = await lastPerformances([...new Set(exKey.split('|').filter(Boolean))], id);
    const out: Record<string, Hint> = {};
    for (const [exId, lp] of map) out[exId] = { date: lp.date, sets: lp.exercise.sets };
    return out;
  }, [exKey, id]);

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
    let weight = set.weightKg ?? h?.weightKg ?? null;
    if (weight == null && ex?.isBodyweight) weight = 0;
    if (reps == null || reps <= 0) return toast('Nhập số lần trước khi đánh dấu ✓', 'error');
    if (weight == null) return toast('Nhập mức tạ (kg). Bài không dùng tạ thì nhập 0.', 'error');
    updEx(se.id, (e) => ({ ...e, sets: e.sets.map((x, i) => (i === idx ? { ...x, reps, weightKg: weight, done: true } : x)) }));
    if (!set.isWarmup) timer.start(se.target?.restSec || settings.restTimerDefaultSec, ex?.nameVi ?? '');
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
              onChange={(e) => e.target.value && commit((c) => ({ ...c, date: e.target.value }))}
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
        onChange={(e) => commitText((c) => ({ ...c, dayName: e.target.value }))}
        onBlur={() => void flush()}
      />
      {anyHints && isDraft && (
        <Button size="sm" variant="ghost" icon={<ClipboardCopy size={16} />} onClick={copyAll}>
          Chép thông số buổi trước cho tất cả bài
        </Button>
      )}

      {s.exercises.length === 0 && <Card><p className="text-sm text-muted">Chưa có bài tập. Bấm "Thêm bài tập" bên dưới.</p></Card>}

      {s.exercises.map((se, i) => (
        <ExerciseBlock
          key={se.id}
          se={se}
          ex={exMap.get(se.exerciseId)}
          hint={hints?.[se.exerciseId]}
          settings={settings}
          first={i === 0}
          last={i === s.exercises.length - 1}
          onChange={(fn) => updEx(se.id, fn)}
          onChangeText={(fn) => updExText(se.id, fn)}
          onBlurText={() => void flush()}
          onToggle={(idx) => toggleSet(se, idx)}
          onCopyLast={() => copyLast(se)}
          onMove={(d) =>
            commit((c) => {
              const arr = [...c.exercises];
              const j = i + d;
              if (j < 0 || j >= arr.length) return c;
              [arr[i], arr[j]] = [arr[j]!, arr[i]!];
              return { ...c, exercises: arr };
            })
          }
          onRemove={async () => {
            const hasData = se.sets.some((x) => x.done);
            if (
              !hasData ||
              (await confirm({ title: 'Bỏ bài này khỏi buổi tập?', message: 'Các hiệp đã ghi của bài này trong buổi sẽ bị xóa.', danger: true, confirmText: 'Bỏ bài' }))
            )
              commit((c) => ({ ...c, exercises: c.exercises.filter((x) => x.id !== se.id) }));
          }}
        />
      ))}

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
          onChange={(e) => commitText((c) => ({ ...c, notes: e.target.value }))}
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

function SuggestionBanner({ sg }: { sg: Suggestion }) {
  if (sg.kind === 'insufficient') return null;
  const up = sg.kind === 'increase' || sg.kind === 'increase-difficulty';
  return (
    <div className={cx('mb-3 flex gap-2 rounded-xl p-2.5 text-xs', up ? 'bg-accent/10 text-accent' : 'bg-surface2 text-muted')}>
      {up ? <TrendingUp size={16} className="shrink-0" /> : <Info size={16} className="shrink-0" />}
      <span>
        {sg.kind === 'increase' && <strong className="mr-1">Gợi ý: {fmt1(sg.toKg)} kg.</strong>}
        {sg.reason}
      </span>
    </div>
  );
}

function ExerciseBlock(props: {
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
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const { se, ex, hint, settings, onChange } = props;
  const t = se.target;
  const sg = ex
    ? suggestProgression({ target: t, lastSets: hint?.sets ?? [], region: ex.region, isBodyweight: ex.isBodyweight, settings: settings.progression })
    : null;
  const [howOpen, setHowOpen] = useState(false);
  const setField = (i: number, patch: Partial<SetEntry>) => onChange((e) => ({ ...e, sets: e.sets.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  let workIdx = 0;

  return (
    <Card>
      <div className="mb-2 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <Link to={`/thu-vien/${se.exerciseId}`} className="font-semibold leading-tight hover:text-accent">
            {ex?.nameVi ?? 'Bài tập đã bị xóa'}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {ex && <Badge tone="accent">{MUSCLE_LABELS[ex.primaryMuscle]}</Badge>}
            {t && (
              <span>
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
        <IconButton label="Đưa lên" disabled={props.first} onClick={() => props.onMove(-1)}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton label="Đưa xuống" disabled={props.last} onClick={() => props.onMove(1)}>
          <ArrowDown size={16} />
        </IconButton>
        <IconButton label="Bỏ bài" onClick={props.onRemove}>
          <Trash2 size={16} />
        </IconButton>
      </div>

      {hint && (
        <div className="mb-2 text-xs text-muted">
          Lần trước ({formatShort(hint.date)}):{' '}
          <span className="tabular text-text">
            {hint.sets
              .filter(isWorkingSet)
              .map((x) => `${fmt1(x.weightKg ?? 0)}×${x.reps}`)
              .join(', ')}
          </span>
        </div>
      )}
      {sg && <SuggestionBanner sg={sg} />}

      <div className="grid grid-cols-[36px_1fr_1fr_64px_48px] items-center gap-1.5 text-center text-xs text-muted">
        <div>Hiệp</div>
        <div>kg</div>
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
              className={cx('grid grid-cols-[36px_1fr_1fr_64px_48px] items-center gap-1.5 rounded-xl', set.done && 'bg-accent/10')}
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
                value={set.weightKg}
                min={0}
                max={1000}
                placeholder={h?.weightKg != null ? fmt1(h.weightKg) : ex?.isBodyweight ? '0' : 'kg'}
                onChange={(v) => setField(i, { weightKg: v })}
                className="px-1 text-center"
              />
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
        onChange={(e) => props.onChangeText((x) => ({ ...x, note: e.target.value }))}
        onBlur={props.onBlurText}
      />
      {ex && (
        <Modal open={howOpen} onClose={() => setHowOpen(false)} title={`Kỹ thuật: ${ex.nameVi}`} wide>
          <ExerciseTechnique ex={ex} compact />
        </Modal>
      )}
    </Card>
  );
}
