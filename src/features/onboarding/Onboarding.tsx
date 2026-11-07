import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, NumberInput } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { saveBodyMetric, saveProfile } from '../../db/repo';
import { suggestProteinRange } from '../../domain/nutrition';
import { todayISO } from '../../lib/date';

/** Lần đầu mở app: người dùng tự nhập hồ sơ. App không chứa sẵn dữ liệu cá nhân nào. */
export function Onboarding() {
  const nav = useNavigate();
  const { toastError, toast } = useFeedback();
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [goals, setGoals] = useState('Tăng cơ, tăng sức mạnh: vai rộng, ngực dày, lưng chữ V, tay phát triển, cơ bụng rõ nét.');
  const [pMin, setPMin] = useState<number | null>(null);
  const [pMax, setPMax] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestion = weight ? suggestProteinRange(weight) : null;
  const effMin = pMin ?? suggestion?.min ?? null;
  const effMax = pMax ?? suggestion?.max ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!height) return toast('Vui lòng nhập chiều cao.', 'error');
    if (!effMin || !effMax) return toast('Vui lòng nhập cân nặng hoặc mục tiêu protein.', 'error');
    setBusy(true);
    try {
      await saveProfile({ sex, heightCm: height, age: age ?? null, goals, proteinTargetMinG: effMin, proteinTargetMaxG: effMax, activityLevel: null, calorieTarget: null });
      if (weight) await saveBodyMetric({ date: todayISO(), weightKg: weight });
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
      <form onSubmit={submit} className="space-y-4">
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
            <Field label="Chiều cao (cm) *">{(id) => <NumberInput id={id} value={height} onChange={setHeight} placeholder="vd. 170" required />}</Field>
            <Field label="Cân nặng hiện tại (kg)">{(id) => <NumberInput id={id} value={weight} onChange={setWeight} placeholder="vd. 70" />}</Field>
            <Field label="Tuổi (không bắt buộc)" className="col-span-2" hint="Chỉ dùng khi bạn muốn tự đặt mục tiêu calories. App không tự tính calories.">
              {(id) => <NumberInput id={id} value={age} onChange={setAge} placeholder="—" />}
            </Field>
            <Field label="Mục tiêu" className="col-span-2">
              {(id) => <textarea id={id} rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} />}
            </Field>
          </div>
        </Card>
        <Card title="Mục tiêu protein mỗi ngày">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tối thiểu (g)">{(id) => <NumberInput id={id} value={effMin} onChange={setPMin} placeholder="105" />}</Field>
            <Field label="Tối đa (g)">{(id) => <NumberInput id={id} value={effMax} onChange={setPMax} placeholder="130" />}</Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            Gợi ý theo cân nặng: 1,6–2,0 g/kg/ngày, làm tròn 5 g. Phân tích gộp của Morton và cộng sự (2018) cho thấy lợi ích tăng cơ từ protein chững lại quanh mức ~1,6 g/kg/ngày. Bạn có thể sửa bất kỳ lúc nào trong Cài đặt.
          </p>
        </Card>
        <Button type="submit" variant="primary" size="lg" block disabled={busy}>
          Bắt đầu
        </Button>
        <p className="text-center text-xs text-muted">
          Đã có bản sao lưu? Sau khi tạo hồ sơ, vào Cài đặt → Nhập dữ liệu JSON để khôi phục (chọn "Thay thế toàn bộ").
        </p>
      </form>
    </div>
  );
}
