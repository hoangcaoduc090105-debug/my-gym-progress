import { useState } from 'react';
import { ChevronDown, Info, Scale } from 'lucide-react';
import { MEAL_LABELS } from '../../db/types';
import { Badge, Button, Card, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { applyMealPlan, installVietnameseMenus } from '../../db/repo';
import { VN_FOODS } from '../../data/vnFoods';
import { VN_PLANS, foodName, itemMacro, mealMacro, planMacro, type VnPlan } from '../../data/vnMealPlans';
import { fmt0, fmt1 } from '../../lib/format';
import { todayISO } from '../../lib/date';

/** 3 thực đơn mẫu kiểu Việt Nam, số liệu từ Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007). */
export function VnPlans({ onApplied }: { onApplied?: () => void }) {
  return (
    <div className="space-y-3">
      <Card className="border-accent/30 bg-accent/5">
        <div className="text-sm leading-relaxed">
          <div className="font-semibold">Thực đơn Việt Nam mẫu cho người tập tăng cơ</div>
          <p className="mt-1 text-muted">
            Món quen thuộc (bánh mì, phở, bún, cơm + món mặn + rau + canh). Mỗi bữa ≥ 26 g đạm, cả ngày 105–130 g. Số liệu nguyên liệu lấy từ Bảng thành phần thực phẩm Việt Nam (Viện
            Dinh dưỡng, 2007); cơm chín và ức gà theo USDA FoodData Central (2019).
          </p>
        </div>
      </Card>
      {VN_PLANS.map((p) => (
        <PlanCard key={p.id} plan={p} onApplied={onApplied} />
      ))}
      <Card title="Cách dùng thực đơn mẫu">
        <ul className="space-y-2 text-sm leading-relaxed">
          <li className="flex gap-2">
            <Scale size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>
              Cân <strong>thịt, cá ở dạng sống</strong>, phần ăn được (bỏ xương, vỏ). <strong>Cơm cân sau khi nấu</strong>: cân 1 lần bát cơm nhà bạn để biết 1 bát khoảng bao
              nhiêu gram.
            </span>
          </li>
          <li className="flex gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-info" />
            <span>
              Đổi món tương đương lượng đạm: 100 g thịt bò ≈ 110 g thịt lợn nạc ≈ 105 g cá rô phi ≈ 115 g tôm ≈ 3 quả trứng gà (~140 g). Rau đổi tự do.
            </span>
          </li>
          <li className="flex gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-info" />
            <span>
              App không đặt mục tiêu calories. Theo dõi cân nặng 2–3 lần/tuần: với mục tiêu tăng cơ, mức tăng khoảng 0,25–0,5% cân nặng mỗi tuần là hợp lý (Iraki et al., 2019) — với 65 kg
              là khoảng 0,15–0,3 kg/tuần. Không tăng sau 2–3 tuần thì thêm cơm ở bữa trưa và tối; tăng quá nhanh thì bớt cơm và dầu.
            </span>
          </li>
          <li className="flex gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-warn" />
            <span>Ăn hàng quán (phở, cơm tấm, bún bò…) lượng thịt và dầu khác nhau nhiều; nên ghi theo khối lượng ước lượng và coi là số liệu ước tính.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function PlanCard({ plan, onApplied }: { plan: VnPlan; onApplied?: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast, toastError, confirm } = useFeedback();
  const t = planMacro(plan);

  async function apply() {
    const ok = await confirm({
      title: 'Thêm thực đơn vào nhật ký hôm nay?',
      message: `${plan.name}: ${plan.meals.reduce((n, m) => n + m.items.length, 0)} món sẽ được thêm vào 4 bữa của hôm nay. Bạn sửa khẩu phần hoặc xóa từng món sau.`,
      confirmText: 'Thêm vào hôm nay',
    });
    if (!ok) return;
    try {
      await installVietnameseMenus(VN_FOODS, VN_PLANS);
      const r = await applyMealPlan(plan.id, todayISO());
      toast(`Đã thêm ${r.added} món vào nhật ký hôm nay`);
      onApplied?.();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <Card>
      <div className="font-semibold leading-snug">{plan.name}</div>
      <div className="mt-1 text-xs text-muted">{plan.note}</div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {[
          ['Đạm', `${fmt1(t.proteinG)} g`],
          ['Calories', `${fmt0(t.kcal)}`],
          ['Carb', `${fmt0(t.carbG)} g`],
          ['Fat', `${fmt0(t.fatG)} g`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface2 px-1 py-2">
            <div className="text-[11px] text-muted">{k}</div>
            <div className="text-sm font-semibold tabular">{v}</div>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {plan.meals.map((m) => {
          const mm = mealMacro(m);
          return (
            <li key={m.meal} className="rounded-xl border border-line/70 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">{MEAL_LABELS[m.meal]}</div>
                  <div className="text-sm font-medium">{m.title}</div>
                </div>
                <Badge tone="ok" className="shrink-0">
                  {fmt1(mm.proteinG)} g đạm
                </Badge>
              </div>
              {open && (
                <div className="mt-2 space-y-1.5 text-xs">
                  <p className="text-muted">{m.howTo}</p>
                  <table className="w-full tabular">
                    <tbody>
                      {m.items.map((it) => {
                        const x = itemMacro(it);
                        return (
                          <tr key={it.foodId} className="border-t border-line/50">
                            <td className="py-1">{foodName(it.foodId)}</td>
                            <td className="text-right text-muted">{it.grams} g</td>
                            <td className="w-16 text-right">{fmt1(x.proteinG)} g</td>
                            <td className="w-16 text-right text-muted">{fmt0(x.kcal)} kcal</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="text-right text-muted">Bữa: {fmt0(mm.kcal)} kcal</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} icon={<ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />}>
          {open ? 'Thu gọn' : 'Xem gram từng món'}
        </Button>
        <Button size="sm" variant="primary" onClick={() => void apply()}>
          Dùng cho hôm nay
        </Button>
      </div>
    </Card>
  );
}
