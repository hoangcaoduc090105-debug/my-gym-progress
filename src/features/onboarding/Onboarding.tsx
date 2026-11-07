import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, NumberInput, Segmented } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { addProgramFromTemplate, getSettings, saveBodyMetric, saveProfile, saveSettings } from '../../db/repo';
import { fromDisplay, type WeightUnit } from '../../lib/units';
import { suggestProteinRange } from '../../domain/nutrition';
import { nowISO, todayISO } from '../../lib/date';
import { FieldErrorsContext, useFieldErrors } from '../../lib/formErrors';
import { loadSchemas } from '../../db/repo';

/** Lần đầu mở app: người dùng tự nhập hồ sơ. App không chứa sẵn dữ liệu cá nhân nào. */
export function Onboarding() {
  const nav = useNavigate();
  const { toastError, toast } = useFeedback();
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  // v1.9: cân nặng nhập theo kg hoặc lb; lưu luôn là kg và ghi đơn vị đã chọn vào Cài đặt.
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const weightKg = weight == null ? null : fromDisplay(weight, unit);
  const [age, setAge] = useState<number | null>(null);
  const [goals, setGoals] = useState('Tăng cơ, tăng sức mạnh: vai rộng, ngực dày, lưng chữ V, tay phát triển, cơ bụng rõ nét.');
  const [pMin, setPMin] = useState<number | null>(null);
  const [pMax, setPMax] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // v1.9: giáo án bắt đầu — 'default' = Toàn thân 3 buổi có sẵn; còn lại là khóa mẫu trong programTemplates.
  const [programKey, setProgramKey] = useState<'default' | 'fullbody-2' | 'upper-lower-4' | 'ppl-6'>('default');

  const suggestion = weightKg ? suggestProteinRange(weightKg) : null;
  const effMin = pMin ?? suggestion?.min ?? null;
  const effMax = pMax ?? suggestion?.max ?? null;

  const fe = useFieldErrors();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Kiểm tra trước bằng đúng schema của repository => lỗi hiện dưới từng ô, không toast.
    const S = await loadSchemas();
    const now = nowISO();
    const p = S.profileSchema.safeParse({
      id: 'me', sex, heightCm: height, age: age ?? null, goals, proteinTargetMinG: effMin, proteinTargetMaxG: effMax,
      activityLevel: null, calorieTarget: null, createdAt: now, updatedAt: now,
    });
    const w = weightKg == null ? null : S.bodyMetricSchema.safeParse({ id: 'x', date: todayISO(), weightKg, createdAt: now, updatedAt: now });
    const issues = [...(p.success ? [] : p.error.issues), ...(w && !w.success ? w.error.issues : [])];
    if (issues.length) return fe.setFromZod({ issues });
    setBusy(true);
    try {
      await saveProfile({ sex, heightCm: height!, age: age ?? null, goals, proteinTargetMinG: effMin!, proteinTargetMaxG: effMax!, activityLevel: null, calorieTarget: null });
      if (weightKg) await saveBodyMetric({ date: todayISO(), weightKg });
      if (unit === 'lb') {
        const { id: _id, updatedAt: _u, ...cur } = await getSettings();
        void _id, _u;
        await saveSettings({ ...cur, weightUnit: 'lb' });
      }
      if (programKey !== 'default') await addProgramFromTemplate(programKey, { activate: true });
      toast('Đã lưu hồ sơ. Chúc bạn tập tốt!');
      nav('/', { replace: true });
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-[calc(24px+env(safe-area-inset-top))]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-ink">
          <Dumbbell size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Gym Progress</h1>
          <p className="text-sm text-muted">Thiết lập hồ sơ ban đầu</p>
        </div>
      </div>
      <Card className="mb-4">
        <div className="flex gap-3 text-sm text-muted">
          <ShieldCheck className="shrink-0 text-ok" size={20} />
          <p>Mọi dữ liệu chỉ lưu trên thiết bị này (IndexedDB). Ứng dụng không có máy chủ, không gửi dữ liệu đi đâu, không dùng AI API. Hãy xuất sao lưu định kỳ trong phần Cài đặt.</p>
        </div>
      </Card>
      <FieldErrorsContext.Provider value={fe}>
      <form onSubmit={submit} className="space-y-4" ref={fe.containerRef as React.RefObject<HTMLFormElement>} noValidate>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giới tính" className="col-span-2">
              {(id) => (
                <select id={id} value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              )}
            </Field>
            <Field name="heightCm" label="Chiều cao (cm) *">{(id) => <NumberInput id={id} value={height} onChange={setHeight} placeholder="vd. 170" />}</Field>
            <Field name="weightKg" label={`Cân nặng hiện tại (${unit})`}>
              {(id) => (
                <div className="flex gap-2">
                  <NumberInput id={id} value={weight} onChange={setWeight} placeholder={unit === 'kg' ? 'vd. 70' : 'vd. 155'} className="min-w-0 flex-1" />
                  <Segmented
                    value={unit}
                    onChange={setUnit}
                    options={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lb', label: 'lb' },
                    ]}
                  />
                </div>
              )}
            </Field>
            <Field name="age" label="Tuổi (không bắt buộc)" className="col-span-2" hint="Chỉ dùng khi bạn muốn tự đặt mục tiêu calories. App không tự tính calories.">
              {(id) => <NumberInput id={id} value={age} onChange={setAge} placeholder="—" />}
            </Field>
            <Field name="goals" label="Mục tiêu" className="col-span-2">
              {(id) => <textarea id={id} rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} />}
            </Field>
          </div>
        </Card>
        <Card title="Mục tiêu protein mỗi ngày">
          <div className="grid grid-cols-2 gap-3">
            <Field name="proteinTargetMinG" label="Tối thiểu (g)">{(id) => <NumberInput id={id} value={effMin} onChange={setPMin} placeholder="105" />}</Field>
            <Field name="proteinTargetMaxG" label="Tối đa (g)">{(id) => <NumberInput id={id} value={effMax} onChange={setPMax} placeholder="130" />}</Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            Gợi ý theo cân nặng: 1,6–2,0 g/kg/ngày, làm tròn 5 g. Phân tích gộp của Morton và cộng sự (2018) cho thấy lợi ích tăng cơ từ protein chững lại quanh mức ~1,6 g/kg/ngày. Bạn có thể sửa bất kỳ lúc nào trong Cài đặt.
          </p>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">Bạn tập được mấy buổi mỗi tuần?</div>
          <div role="radiogroup" aria-label="Giáo án bắt đầu" className="grid grid-cols-2 gap-2">
            {(
              [
                ['default', '3 buổi', 'Toàn thân — Người mới'],
                ['fullbody-2', '2 buổi', 'Toàn thân — Người bận'],
                ['upper-lower-4', '4 buổi', 'Trên/Dưới'],
                ['ppl-6', '6 buổi', 'Đẩy/Kéo/Chân'],
              ] as const
            ).map(([k, n, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={programKey === k}
                onClick={() => setProgramKey(k)}
                className={`min-h-[56px] rounded-xl border px-3 py-2 text-left ${programKey === k ? 'border-accent bg-accent/10' : 'border-line'}`}
              >
                <div className="font-semibold">{n}</div>
                <div className="text-xs text-muted">{label}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Chọn sai cũng không sao: đổi giáo án bất kỳ lúc nào trong Tập → Giáo án.</p>
        </Card>
        <Button type="submit" variant="primary" size="lg" block disabled={busy}>
          Bắt đầu
        </Button>
        <p className="text-center text-xs text-muted">
          Đã có bản sao lưu? Sau khi tạo hồ sơ, vào Cài đặt → Nhập dữ liệu JSON để khôi phục (chọn "Thay thế toàn bộ").
        </p>
      </form>
      </FieldErrorsContext.Provider>
    </div>
  );
}
