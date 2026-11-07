import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type BodyRegion, type Equipment, type MuscleGroup } from '../../db/types';
import { Button, Card, Field, PageHeader, Spinner, Toggle, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { loadSchemas, saveCustomExercise } from '../../db/repo';
import { FieldErrorsContext, useFieldErrors } from '../../lib/formErrors';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const LOWER: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

export function ExerciseForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast, toastError } = useFeedback();
  const all = useLiveQuery(() => db.exercises.toArray(), []);
  const [loaded, setLoaded] = useState(!id);
  const [nameVi, setNameVi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup>('chest');
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [region, setRegion] = useState<BodyRegion | 'auto'>('auto');
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const fe = useFieldErrors();

  useEffect(() => {
    if (!id) return;
    void db.exercises.get(id).then((e) => {
      if (!e || !e.isCustom) {
        toast('Chỉ sửa được bài tập tự tạo', 'error');
        nav(-1);
        return;
      }
      setNameVi(e.nameVi);
      setNameEn(e.nameEn);
      setPrimary(e.primaryMuscle);
      setSecondary(e.secondaryMuscles);
      setEquipment(e.equipment);
      setRegion(e.region);
      setIsBodyweight(e.isBodyweight);
      setInstructions(e.instructions.join('\n'));
      setMistakes(e.commonMistakes.join('\n'));
      setAlts(e.alternativeIds);
      setLoaded(true);
    });
  }, [id, nav, toast]);

  if (!loaded || !all) return <Spinner />;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const r: BodyRegion = region !== 'auto' ? region : primary === 'abs' ? 'core' : LOWER.includes(primary) ? 'lower' : 'upper';
    const payload = {
      nameVi,
      nameEn,
      primaryMuscle: primary,
      secondaryMuscles: secondary.filter((m) => m !== primary),
      equipment,
      region: r,
      isBodyweight: isBodyweight || equipment === 'bodyweight',
      instructions: lines(instructions),
      commonMistakes: lines(mistakes),
      alternativeIds: alts,
    };
    const S = await loadSchemas();
    const v = S.exerciseSchema.safeParse({ ...payload, id: id ?? 'new', isCustom: true, createdAt: 'x', updatedAt: 'x' });
    if (!v.success) return fe.setFromZod(v.error);
    try {
      const e = await saveCustomExercise({
        id,
        nameVi,
        nameEn,
        primaryMuscle: primary,
        secondaryMuscles: secondary.filter((m) => m !== primary),
        equipment,
        region: r,
        isBodyweight: isBodyweight || equipment === 'bodyweight',
        instructions: lines(instructions),
        commonMistakes: lines(mistakes),
        alternativeIds: alts,
      });
      toast('Đã lưu bài tập');
      nav(`/thu-vien/${e.id}`, { replace: true });
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <FieldErrorsContext.Provider value={fe}>
    <form onSubmit={submit} className="space-y-4" ref={fe.containerRef as React.RefObject<HTMLFormElement>} noValidate>
      <PageHeader title={id ? 'Sửa bài tập' : 'Thêm bài tập'} back={true} />
      <Card>
        <div className="space-y-3">
          <Field name="nameVi" label="Tên tiếng Việt *">{(f) => <input id={f} value={nameVi} onChange={(e) => setNameVi(e.target.value)} />}</Field>
          <Field name="nameEn" label="Tên tiếng Anh">{(f) => <input id={f} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhóm cơ chính">
              {(f) => (
                <select id={f} value={primary} onChange={(e) => setPrimary(e.target.value as MuscleGroup)}>
                  {MUSCLE_GROUPS.map((m) => (
                    <option key={m} value={m}>
                      {MUSCLE_LABELS[m]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Dụng cụ">
              {(f) => (
                <select id={f} value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
                  {EQUIPMENT.map((m) => (
                    <option key={m} value={m}>
                      {EQUIPMENT_LABELS[m]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-muted">Nhóm cơ phụ</div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter((m) => m !== primary).map((m) => {
                const on = secondary.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSecondary((s) => (on ? s.filter((x) => x !== m) : [...s, m]))}
                    className={cx('h-9 rounded-full px-3 text-sm', on ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
                  >
                    {MUSCLE_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Vùng cơ thể (dùng cho bước tăng tạ gợi ý)">
            {(f) => (
              <select id={f} value={region} onChange={(e) => setRegion(e.target.value as BodyRegion | 'auto')}>
                <option value="auto">Tự động theo nhóm cơ chính</option>
                <option value="upper">Thân trên</option>
                <option value="lower">Thân dưới</option>
                <option value="core">Thân giữa (core)</option>
              </select>
            )}
          </Field>
          <Toggle label="Bài trọng lượng cơ thể" hint="Cho phép ghi mức tạ 0" checked={isBodyweight || equipment === 'bodyweight'} onChange={setIsBodyweight} />
        </div>
      </Card>
      <Card>
        <div className="space-y-3">
          <Field label="Hướng dẫn thực hiện" hint="Mỗi bước một dòng">
            {(f) => <textarea id={f} rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />}
          </Field>
          <Field label="Lỗi kỹ thuật thường gặp" hint="Mỗi lỗi một dòng">
            {(f) => <textarea id={f} rows={3} value={mistakes} onChange={(e) => setMistakes(e.target.value)} />}
          </Field>
          <Field label="Bài tập thay thế">
            {(f) => (
              <select
                id={f}
                value=""
                onChange={(e) => { const v = e.target.value; if (v) setAlts((a) => (a.includes(v) ? a : [...a, v])); }}
              >
                <option value="">+ Chọn bài thay thế…</option>
                {all
                  .filter((x) => x.id !== id && !alts.includes(x.id))
                  .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nameVi} ({MUSCLE_LABELS[x.primaryMuscle]})
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {alts.map((a) => (
              <button key={a} type="button" className="rounded-full bg-surface2 px-3 py-1 text-sm" onClick={() => setAlts((x) => x.filter((y) => y !== a))}>
                {all.find((x) => x.id === a)?.nameVi ?? a} ✕
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Button type="submit" variant="primary" size="lg" block>
        Lưu bài tập
      </Button>
    </form>
    </FieldErrorsContext.Provider>
  );
}
