import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileSpreadsheet, Link2, Plus, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { MUSCLE_GROUPS, MUSCLE_LABELS, type Exercise, type MuscleGroup } from '../../db/types';
import { Badge, Button, Card, Field, FormError, PageHeader, Segmented, Spinner } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { parseCsv } from '../../backup/csvParse';
import {
  buildSessions,
  detectCsvFormat,
  distinctNames,
  matchExercises,
  normalizeName,
  parseHevy,
  parseStrong,
  splitDuplicates,
  type Detected,
  type ImportedWorkout,
} from '../../backup/workoutImport';
import { importWorkouts, readCsvNameMap } from '../../db/importWorkouts';
import { checkFreeSpace, formatBytes, SPACE_FACTOR } from '../../lib/storage';
import { FieldErrorsContext, useFieldErrors } from '../../lib/formErrors';
import { formatDate, nowISO } from '../../lib/date';
import { uid } from '../../lib/id';
import { ExercisePicker } from '../workout/ExercisePicker';

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const LOWER: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

type Choice = { kind: 'id'; id: string } | { kind: 'new'; muscle: MuscleGroup | '' } | null;

/** Nhập lịch sử từ Strong / Hevy: chọn tệp → (Strong: hỏi đơn vị) → ghép tên bài → xem trước → nhập. */
export default function CsvImportPage() {
  const { toastError } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const exList = useLiveQuery(() => db.exercises.toArray(), []);
  const exById = useMemo(() => new Map((exList ?? []).map((e) => [e.id, e])), [exList]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [det, setDet] = useState<Detected | null>(null);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [workouts, setWorkouts] = useState<ImportedWorkout[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [autoMatched, setAutoMatched] = useState<string[]>([]);
  const [dupes, setDupes] = useState(0);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [result, setResult] = useState<{ written: number; skipped: number } | null>(null);
  const fe = useFieldErrors();

  function reset() {
    setError(null);
    setRows(null);
    setDet(null);
    setWorkouts(null);
    setChoices({});
    setAutoMatched([]);
    setResult(null);
    fe.clearAll();
  }

  async function prepare(ws: ImportedWorkout[]) {
    if (ws.length === 0) {
      setError({ title: 'Không tìm thấy buổi tập nào có hiệp hợp lệ (cần số lần > 0) trong tệp.' });
      return;
    }
    const all = exList ?? (await db.exercises.toArray());
    const m = matchExercises(distinctNames(ws), all, await readCsvNameMap());
    const c: Record<string, Choice> = {};
    const auto: string[] = [];
    for (const [name, id] of m) {
      c[name] = id ? { kind: 'id', id } : null;
      if (id) auto.push(name);
    }
    // Đếm trước số buổi trùng (cùng ngày + tên buổi + số hiệp) để xem trước.
    const probe = buildSessions(ws, new Map([...m].map(([n]) => [n, 'x'])), (p) => `${p}-probe`, nowISO());
    const dates = ws.map((w) => w.date).sort();
    const existing = await db.sessions.where('date').between(dates[0]!, dates[dates.length - 1]!, true, true).toArray();
    setDupes(splitDuplicates(probe, existing).skipped);
    setChoices(c);
    setAutoMatched(auto);
    setWorkouts(ws);
  }

  async function onFile(f: File | undefined) {
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    reset();
    setFileName(f.name);
    if (f.size > MAX_CSV_BYTES) return setError({ title: `Tệp quá lớn (${formatBytes(f.size)}). Giới hạn ${formatBytes(MAX_CSV_BYTES)}.` });
    const space = await checkFreeSpace(f.size, SPACE_FACTOR);
    if (space) return setError({ title: space });
    setBusy(true);
    try {
      const r = parseCsv(await f.text());
      const d = detectCsvFormat(r[0] ?? []);
      setRows(r);
      setDet(d);
      if (d.format === null) {
        setError({ title: 'Chưa hỗ trợ định dạng tệp này.', detail: `Tiêu đề đọc được: ${d.header.filter(Boolean).join(', ') || '(trống)'}. Hiện nhận tệp xuất từ Strong và Hevy.` });
        return;
      }
      if (d.format === 'hevy') await prepare(parseHevy(r));
      else if (d.unit) await prepare(parseStrong(r, d.unit, d.weightCol));
      // Strong cột "Weight" không rõ đơn vị => chờ người dùng chọn kg/lb.
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  const names = workouts ? distinctNames(workouts) : [];
  const unknown = names.filter((n) => !autoMatched.includes(n));
  const unmapped = names.filter((n) => {
    const c = choices[n];
    return !c || (c.kind === 'new' && !c.muscle);
  });
  const dates = workouts ? workouts.map((w) => w.date).sort() : [];

  async function doImport() {
    if (!workouts) return;
    const issues = names.flatMap((n, i) => {
      const c = choices[n];
      if (!c) return [{ path: [`map.${i}`], message: 'Chọn bài trong thư viện hoặc tạo bài mới' }];
      if (c.kind === 'new' && !c.muscle) return [{ path: [`muscle.${i}`], message: 'Chọn nhóm cơ chính' }];
      return [];
    });
    if (issues.length) return fe.setFromZod({ issues });
    setBusy(true);
    try {
      const now = nowISO();
      const nameToId = new Map<string, string>();
      const newExercises: Exercise[] = [];
      for (const n of names) {
        const c = choices[n]!;
        if (c.kind === 'id') nameToId.set(n, c.id);
        else {
          const muscle = c.muscle as MuscleGroup;
          const ex: Exercise = {
            id: uid('ex'),
            nameVi: n,
            nameEn: n,
            primaryMuscle: muscle,
            secondaryMuscles: [],
            equipment: 'other',
            region: muscle === 'abs' ? 'core' : LOWER.includes(muscle) ? 'lower' : 'upper',
            isBodyweight: false,
            instructions: [],
            commonMistakes: [],
            alternativeIds: [],
            isCustom: true,
            createdAt: now,
            updatedAt: now,
          };
          newExercises.push(ex);
          nameToId.set(n, ex.id);
        }
      }
      const sessions = buildSessions(workouts, nameToId, uid, now);
      const nameMap = Object.fromEntries([...nameToId].map(([n, id]) => [normalizeName(n), id]));
      setResult(await importWorkouts({ sessions, newExercises, nameMap }));
      setWorkouts(null);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!exList) return <Spinner />;
  return (
    <div className="space-y-4 pb-20">
      <PageHeader title="Nhập từ Strong / Hevy" subtitle="Chuyển lịch sử tập từ app khác (tệp CSV)" back="/cai-dat#sao-luu" />
      <Card>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            <strong className="text-text">Strong</strong>: Settings → Export Strong Data → CSV.
          </li>
          <li>
            <strong className="text-text">Hevy</strong>: Profile → Settings → Export &amp; Import Data → Export Workouts.
          </li>
          <li>Tệp chỉ được đọc trên máy này, không gửi đi đâu. Buổi đã có (cùng ngày, tên buổi, số hiệp) sẽ được bỏ qua.</li>
        </ul>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" data-testid="csv-input" onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button block variant="primary" icon={<Upload size={18} />} disabled={busy} onClick={() => fileRef.current?.click()}>
          Chọn tệp CSV
        </Button>
        {fileName && <p className="mt-2 text-xs text-muted">Tệp: {fileName}</p>}
      </Card>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <div className="font-semibold">{error.title}</div>
          {error.detail && <div className="mt-1 break-words text-xs">{error.detail}</div>}
        </div>
      )}

      {det?.format === 'strong' && det.unit === null && !workouts && !result && (
        <Card title="Đơn vị cột Weight">
          <p className="mb-3 text-sm text-muted">Tệp Strong chỉ ghi "Weight", không rõ kg hay lb. Strong dùng đơn vị bạn đã chọn trong app đó.</p>
          <Segmented
            className="mb-3 w-full"
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
          <Button block variant="primary" disabled={busy} onClick={() => rows && void prepare(parseStrong(rows, unit, det.weightCol))}>
            Tiếp tục
          </Button>
        </Card>
      )}

      {workouts && (
        <FieldErrorsContext.Provider value={fe}>
          <div className="space-y-4" ref={fe.containerRef as React.RefObject<HTMLDivElement>}>
            <Card title="Xem trước">
              <div className="grid grid-cols-2 gap-2 text-sm" data-testid="csv-preview">
                <div className="rounded-xl bg-surface2 p-3">
                  <div className="text-xs text-muted">Số buổi</div>
                  <div className="text-lg font-bold tabular">{workouts.length}</div>
                </div>
                <div className="rounded-xl bg-surface2 p-3">
                  <div className="text-xs text-muted">Số bài</div>
                  <div className="text-lg font-bold tabular">{names.length}</div>
                </div>
                <div className="col-span-2 rounded-xl bg-surface2 p-3">
                  <div className="text-xs text-muted">Khoảng ngày</div>
                  <div className="font-semibold">
                    {formatDate(dates[0]!)} – {formatDate(dates[dates.length - 1]!)}
                  </div>
                </div>
                <div className="rounded-xl bg-surface2 p-3">
                  <div className="text-xs text-muted">Tên chưa ghép</div>
                  <div className={`text-lg font-bold tabular ${unmapped.length ? 'text-warn' : 'text-ok'}`}>{unmapped.length}</div>
                </div>
                <div className="rounded-xl bg-surface2 p-3">
                  <div className="text-xs text-muted">Buổi trùng (bỏ qua)</div>
                  <div className="text-lg font-bold tabular">{dupes}</div>
                </div>
              </div>
              {autoMatched.length > 0 && (
                <details className="mt-3 text-xs text-muted">
                  <summary className="cursor-pointer">Đã tự ghép {autoMatched.length} tên</summary>
                  <ul className="mt-1 space-y-0.5">
                    {autoMatched.map((n) => {
                      const c = choices[n];
                      return (
                        <li key={n}>
                          {n} → {c?.kind === 'id' ? exById.get(c.id)?.nameVi : '?'}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}
            </Card>

            {unknown.length > 0 && (
              <Card title="Ghép bài tập">
                <FormError />
                <p className="mb-3 text-sm text-muted">Các tên dưới đây chưa có trong thư viện. Chọn bài tương ứng hoặc tạo bài mới. Lần sau app nhớ cách ghép này.</p>
                <ul className="space-y-3">
                  {unknown.map((n) => {
                    const i = names.indexOf(n);
                    const c = choices[n];
                    return (
                      <li key={n} className="rounded-xl border border-line p-3" data-testid="csv-unmatched">
                        <div className="mb-2 font-medium">{n}</div>
                        <div className="mb-2 text-sm">
                          {c?.kind === 'id' ? (
                            <span className="inline-flex items-center gap-1 text-ok">
                              <CheckCircle2 size={16} /> {exById.get(c.id)?.nameVi}
                            </span>
                          ) : c?.kind === 'new' ? (
                            <Badge tone="info">Tạo bài mới</Badge>
                          ) : (
                            <span className="text-warn">Chưa ghép</span>
                          )}
                        </div>
                        <Field name={`map.${i}`} label="Ghép với" className="[&>label]:sr-only">
                          {(id) => (
                            <div id={id} className="grid grid-cols-2 gap-2" tabIndex={-1}>
                              <Button size="sm" icon={<Link2 size={16} />} onClick={() => setPickFor(n)} aria-label={`Chọn bài cho ${n}`}>
                                Chọn bài
                              </Button>
                              <Button
                                size="sm"
                                variant={c?.kind === 'new' ? 'primary' : 'outline'}
                                icon={<Plus size={16} />}
                                onClick={() => {
                                  fe.clear(`map.${i}`);
                                  setChoices((x) => ({ ...x, [n]: { kind: 'new', muscle: '' } }));
                                }}
                              >
                                Tạo bài mới
                              </Button>
                            </div>
                          )}
                        </Field>
                        {c?.kind === 'new' && (
                          <Field name={`muscle.${i}`} label="Nhóm cơ chính (bắt buộc)" className="mt-2">
                            {(id) => (
                              <select
                                id={id}
                                value={c.muscle}
                                onChange={(e) => {
                                  const v = e.target.value as MuscleGroup | '';
                                  setChoices((x) => ({ ...x, [n]: { kind: 'new', muscle: v } }));
                                }}
                              >
                                <option value="">— Chọn —</option>
                                {MUSCLE_GROUPS.map((m) => (
                                  <option key={m} value={m}>
                                    {MUSCLE_LABELS[m]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </Field>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <Button block size="lg" variant="primary" icon={<FileSpreadsheet size={18} />} disabled={busy} onClick={() => void doImport()}>
              Nhập {workouts.length - dupes} buổi
            </Button>
          </div>
        </FieldErrorsContext.Provider>
      )}

      {result && (
        <Card className="border-ok/40 bg-ok/5">
          <div className="font-semibold text-ok" role="status">
            Đã nhập {result.written} buổi{result.skipped ? `, bỏ qua ${result.skipped} buổi trùng` : ''}.
          </div>
          <Link to="/lich-tap?tab=history" className="mt-2 inline-flex h-11 items-center text-sm font-semibold text-info underline">
            Xem trong Lịch sử →
          </Link>
        </Card>
      )}

      <ExercisePicker
        open={!!pickFor}
        onClose={() => setPickFor(null)}
        title={pickFor ? `Ghép "${pickFor}" với` : 'Chọn bài tập'}
        onPick={(id) => {
          if (!pickFor) return;
          fe.clear(`map.${names.indexOf(pickFor)}`);
          setChoices((x) => ({ ...x, [pickFor]: { kind: 'id', id } }));
        }}
      />
    </div>
  );
}
