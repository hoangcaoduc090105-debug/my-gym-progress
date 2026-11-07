import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { MEAL_LABELS, MEAL_SLOTS, type Food, type FoodLog, type MealPlan, type MealPlanItem, type MealSlot } from '../../db/types';
import { Badge, Button, Card, EmptyState, Explain, Field, IconButton, Modal, NumberInput, PageHeader, Segmented, Spinner, Tabs, Toggle, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useProfile } from '../../app/useAppData';
import { addFoodLog, applyMealPlan, installVietnameseMenus, deleteFood, deleteFoodLog, deleteMealPlan, saveFood, saveMealPlan, toggleFavoriteFood, updateFoodLogServings } from '../../db/repo';
import { kcalFromMacros, proteinProgress, scale, sumLogs } from '../../domain/nutrition';
import { addDays, formatDate, todayISO } from '../../lib/date';
import { fmt0, fmt1 } from '../../lib/format';
import { normalizeVi } from '../workout/ExercisePicker';
import { checkMeal, proteinPerMeal, suggestProteinFill, type MealVerdict } from '../../domain/mealCheck';
import { VN_FOODS } from '../../data/vnFoods';
import { dishesAsFoods } from '../../data/southernDishes';

const ALL_PRESET = () => [...VN_FOODS, ...dishesAsFoods()];
const SOUTHERN_COUNT = dishesAsFoods().length;
import { VnPlans } from './VnPlans';
import { CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react';

type Tab = 'day' | 'foods' | 'plans';

export function NutritionPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'day';
  return (
    <div>
      <PageHeader title="Ăn uống" subtitle="Ghi món theo bữa — app tự chấm bữa đó đã đủ đạm chưa" />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'day', label: 'Hôm nay' },
          { value: 'foods', label: 'Món của tôi' },
          { value: 'plans', label: 'Thực đơn Việt' },
        ]}
      />
      {tab === 'day' && <DayLog />}
      {tab === 'foods' && <FoodsTab />}
      {tab === 'plans' && <PlansTab onApplied={() => setParams({ tab: 'day' }, { replace: true })} />}
    </div>
  );
}

const EstimateBadge = () => (
  <Badge tone="warn" className="shrink-0">
    Ước tính
  </Badge>
);

function ProgressBar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'info' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', tone === 'accent' ? 'bg-brand2' : 'bg-info')} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DayLog() {
  const profile = useProfile();
  const { toastError, confirm } = useFeedback();
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const logs = useLiveQuery(() => db.foodLogs.where('date').equals(date).toArray(), [date]);
  const plans = useLiveQuery(() => db.mealPlans.toArray(), []);
  const foods = useFoods();
  const { toast } = useFeedback();
  if (!logs || !profile) return <Spinner />;
  const t = sumLogs(logs);
  const perMeal = proteinPerMeal(profile.proteinTargetMinG, profile.mealsPerDay ?? 4);
  const pp = proteinProgress(t.proteinG, profile.proteinTargetMinG, profile.proteinTargetMaxG);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconButton label="Ngày trước" onClick={() => setDate((d) => addDays(d, -1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <input type="date" aria-label="Chọn ngày" className="flex-1 text-center" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <IconButton label="Ngày sau" onClick={() => setDate((d) => addDays(d, 1))}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-medium text-muted">Protein hôm {date === todayISO() ? 'nay' : formatDate(date)}</div>
            <div className="text-3xl font-bold tabular">
              {fmt1(pp.consumed)}
              <span className="ml-1 text-base font-medium text-muted">
                / {pp.min}–{pp.max} g
              </span>
            </div>
          </div>
          <Badge tone={pp.status === 'below' ? 'warn' : 'ok'}>{pp.status === 'below' ? `Còn ${fmt1(pp.remainingToMin)} g` : pp.status === 'inRange' ? 'Đạt mục tiêu' : 'Vượt mức tối đa'}</Badge>
        </div>
        <div className="mt-3">
          <ProgressBar value={pp.consumed} max={pp.min} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface2 p-2">
            <div className="text-xs text-muted">Calories</div>
            <div className="font-semibold tabular">{fmt0(t.kcal)}</div>
            <div className="text-[11px] text-muted">{profile.calorieTarget ? `/ ${fmt0(profile.calorieTarget)} kcal` : 'kcal · chưa đặt mục tiêu'}</div>
          </div>
          <div className="rounded-xl bg-surface2 p-2">
            <div className="text-xs text-muted">Carb</div>
            <div className="font-semibold tabular">{fmt1(t.carbG)} g</div>
            {profile.carbTargetG ? <div className="text-[11px] text-muted">/ {fmt0(profile.carbTargetG)} g</div> : null}
          </div>
          <div className="rounded-xl bg-surface2 p-2">
            <div className="text-xs text-muted">Fat</div>
            <div className="font-semibold tabular">{fmt1(t.fatG)} g</div>
            {profile.fatTargetG ? <div className="text-[11px] text-muted">/ {fmt0(profile.fatTargetG)} g</div> : null}
          </div>
        </div>
        {t.hasEstimates && (
          <p className="mt-3 flex items-center gap-2 text-xs text-warn">
            <EstimateBadge /> Tổng có chứa số liệu chưa xác minh.
          </p>
        )}
        <Explain>
          <p>
            <strong>Chấm điểm từng bữa</strong>: protein mục tiêu mỗi bữa = {pp.min} g ÷ {profile.mealsPerDay ?? 4} bữa = {perMeal} g. Chia đều đạm cho khoảng 4 bữa, mỗi bữa
            ~0,4 g/kg, là cách phân bổ được khuyến nghị cho tăng cơ (Schoenfeld & Aragon, 2018). Đạt ≥ 100% là "Đủ đạm", 60–99% là "Hơi thiếu", dưới 60% là "Thiếu đạm".
            Calories chỉ được đánh giá khi bạn tự đặt mục tiêu calories trong Cài đặt.
          </p>
          <p>Tổng = Σ (giá trị dinh dưỡng mỗi khẩu phần × số khẩu phần). Giá trị lấy từ bản ghi bạn nhập vào lúc ghi nhật ký.</p>
          <p>
            Mục tiêu protein do bạn đặt trong Cài đặt (gợi ý 1,6–2,0 g/kg/ngày). Ứng dụng không tự tính mục tiêu calories vì cần tuổi, mức vận động và dữ liệu chi tiêu năng lượng — bạn có thể tự nhập.
          </p>
        </Explain>
      </Card>

      {plans && plans.length > 0 && (
        <Button block variant="outline" icon={<ClipboardList size={18} />} onClick={() => setPlanOpen(true)}>
          Thêm từ thực đơn
        </Button>
      )}

      {MEAL_SLOTS.map((meal) => {
        const items = logs.filter((l) => l.meal === meal);
        const mt = sumLogs(items);
        return (
          <Card
            key={meal}
            title={MEAL_LABELS[meal]}
            action={
              <span className="text-xs text-muted tabular">
                {fmt1(mt.proteinG)} g P · {fmt0(mt.kcal)} kcal
              </span>
            }
          >
            <ul className="space-y-1.5">
              {items.map((l) => (
                <LogRow
                  key={l.id}
                  l={l}
                  onDelete={async () => {
                    if (await confirm({ title: 'Xóa món này khỏi nhật ký?', message: l.food.name, danger: true, confirmText: 'Xóa' })) await deleteFoodLog(l.id).catch(toastError);
                  }}
                />
              ))}
            </ul>
            <Button size="sm" className="mt-2" variant="ghost" icon={<Plus size={16} />} onClick={() => setAdding(meal)}>
              Thêm món
            </Button>
            {items.length > 0 && (
              <MealVerdictBox
                check={checkMeal({ meal: mt, dayTotals: t, proteinTarget: perMeal, dailyKcalTarget: profile.calorieTarget })}
                suggestions={suggestProteinFill(
                  Math.max(0, perMeal - mt.proteinG),
                  (foods ?? []).map((f) => ({ id: f.id, name: f.name, proteinG: f.proteinG, servingLabel: f.servingLabel, isFavorite: f.isFavorite })),
                )}
                onAdd={(foodId, servings) => void addFoodLog({ date, meal, foodId, servings }).then(() => toast('Đã thêm món')).catch(toastError)}
              />
            )}
          </Card>
        );
      })}

      <AddFoodModal meal={adding} date={date} onClose={() => setAdding(null)} />
      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Áp dụng thực đơn">
        <ul className="space-y-2">
          {plans?.map((p) => (
            <li key={p.id}>
              <Button
                block
                onClick={async () => {
                  try {
                    const r = await applyMealPlan(p.id, date);
                    toast(`Đã thêm ${r.added} món${r.skipped ? `, bỏ qua ${r.skipped} món đã bị xóa` : ''}`);
                    setPlanOpen(false);
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                {p.name} ({p.items.length} món)
              </Button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

const VERDICT: Record<MealVerdict, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  good: { label: 'Phù hợp', tone: 'ok' },
  'low-protein': { label: 'Hơi thiếu đạm', tone: 'warn' },
  'very-low-protein': { label: 'Thiếu đạm', tone: 'danger' },
  'over-kcal': { label: 'Đủ đạm · vượt calo ngày', tone: 'warn' },
  empty: { label: 'Chưa có món', tone: 'muted' },
};

function MealVerdictBox({
  check,
  suggestions,
  onAdd,
}: {
  check: ReturnType<typeof checkMeal>;
  suggestions: ReturnType<typeof suggestProteinFill>;
  onAdd: (foodId: string, servings: number) => void;
}) {
  const v = VERDICT[check.verdict];
  const Icon = check.verdict === 'good' ? CheckCircle2 : check.verdict === 'empty' ? CircleDashed : AlertTriangle;
  const toneCls = { ok: 'border-ok/40 bg-ok/10 text-ok', warn: 'border-warn/40 bg-warn/10 text-warn', danger: 'border-danger/40 bg-danger/10 text-danger', muted: 'border-line bg-surface2 text-muted' }[v.tone];
  return (
    <div className={cx('mt-3 rounded-xl border p-3', toneCls)} data-testid="meal-verdict">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={18} /> Bữa này: {v.label}
        <span className="ml-auto text-xs font-medium tabular">{check.proteinPct}% đạm</span>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs text-text">
        {check.messages.map((m) => (
          <li key={m}>• {m}</li>
        ))}
      </ul>
      {check.proteinGap > 0 && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((sg) => (
            <button
              key={sg.foodId}
              type="button"
              onClick={() => onAdd(sg.foodId, sg.servings)}
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text shadow-card"
            >
              + {sg.servings} × {sg.name} (+{fmt1(sg.proteinG)} g đạm)
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StarterFoodsButton() {
  const { toast, toastError } = useFeedback();
  return (
    <Button
      block
      variant="outline"
      onClick={() =>
        void installVietnameseMenus(ALL_PRESET(), [])
          .then((r) => toast(r.foods ? `Đã thêm ${r.foods} món và thực phẩm Việt Nam` : 'Các món và thực phẩm Việt Nam đã có sẵn'))
          .catch(toastError)
      }
    >
      Thêm {SOUTHERN_COUNT} món ăn sẵn + {VN_FOODS.length} thực phẩm Việt Nam
    </Button>
  );
}

function LogRow({ l, onDelete }: { l: FoodLog; onDelete: () => void }) {
  const s = scale(l.food, l.servings);
  const { toastError } = useFeedback();
  return (
    <li className="flex items-center gap-2 rounded-xl bg-surface2 p-2">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{l.food.name}</span>
          {!l.food.isVerified && <EstimateBadge />}
        </div>
        <div className="text-xs text-muted tabular">
          {fmt1(s.proteinG)} g P · {fmt1(s.carbG)} g C · {fmt1(s.fatG)} g F · {fmt0(s.kcal)} kcal
        </div>
      </div>
      <div className="w-16">
        <NumberInput aria-label="Số khẩu phần" value={l.servings} min={0} max={100} onChange={(v) => v && v > 0 && void updateFoodLogServings(l.id, v).catch(toastError)} className="h-9 px-1 text-center text-sm" />
      </div>
      <span className="w-14 truncate text-[11px] text-muted">× {l.food.servingLabel}</span>
      <IconButton label="Xóa món" onClick={onDelete} className="h-9 w-9">
        <Trash2 size={16} />
      </IconButton>
    </li>
  );
}

function useFoods() {
  return useLiveQuery(async () => (await db.foods.toArray()).sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'vi')), []);
}

function AddFoodModal({ meal, date, onClose }: { meal: MealSlot | null; date: string; onClose: () => void }) {
  const foods = useFoods();
  const { toast, toastError } = useFeedback();
  const [q, setQ] = useState('');
  const [servings, setServings] = useState<number | null>(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (meal) {
      setQ('');
      setServings(1);
    }
  }, [meal]);
  const [kind, setKind] = useState<'all' | 'dish' | 'ingredient'>('all');
  const list = useMemo(
    () =>
      (foods ?? [])
        .filter((f) => kind === 'all' || (kind === 'dish' ? f.id.startsWith('dish-') : !f.id.startsWith('dish-')))
        .filter((f) => !q || normalizeVi(f.name).includes(normalizeVi(q))),
    [foods, q, kind],
  );

  async function add(f: Food) {
    if (!meal || !servings || servings <= 0) return toast('Nhập số khẩu phần > 0', 'error');
    try {
      await addFoodLog({ date, meal, foodId: f.id, servings });
      toast(`Đã thêm ${f.name}`);
      onClose();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <>
      <Modal open={!!meal && !creating} onClose={onClose} title={meal ? `Thêm vào ${MEAL_LABELS[meal].toLowerCase()}` : ''}>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <input aria-label="Tìm thực phẩm" placeholder="Tìm thực phẩm đã lưu…" value={q} onChange={(e) => setQ(e.target.value)} />
            <NumberInput aria-label="Số khẩu phần" value={servings} min={0} max={100} onChange={setServings} className="text-center" placeholder="khẩu phần" />
          </div>
          <Segmented
            className="w-full"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'dish', label: 'Món ăn sẵn' },
              { value: 'ingredient', label: 'Nguyên liệu' },
            ]}
          />
          <ul className="divide-y divide-line/60">
            {list.map((f) => (
              <li key={f.id}>
                <button type="button" className="flex w-full items-center gap-2 py-2.5 text-left" onClick={() => void add(f)}>
                  {f.isFavorite && <Star size={14} className="shrink-0 fill-warn text-warn" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {f.name} {!f.isVerified && <EstimateBadge />}
                    </div>
                    <div className="text-xs text-muted tabular">
                      {f.servingLabel}: {fmt1(f.proteinG)} g P · {fmt0(f.kcal)} kcal
                    </div>
                  </div>
                  <Plus size={18} className="text-accent" />
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-4 text-center text-sm text-muted">Chưa có thực phẩm phù hợp.</li>}
          </ul>
          {ALL_PRESET().some((vf) => !(foods ?? []).some((f) => f.id === vf.id)) && <StarterFoodsButton />}
          <Button block variant="outline" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Tạo thực phẩm mới
          </Button>
        </div>
      </Modal>
      <FoodFormModal open={creating} initial={null} defaultName={q} onClose={() => setCreating(false)} />
    </>
  );
}

function FoodFormModal({ open, initial, onClose, defaultName = '' }: { open: boolean; initial: Food | null; onClose: () => void; defaultName?: string }) {
  const { toast, toastError } = useFeedback();
  const [f, setF] = useState({
    name: '',
    servingLabel: '100 g',
    servingGrams: 100 as number | null,
    kcal: null as number | null,
    proteinG: null as number | null,
    carbG: null as number | null,
    fatG: null as number | null,
    isVerified: false,
    source: '',
    isFavorite: false,
  });
  useEffect(() => {
    if (!open) return;
    setF(
      initial
        ? { ...initial, servingGrams: initial.servingGrams ?? null, source: initial.source ?? '' }
        : { name: defaultName, servingLabel: '100 g', servingGrams: 100, kcal: null, proteinG: null, carbG: null, fatG: null, isVerified: false, source: '', isFavorite: false },
    );
  }, [open, initial, defaultName]);
  const calc = kcalFromMacros(f.proteinG ?? 0, f.carbG ?? 0, f.fatG ?? 0);

  async function save() {
    try {
      await saveFood({
        id: initial?.id,
        name: f.name,
        servingLabel: f.servingLabel,
        servingGrams: f.servingGrams,
        kcal: f.kcal ?? calc,
        proteinG: f.proteinG ?? 0,
        carbG: f.carbG ?? 0,
        fatG: f.fatG ?? 0,
        isVerified: f.isVerified && f.source.trim().length > 0,
        source: f.source.trim() || undefined,
        isFavorite: f.isFavorite,
      });
      toast('Đã lưu thực phẩm');
      onClose();
    } catch (e) {
      toastError(e);
    }
  }
  const num = (k: 'kcal' | 'proteinG' | 'carbG' | 'fatG' | 'servingGrams', label: string, ph?: string) => (
    <Field label={label}>{(id) => <NumberInput id={id} value={f[k]} min={0} max={5000} placeholder={ph} onChange={(v) => setF((x) => ({ ...x, [k]: v }))} />}</Field>
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Sửa thực phẩm' : 'Thực phẩm mới'}
      footer={
        <Button variant="primary" block onClick={() => void save()}>
          Lưu
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Tên *">{(id) => <input id={id} className="w-full" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Khẩu phần (mô tả) *">{(id) => <input id={id} className="w-full" value={f.servingLabel} onChange={(e) => setF((x) => ({ ...x, servingLabel: e.target.value }))} placeholder="100 g / 1 quả" />}</Field>
          {num('servingGrams', 'Khối lượng (g)')}
          {num('proteinG', 'Protein (g)')}
          {num('carbG', 'Carb (g)')}
          {num('fatG', 'Fat (g)')}
          {num('kcal', 'Calories (kcal)', `≈ ${fmt0(calc)}`)}
        </div>
        <p className="text-xs text-muted">Để trống calories thì app dùng ước tính từ macro: 4 kcal/g protein, 4 kcal/g carb, 9 kcal/g fat.</p>
        <Field label="Nguồn số liệu" hint="vd. nhãn bao bì, Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng)">
          {(id) => <input id={id} className="w-full" value={f.source} onChange={(e) => setF((x) => ({ ...x, source: e.target.value }))} />}
        </Field>
        <Toggle
          label="Đã xác minh"
          hint={f.source.trim() ? 'Bỏ nhãn "Ước tính"' : 'Cần ghi nguồn số liệu để đánh dấu đã xác minh'}
          checked={f.isVerified && !!f.source.trim()}
          onChange={(v) => setF((x) => ({ ...x, isVerified: v }))}
        />
        <Toggle label="Thường dùng (ưu tiên hiển thị)" checked={f.isFavorite} onChange={(v) => setF((x) => ({ ...x, isFavorite: v }))} />
      </div>
    </Modal>
  );
}

function FoodsTab() {
  const foods = useFoods();
  const { confirm, toastError } = useFeedback();
  const [editing, setEditing] = useState<Food | null>(null);
  const [open, setOpen] = useState(false);
  if (!foods) return <Spinner />;
  return (
    <div className="space-y-3">
      <Button
        block
        variant="primary"
        icon={<Plus size={18} />}
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        Thêm thực phẩm
      </Button>
      {foods.length === 0 ? (
        <>
          <EmptyState title="Chưa có món nào">Thêm món theo nhãn bao bì, hoặc nạp nhanh thực phẩm Việt Nam quen thuộc với số liệu từ Bảng thành phần thực phẩm Việt Nam.</EmptyState>
          <StarterFoodsButton />
        </>
      ) : (
        <Card>
          <ul className="divide-y divide-line/60">
            {foods.map((f) => (
              <li key={f.id} className="flex items-center gap-1 py-2">
                <IconButton label={f.isFavorite ? 'Bỏ thường dùng' : 'Đánh dấu thường dùng'} onClick={() => void toggleFavoriteFood(f.id)}>
                  <Star size={18} className={f.isFavorite ? 'fill-warn text-warn' : 'text-muted'} />
                </IconButton>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{f.name}</span>
                    {f.isVerified ? (
                      <Badge tone="ok" className="shrink-0">
                        Đã xác minh
                      </Badge>
                    ) : (
                      <EstimateBadge />
                    )}
                  </div>
                  <div className="text-xs text-muted tabular">
                    {f.servingLabel}: {fmt1(f.proteinG)} P · {fmt1(f.carbG)} C · {fmt1(f.fatG)} F · {fmt0(f.kcal)} kcal
                  </div>
                </div>
                <IconButton
                  label="Sửa"
                  onClick={() => {
                    setEditing(f);
                    setOpen(true);
                  }}
                >
                  <Pencil size={16} />
                </IconButton>
                <IconButton
                  label="Xóa"
                  onClick={async () => {
                    if (await confirm({ title: `Xóa "${f.name}"?`, message: 'Nhật ký đã ghi vẫn giữ nguyên số liệu tại thời điểm ghi.', danger: true, confirmText: 'Xóa' }))
                      await deleteFood(f.id).catch(toastError);
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {foods.length > 0 && ALL_PRESET().some((vf) => !foods.some((f) => f.id === vf.id)) && <StarterFoodsButton />}
      <FoodFormModal open={open} initial={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

function PlansTab({ onApplied }: { onApplied: () => void }) {
  const plans = useLiveQuery(() => db.mealPlans.toArray(), []);
  const foods = useFoods();
  const { confirm, toastError } = useFeedback();
  const [editing, setEditing] = useState<MealPlan | 'new' | null>(null);
  if (!plans || !foods) return <Spinner />;
  const fm = new Map(foods.map((f) => [f.id, f]));
  const mine = plans.filter((p) => !p.id.startsWith('vn-plan-'));
  return (
    <div className="space-y-3">
      <VnPlans onApplied={onApplied} />
      <h2 className="pt-3 text-sm font-semibold uppercase tracking-wide text-muted">Thực đơn của tôi</h2>
      <Button block variant="primary" icon={<Plus size={18} />} onClick={() => setEditing('new')} disabled={foods.length === 0}>
        Tạo thực đơn riêng
      </Button>
      {foods.length === 0 && <p className="text-center text-xs text-muted">Thêm thực phẩm trước khi tạo thực đơn.</p>}
      {mine.map((p) => {
        const totals = p.items.reduce(
          (a, it) => {
            const f = fm.get(it.foodId);
            if (!f) return a;
            const s = scale(f, it.servings);
            return { p: a.p + s.proteinG, k: a.k + s.kcal };
          },
          { p: 0, k: 0 },
        );
        return (
          <Card key={p.id}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted tabular">
                  {p.items.length} món · {fmt1(totals.p)} g protein · {fmt0(totals.k)} kcal
                </div>
              </div>
              <IconButton label="Sửa" onClick={() => setEditing(p)}>
                <Pencil size={16} />
              </IconButton>
              <IconButton
                label="Xóa"
                onClick={async () => {
                  if (await confirm({ title: `Xóa thực đơn "${p.name}"?`, message: 'Nhật ký đã ghi không bị ảnh hưởng.', danger: true, confirmText: 'Xóa' })) await deleteMealPlan(p.id).catch(toastError);
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </Card>
        );
      })}
      <PlanEditor plan={editing} foods={foods} onClose={() => setEditing(null)} />
    </div>
  );
}

function PlanEditor({ plan, foods, onClose }: { plan: MealPlan | 'new' | null; foods: Food[]; onClose: () => void }) {
  const { toast, toastError } = useFeedback();
  const [name, setName] = useState('');
  const [items, setItems] = useState<MealPlanItem[]>([]);
  useEffect(() => {
    if (!plan) return;
    setName(plan === 'new' ? 'Thực đơn ngày tập' : plan.name);
    setItems(plan === 'new' ? [] : plan.items);
  }, [plan]);
  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={plan === 'new' ? 'Tạo thực đơn' : 'Sửa thực đơn'}
      footer={
        <Button
          variant="primary"
          block
          onClick={async () => {
            try {
              await saveMealPlan({ id: plan && plan !== 'new' ? plan.id : undefined, name, items });
              toast('Đã lưu thực đơn');
              onClose();
            } catch (e) {
              toastError(e);
            }
          }}
        >
          Lưu
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Tên thực đơn">{(id) => <input id={id} className="w-full" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_88px_64px_40px] items-center gap-1.5">
            <select aria-label="Món" value={it.foodId} onChange={(e) => setItems((x) => x.map((y, k) => (k === i ? { ...y, foodId: e.target.value } : y)))}>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select aria-label="Bữa" value={it.meal} onChange={(e) => setItems((x) => x.map((y, k) => (k === i ? { ...y, meal: e.target.value as MealSlot } : y)))} className="px-1">
              {MEAL_SLOTS.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m].replace('Bữa ', '')}
                </option>
              ))}
            </select>
            <NumberInput aria-label="Khẩu phần" value={it.servings} min={0} max={100} onChange={(v) => setItems((x) => x.map((y, k) => (k === i ? { ...y, servings: v ?? 1 } : y)))} className="px-1 text-center" />
            <IconButton label="Bỏ món" onClick={() => setItems((x) => x.filter((_, k) => k !== i))} className="h-10 w-10">
              <Trash2 size={16} />
            </IconButton>
          </div>
        ))}
        <Button block icon={<Plus size={16} />} onClick={() => foods[0] && setItems((x) => [...x, { foodId: foods[0]!.id, meal: 'breakfast', servings: 1 }])}>
          Thêm món
        </Button>
      </div>
    </Modal>
  );
}
