import { useCallback, useEffect, useRef, useState } from 'react';
import { setLeaveGuard } from '../../lib/leaveGuard';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Link2, Plus, Save, Trash2, Unlink } from 'lucide-react';
import { groupExercises, linkWithNext, moveBlock, normalizeGroups, ungroup } from '../../domain/superset';
import { db } from '../../db/db';
import type { Program, ProgramDay, ProgramExercise } from '../../db/types';
import { Badge, Button, Card, Field, IconButton, NumberInput, PageHeader, Spinner, Toggle } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { loadSchemas, saveProgram } from '../../db/repo';
import { FieldErrorsContext, useFieldErrors } from '../../lib/formErrors';
import { uid } from '../../lib/id';
import { ExercisePicker } from './ExercisePicker';
import { formatClock, nowISO } from '../../lib/date';

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j]!, c[i]!];
  return c;
}

const draftKeyFor = (id: string | undefined) => `mgp.programDraft.${id ?? 'moi'}`;
function readDraft(key: string): Program | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Program;
    return d && typeof d === 'object' && Array.isArray(d.days) ? d : null;
  } catch {
    return null;
  }
}
function removeDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
}

export function ProgramEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const settings = useSettings();
  const exMap = useExerciseMap();
  const { toast, toastError, confirm } = useFeedback();
  const [p, setP] = useState<Program | null>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const fe = useFieldErrors();

  const draftKey = draftKeyFor(id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let base: Program | null = null;
      if (id === 'moi') {
        const now = nowISO();
        base = { id: uid('prog'), name: 'Giáo án mới', description: '', isActive: false, createdAt: now, updatedAt: now, days: [{ id: uid('day'), name: 'Buổi A', exercises: [] }] };
      } else {
        const found = await db.programs.get(id ?? '');
        if (!found) {
          toast('Không tìm thấy giáo án', 'error');
          nav('/lich-tap?tab=programs', { replace: true });
          return;
        }
        base = structuredClone(found);
      }
      if (cancelled) return;
      const draft = readDraft(draftKey);
      if (draft && JSON.stringify(draft) !== JSON.stringify(base)) {
        setP(base);
        const ok = await confirm({ title: 'Khôi phục bản nháp?', message: 'Lần trước bạn sửa giáo án này nhưng chưa lưu. Khôi phục các thay đổi đó?', confirmText: 'Khôi phục', cancelText: 'Bỏ nháp' });
        if (cancelled) return;
        if (ok) {
          setP(draft);
          setDirty(true);
        } else removeDraft(draftKey);
      } else {
        if (draft) removeDraft(draftKey);
        setP(base);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, nav, toast, confirm, draftKey]);

  // Bản nháp: ghi localStorage mỗi 1 giây khi có thay đổi chưa lưu.
  const latest = useRef(p);
  latest.current = p;
  useEffect(() => {
    if (!dirty) return;
    let last = '';
    const write = () => {
      const json = JSON.stringify(latest.current);
      if (json === last || !latest.current) return;
      last = json;
      try {
        localStorage.setItem(draftKey, json);
      } catch {
        /* hết chỗ / chế độ riêng tư — bỏ qua bản nháp */
      }
    };
    const t = setInterval(write, 1000);
    return () => {
      clearInterval(t);
    };
  }, [dirty, draftKey]);

  // Đóng tab / tải lại khi còn thay đổi: trình duyệt hỏi xác nhận.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        if (latest.current) localStorage.setItem(draftKey, JSON.stringify(latest.current));
      } catch {
        /* bỏ qua */
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, draftKey]);

  const askLeave = useCallback(async () => {
    const ok = await confirm({ title: 'Có thay đổi chưa lưu. Rời trang?', message: 'Các thay đổi chưa lưu sẽ bị bỏ.', confirmText: 'Rời trang', cancelText: 'Hủy', danger: true });
    if (ok) {
      removeDraft(draftKey);
      setDirty(false);
    }
    return ok;
  }, [confirm, draftKey]);

  // Link điều hướng của app (thanh bên / thanh dưới) đi qua askLeave khi đang dirty.
  useEffect(() => {
    if (!dirty) return;
    setLeaveGuard(askLeave);
    return () => setLeaveGuard(null);
  }, [dirty, askLeave]);

  /** Mọi lần rời trang từ trình sửa đi qua đây. */
  const leave = useCallback(
    async (go: () => void) => {
      if (dirty && !(await askLeave())) return;
      go();
    },
    [dirty, askLeave],
  );

  if (!p || !exMap) return <Spinner />;

  const update = (fn: (x: Program) => Program) => {
    setP((x) => (x ? fn(x) : x));
    setDirty(true);
  };
  const updDay = (dayId: string, fn: (d: ProgramDay) => ProgramDay) => update((x) => ({ ...x, days: x.days.map((d) => (d.id === dayId ? fn(d) : d)) }));
  const updEx = (dayId: string, exId: string, patch: Partial<ProgramExercise>) =>
    updDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }));

  async function save() {
    if (!p) return;
    const S = await loadSchemas();
    const v = S.programSchema.safeParse(p);
    if (!v.success) return fe.setFromZod(v.error);
    try {
      await saveProgram(p);
      setDirty(false);
      setLeaveGuard(null);
      removeDraft(draftKey);
      toast('Đã lưu giáo án');
      nav('/lich-tap?tab=programs');
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <FieldErrorsContext.Provider value={fe}>
    <div className="space-y-4 pb-20" ref={fe.containerRef as React.RefObject<HTMLDivElement>}>
      <PageHeader
        title={id === 'moi' ? 'Tạo giáo án' : 'Sửa giáo án'}
        back={true}
        onBack={() => void leave(() => nav(-1))}
        action={
          <Button variant="primary" icon={<Save size={18} />} onClick={() => void save()}>
            Lưu
          </Button>
        }
      />
      <Card>
        <div className="space-y-3">
          <Field name="name" label="Tên giáo án">{(fid) => <input id={fid} value={p.name} onChange={(e) => { const v = e.target.value; update((x) => ({ ...x, name: v })); }} />}</Field>
          <Field name="description" label="Mô tả">{(fid) => <textarea id={fid} rows={2} value={p.description ?? ''} onChange={(e) => { const v = e.target.value; update((x) => ({ ...x, description: v })); }} />}</Field>
          <Toggle label="Đặt làm giáo án đang dùng" checked={p.isActive} onChange={(v) => update((x) => ({ ...x, isActive: v }))} />
        </div>
      </Card>

      {p.days.map((d, di) => (
        <Card key={d.id}>
          <div className="mb-3 flex items-start gap-1">
            <Field name={`days.${di}.name`} label="Tên buổi" className="flex-1 [&>label]:sr-only">
              {(fid) => <input id={fid} className="w-full font-semibold" value={d.name} onChange={(e) => { const v = e.target.value; updDay(d.id, (x) => ({ ...x, name: v })); }} />}
            </Field>
            <IconButton label="Đưa buổi lên" disabled={di === 0} onClick={() => update((x) => ({ ...x, days: move(x.days, di, -1) }))}>
              <ArrowUp size={18} />
            </IconButton>
            <IconButton label="Đưa buổi xuống" disabled={di === p.days.length - 1} onClick={() => update((x) => ({ ...x, days: move(x.days, di, 1) }))}>
              <ArrowDown size={18} />
            </IconButton>
            <IconButton
              label="Xóa buổi"
              disabled={p.days.length <= 1}
              onClick={async () => {
                if (await confirm({ title: `Xóa "${d.name}" khỏi giáo án?`, message: 'Lịch sử buổi tập đã ghi không bị ảnh hưởng.', danger: true, confirmText: 'Xóa' }))
                  update((x) => ({ ...x, days: x.days.filter((y) => y.id !== d.id) }));
              }}
            >
              <Trash2 size={18} />
            </IconButton>
          </div>
          <ul className="space-y-3">
            {groupExercises(d.exercises).map((g) => {
              const rows = g.items.map(({ item: e, index: ei, label }) => (
              <li key={e.id} className="rounded-xl bg-surface2 p-3" data-testid="program-exercise">
                <div className="mb-2 flex items-center gap-1">
                  {label && <Badge tone="accent" className="shrink-0">{label}</Badge>}
                  <div className="min-w-0 flex-1 font-medium">{exMap.get(e.exerciseId)?.nameVi ?? 'Bài tập đã bị xóa'}</div>
                  <IconButton label="Đưa lên" disabled={g.items[0]!.index === 0} onClick={() => updDay(d.id, (x) => ({ ...x, exercises: moveBlock(x.exercises, ei, -1) }))}>
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton
                    label="Đưa xuống"
                    disabled={g.items[g.items.length - 1]!.index === d.exercises.length - 1}
                    onClick={() => updDay(d.id, (x) => ({ ...x, exercises: moveBlock(x.exercises, ei, 1) }))}
                  >
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton label="Bỏ bài này" onClick={() => updDay(d.id, (x) => ({ ...x, exercises: normalizeGroups(x.exercises.filter((y) => y.id !== e.id)) }))}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <Field name={`days.${di}.exercises.${ei}.sets`} label="Hiệp">{(fid) => <NumberInput id={fid} value={e.sets} onChange={(v) => updEx(d.id, e.id, { sets: v == null ? (null as unknown as number) : Math.round(v) })} className="px-2 text-center" />}</Field>
                  <Field name={`days.${di}.exercises.${ei}.repMin`} label="Lần từ">{(fid) => <NumberInput id={fid} value={e.repMin} onChange={(v) => updEx(d.id, e.id, { repMin: v == null ? (null as unknown as number) : Math.round(v) })} className="px-2 text-center" />}</Field>
                  <Field name={`days.${di}.exercises.${ei}.repMax`} label="đến">{(fid) => <NumberInput id={fid} value={e.repMax} onChange={(v) => updEx(d.id, e.id, { repMax: v == null ? (null as unknown as number) : Math.round(v) })} className="px-2 text-center" />}</Field>
                  <Field name={`days.${di}.exercises.${ei}.targetRIR`} label="RIR">{(fid) => <NumberInput id={fid} value={e.targetRIR} onChange={(v) => updEx(d.id, e.id, { targetRIR: v == null ? (null as unknown as number) : Math.round(v) })} className="px-2 text-center" />}</Field>
                  <Field name={`days.${di}.exercises.${ei}.restSec`} label="Nghỉ (s)">{(fid) => <NumberInput id={fid} value={e.restSec} onChange={(v) => updEx(d.id, e.id, { restSec: v == null ? (null as unknown as number) : Math.round(v) })} className="px-2 text-center" />}</Field>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {e.sets} × {e.repMin}–{e.repMax} lần · RIR {e.targetRIR} · nghỉ {formatClock(e.restSec)}
                  {e.repMax < e.repMin && <span className="text-danger"> · số lần tối đa phải ≥ tối thiểu</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ei < d.exercises.length - 1 && !(e.groupId && d.exercises[ei + 1]?.groupId === e.groupId) && (
                    <Button size="sm" variant="ghost" icon={<Link2 size={16} />} onClick={() => updDay(d.id, (x) => ({ ...x, exercises: linkWithNext(x.exercises, ei, () => uid('grp')) }))}>
                      Ghép với bài dưới
                    </Button>
                  )}
                  {label && (
                    <Button size="sm" variant="ghost" icon={<Unlink size={16} />} onClick={() => updDay(d.id, (x) => ({ ...x, exercises: ungroup(x.exercises, ei) }))}>
                      Tách nhóm
                    </Button>
                  )}
                </div>
              </li>
              ));
              if (!g.letter) return rows;
              return (
                <li key={g.groupId} className="rounded-2xl border-2 border-accent/50 p-2" aria-label={`Superset ${g.letter}`}>
                  <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-accent">Superset {g.letter} · làm xen kẽ, nghỉ sau bài cuối</div>
                  <ul className="space-y-2">{rows}</ul>
                </li>
              );
            })}
          </ul>
          <Button className="mt-3" block icon={<Plus size={18} />} onClick={() => setPickFor(d.id)}>
            Thêm bài tập
          </Button>
        </Card>
      ))}
      <Button
        block
        variant="outline"
        icon={<Plus size={18} />}
        onClick={() => update((x) => ({ ...x, days: [...x.days, { id: uid('day'), name: `Buổi ${String.fromCharCode(65 + x.days.length)}`, exercises: [] }] }))}
      >
        Thêm buổi
      </Button>
      {dirty && <p className="text-center text-xs text-warn">Có thay đổi chưa lưu.</p>}
      <ExercisePicker
        open={!!pickFor}
        onClose={() => setPickFor(null)}
        onPick={(exerciseId) =>
          pickFor &&
          updDay(pickFor, (x) => ({
            ...x,
            exercises: [...x.exercises, { id: uid('pe'), exerciseId, sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: settings.restTimerDefaultSec }],
          }))
        }
      />
    </div>
    </FieldErrorsContext.Provider>
  );
}
