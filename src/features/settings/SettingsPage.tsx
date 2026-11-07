import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import type { Profile, Settings } from '../../db/types';
import { Button, Card, Field, NumberInput, PageHeader, Segmented, Spinner, Toggle } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useProfile, useSettings } from '../../app/useAppData';
import { saveProfile, saveSettings } from '../../db/repo';
import { suggestProteinRange } from '../../domain/nutrition';
import { latest } from '../../domain/bodyTrends';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { DataManagement } from './DataManagement';
import { Trash } from './Trash';
import { REFERENCES, USAGE_NOTES } from './References';

export function SettingsPage() {
  const profile = useProfile();
  const settings = useSettings();
  const loaded = useLiveQuery(() => db.settings.get('app').then((s) => s ?? null), []);
  if (!profile || loaded === undefined) return <Spinner />;
  return (
    <div className="space-y-4">
      <PageHeader title="Cài đặt" subtitle={`Phiên bản ${__APP_VERSION__}`} />
      <ProfileForm profile={profile} />
      <TrainingForm settings={settings} />
      <DataManagement />
      <Trash />
      <Card title="Quyền riêng tư">
        <div className="flex gap-2 text-sm text-muted">
          <ShieldCheck size={18} className="shrink-0 text-ok" />
          <ul className="list-disc space-y-1 pl-4">
            <li>Không có máy chủ, không tài khoản, không quảng cáo, không theo dõi.</li>
            <li>Không tích hợp AI/LLM API, không dùng API key. Mọi phép tính chạy bằng JavaScript trên thiết bị.</li>
            <li>Chính sách bảo mật nội dung (CSP) chặn mọi kết nối ra ngoài.</li>
          </ul>
        </div>
      </Card>
      <Card title="Nguồn tham khảo">
        <ul className="mb-3 space-y-1.5 text-sm">
          {USAGE_NOTES.map(([k, v]) => (
            <li key={k}>
              <span className="font-medium">{k}:</span> <span className="text-muted">{v}</span>
            </li>
          ))}
        </ul>
        <ol className="space-y-2 text-xs leading-relaxed text-muted">
          {REFERENCES.map((r) => (
            <li key={r} className="break-words pl-4 -indent-4">
              {r}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Ứng dụng phục vụ theo dõi cá nhân, không thay thế tư vấn y tế, dinh dưỡng hay huấn luyện chuyên môn.</p>
      </Card>
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { toast, toastError } = useFeedback();
  const [p, setP] = useState(profile);
  const weight = useLiveQuery(async () => latest(await db.bodyMetrics.toArray(), 'weightKg'), []);
  useEffect(() => setP(profile), [profile]);
  const sug = weight ? suggestProteinRange(weight.value) : null;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save() {
    try {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = p;
      void _i, _c, _u;
      await saveProfile(rest);
      toast('Đã lưu hồ sơ');
    } catch (e) {
      toastError(e);
    }
  }
  return (
    <Card title="Hồ sơ & mục tiêu">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Giới tính">
          {(id) => (
            <select id={id} value={p.sex} onChange={(e) => set('sex', e.target.value as Profile['sex'])}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          )}
        </Field>
        <Field label="Chiều cao (cm)">{(id) => <NumberInput id={id} value={p.heightCm} onChange={(v) => set('heightCm', v ?? 0)} />}</Field>
        <Field label="Tuổi">{(id) => <NumberInput id={id} value={p.age ?? null} onChange={(v) => set('age', v == null ? null : Math.round(v))} placeholder="—" />}</Field>
        <Field label="Mức vận động">
          {(id) => (
            <select id={id} value={p.activityLevel ?? ''} onChange={(e) => set('activityLevel', (e.target.value || null) as Profile['activityLevel'])}>
              <option value="">Chưa khai báo</option>
              <option value="low">Thấp</option>
              <option value="moderate">Trung bình</option>
              <option value="high">Cao</option>
            </select>
          )}
        </Field>
        <Field label="Mục tiêu tập luyện" className="col-span-2">
          {(id) => <textarea id={id} rows={2} value={p.goals} onChange={(e) => set('goals', e.target.value)} />}
        </Field>
        <Field label="Protein tối thiểu (g/ngày)">{(id) => <NumberInput id={id} value={p.proteinTargetMinG} onChange={(v) => set('proteinTargetMinG', v ?? 0)} />}</Field>
        <Field label="Protein tối đa (g/ngày)">{(id) => <NumberInput id={id} value={p.proteinTargetMaxG} onChange={(v) => set('proteinTargetMaxG', v ?? 0)} />}</Field>
        {sug && (
          <div className="col-span-2 -mt-1 flex items-center justify-between gap-2 text-xs text-muted">
            <span>
              Gợi ý theo cân nặng gần nhất {weight?.value} kg (1,6–2,0 g/kg): {sug.min}–{sug.max} g
            </span>
            <Button size="sm" variant="ghost" onClick={() => setP((x) => ({ ...x, proteinTargetMinG: sug.min, proteinTargetMaxG: sug.max }))}>
              Áp dụng
            </Button>
          </div>
        )}
        <Field label="Mục tiêu calories (kcal)" className="col-span-2" hint="Không bắt buộc. App không tự tính calories vì thiếu dữ liệu tiêu hao năng lượng thực tế.">
          {(id) => <NumberInput id={id} value={p.calorieTarget ?? null} onChange={(v) => set('calorieTarget', v)} placeholder="Để trống nếu chưa xác định" />}
        </Field>
        <Field label="Carb (g/ngày)">{(id) => <NumberInput id={id} value={p.carbTargetG ?? null} onChange={(v) => set('carbTargetG', v)} placeholder="—" />}</Field>
        <Field label="Fat (g/ngày)">{(id) => <NumberInput id={id} value={p.fatTargetG ?? null} onChange={(v) => set('fatTargetG', v)} placeholder="—" />}</Field>
      </div>
      <p className="mt-2 text-xs text-muted">Cân nặng được cập nhật trong mục Tiến độ cơ thể (mỗi lần cân là một bản ghi).</p>
      <Button className="mt-3" variant="primary" block icon={<Save size={18} />} onClick={() => void save()}>
        Lưu hồ sơ
      </Button>
    </Card>
  );
}

function TrainingForm({ settings }: { settings: Settings }) {
  const { toast, toastError } = useFeedback();
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const pr = s.progression;
  const setPr = <K extends keyof Settings['progression']>(k: K, v: Settings['progression'][K]) => setS((x) => ({ ...x, progression: { ...x.progression, [k]: v } }));

  async function save() {
    try {
      const { id: _i, updatedAt: _u, ...rest } = s;
      void _i, _u;
      await saveSettings(rest);
      toast('Đã lưu cài đặt tập luyện');
    } catch (e) {
      toastError(e);
    }
  }
  return (
    <Card title="Tập luyện">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nghỉ mặc định (giây)">{(id) => <NumberInput id={id} value={s.restTimerDefaultSec} onChange={(v) => setS((x) => ({ ...x, restTimerDefaultSec: Math.round(v ?? 90) }))} />}</Field>
          <Field label="Nhắc đo vòng (ngày)">{(id) => <NumberInput id={id} value={s.measurementReminderDays} onChange={(v) => setS((x) => ({ ...x, measurementReminderDays: Math.round(v ?? 14) }))} />}</Field>
          <Field label="Hệ số nhóm cơ phụ" hint="0 = chỉ tính nhóm chính">
            {(id) => <NumberInput id={id} value={s.secondaryMuscleFactor} onChange={(v) => setS((x) => ({ ...x, secondaryMuscleFactor: v ?? 0.5 }))} />}
          </Field>
          <Field label="Công thức 1RM">
            {(id) => (
              <select id={id} value={s.oneRmFormula} onChange={(e) => setS((x) => ({ ...x, oneRmFormula: e.target.value as Settings['oneRmFormula'] }))}>
                <option value="epley">Epley</option>
                <option value="brzycki">Brzycki</option>
              </select>
            )}
          </Field>
        </div>
        <Toggle label="Âm báo hết giờ nghỉ" checked={s.timerSound} onChange={(v) => setS((x) => ({ ...x, timerSound: v }))} />
        <Toggle label="Rung khi hết giờ nghỉ" hint="Chỉ trên thiết bị hỗ trợ (Android)" checked={s.timerVibrate} onChange={(v) => setS((x) => ({ ...x, timerVibrate: v }))} />

        <div className="rounded-xl bg-surface2 p-3">
          <div className="mb-2 text-sm font-semibold">Gợi ý tăng tạ (progressive overload)</div>
          <p className="mb-3 text-xs text-muted">
            Khi mọi hiệp ở mức tạ cao nhất đạt số lần tối đa trong khoảng mục tiêu và RIR ≥ ngưỡng, app gợi ý tăng tạ. Chỉ là gợi ý — giáo án không bị tự động thay đổi.
          </p>
          <div className="space-y-3">
            <Field label="RIR tối thiểu để gợi ý tăng" hint="RIR = số lần còn có thể làm thêm. Mặc định 2 để không phải tập tới thất bại.">
              {(id) => (
                <select id={id} value={pr.minRIR} onChange={(e) => setPr('minRIR', Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Segmented
              className="w-full"
              value={pr.mode}
              onChange={(v) => setPr('mode', v)}
              options={[
                { value: 'fixed', label: 'Bước cố định (kg)' },
                { value: 'percent', label: 'Theo %' },
              ]}
            />
            {pr.mode === 'fixed' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Thân trên (kg)">{(id) => <NumberInput id={id} value={pr.upperIncrementKg} onChange={(v) => setPr('upperIncrementKg', v ?? 2.5)} />}</Field>
                <Field label="Thân dưới (kg)">{(id) => <NumberInput id={id} value={pr.lowerIncrementKg} onChange={(v) => setPr('lowerIncrementKg', v ?? 5)} />}</Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tăng (%)">{(id) => <NumberInput id={id} value={pr.percent} onChange={(v) => setPr('percent', v ?? 5)} />}</Field>
                <Field label="Làm tròn tới (kg)">{(id) => <NumberInput id={id} value={pr.roundToKg} onChange={(v) => setPr('roundToKg', v ?? 1.25)} />}</Field>
              </div>
            )}
          </div>
        </div>
        <Button variant="primary" block icon={<Save size={18} />} onClick={() => void save()}>
          Lưu cài đặt tập luyện
        </Button>
      </div>
    </Card>
  );
}
