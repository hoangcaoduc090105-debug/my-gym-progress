import { useMemo, useState } from 'react';
import { Clock, Plus, Search, Star, X } from 'lucide-react';
import type { Food, MealSlot } from '../../db/types';
import { MEAL_LABELS } from '../../db/types';
import { Segmented, cx } from '../../components/ui';
import { fmt0, fmt1 } from '../../lib/format';
import { MEAL_DISH_CATS, customFoods, groupDishes, groupIngredients, groupLabelOf, recentFoods, searchFoods, type FoodGroup } from './foodCatalog';

type Tab = 'suggest' | 'dish' | 'ingredient' | 'custom';

/** Một dòng món: tên + khẩu phần · kcal; bên phải là lượng đạm (xanh nếu đủ cho 1 bữa). */
function FoodRow({ f, perMeal, onPick, caption }: { f: Food; perMeal: number; onPick: (f: Food) => void; caption?: string }) {
  const enough = f.proteinG >= perMeal;
  return (
    <li>
      <button type="button" onClick={() => onPick(f)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface2/60" aria-label={`Thêm ${f.name}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {f.isFavorite && <Star size={13} className="shrink-0 fill-brand2 text-brand2" />}
            <span className="line-clamp-2 text-sm font-medium leading-snug">{f.name}</span>
          </div>
          <div className="truncate text-xs text-muted">
            {caption ? `${caption} · ` : ''}
            {f.servingLabel} · {fmt0(f.kcal)} kcal
          </div>
        </div>
        <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular', enough ? 'bg-ok/15 text-ok' : 'bg-surface2 text-muted')}>{fmt1(f.proteinG)} g đạm</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Plus size={18} />
        </span>
      </button>
    </li>
  );
}

function Section({ id, title, count, note, children }: { id?: string; title: string; count?: number; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-3 scroll-mt-44">
      <div className="flex items-baseline gap-2 border-b border-line/60 pb-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-accent">{title}</h3>
        {count != null && <span className="text-xs text-muted">{count}</span>}
        {note && <span className="ml-auto text-[11px] text-brand2-text">{note}</span>}
      </div>
      <ul className="divide-y divide-line/50">{children}</ul>
    </section>
  );
}

function Groups({ groups, perMeal, onPick, note, anchorPrefix }: { groups: FoodGroup[]; perMeal: number; onPick: (f: Food) => void; note?: string; anchorPrefix?: string }) {
  return (
    <>
      {groups.map((g) => (
        <Section key={g.key} id={anchorPrefix ? `${anchorPrefix}-${g.key}` : undefined} title={g.label} count={g.foods.length} note={note}>
          {g.subs && g.subs.length > 1
            ? g.subs.map((sub) => (
                <li key={sub.label} className="!border-t-0">
                  <div className="pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{sub.label}</div>
                  <ul className="divide-y divide-line/50">
                    {sub.foods.map((f) => (
                      <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} />
                    ))}
                  </ul>
                </li>
              ))
            : g.foods.map((f) => <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} />)}
        </Section>
      ))}
    </>
  );
}

/**
 * Bộ chọn món: Gợi ý (gần đây, thường dùng, hợp với bữa) · Món ăn sẵn · Nguyên liệu · Tự tạo; tìm kiếm không dấu.
 */
export function FoodPicker({
  foods,
  logs,
  meal,
  perMeal,
  onPick,
}: {
  foods: Food[];
  logs: { foodId: string; createdAt: string }[];
  meal: MealSlot;
  perMeal: number;
  onPick: (f: Food) => void;
}) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('suggest');

  const dishGroups = useMemo(() => groupDishes(foods), [foods]);
  const ingGroups = useMemo(() => groupIngredients(foods), [foods]);
  const custom = useMemo(() => customFoods(foods), [foods]);
  const recent = useMemo(() => recentFoods(logs, foods), [logs, foods]);
  const favorites = useMemo(() => foods.filter((f) => f.isFavorite).sort((a, b) => a.name.localeCompare(b.name, 'vi')), [foods]);
  const forMeal = useMemo(() => groupDishes(foods, MEAL_DISH_CATS[meal]), [foods, meal]);
  const results = useMemo(() => searchFoods(foods, q), [foods, q]);

  const jump = (prefix: string, key: string) => document.getElementById(`${prefix}-${key}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <div>
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 space-y-2 bg-surface px-4 pb-2 pt-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Tìm món" className="w-full pl-10 pr-10" placeholder="Tìm món: cơm tấm, phở, trứng…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && (
            <button type="button" aria-label="Xóa tìm kiếm" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted" onClick={() => setQ('')}>
              <X size={18} />
            </button>
          )}
        </div>
        {!q && (
          <Segmented
            className="w-full"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'suggest', label: 'Gợi ý' },
              { value: 'dish', label: 'Món ăn sẵn' },
              { value: 'ingredient', label: 'Nguyên liệu' },
              { value: 'custom', label: 'Tự tạo' },
            ]}
          />
        )}
        {!q && (tab === 'dish' || tab === 'ingredient') && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {(tab === 'dish' ? dishGroups : ingGroups).map((g) => (
              <button key={g.key} type="button" onClick={() => jump(tab, g.key)} className="h-8 shrink-0 rounded-full bg-surface2 px-3 text-xs font-medium text-text">
                {g.label} <span className="text-muted">{g.foods.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {q ? (
        results.length ? (
          <Section title={`Kết quả cho “${q}”`} count={results.length}>
            {results.map((f) => (
              <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} caption={groupLabelOf(f)} />
            ))}
          </Section>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Không tìm thấy “{q}”. Bạn có thể tạo món mới ở cuối danh sách.</p>
        )
      ) : tab === 'suggest' ? (
        <>
          {recent.length > 0 && (
            <Section title="Ăn gần đây" count={recent.length}>
              {recent.map((f) => (
                <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} caption={groupLabelOf(f)} />
              ))}
            </Section>
          )}
          {favorites.length > 0 && (
            <Section title="Thường dùng ⭐" count={favorites.length}>
              {favorites.map((f) => (
                <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} caption={groupLabelOf(f)} />
              ))}
            </Section>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Clock size={14} /> Hợp cho {MEAL_LABELS[meal].toLowerCase()}
          </div>
          <Groups groups={forMeal} perMeal={perMeal} onPick={onPick} note="số liệu ước tính" />
          {forMeal.length === 0 && <p className="py-4 text-sm text-muted">Chưa có món ăn sẵn — bấm nút thêm món Việt Nam bên dưới.</p>}
        </>
      ) : tab === 'dish' ? (
        <Groups groups={dishGroups} perMeal={perMeal} onPick={onPick} note="số liệu ước tính" anchorPrefix="dish" />
      ) : tab === 'ingredient' ? (
        <Groups groups={ingGroups} perMeal={perMeal} onPick={onPick} anchorPrefix="ingredient" />
      ) : custom.length ? (
        <Section title="Món tự tạo" count={custom.length}>
          {custom.map((f) => (
            <FoodRow key={f.id} f={f} perMeal={perMeal} onPick={onPick} />
          ))}
        </Section>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Chưa có món tự tạo.</p>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Đạm tô xanh = đủ cho 1 bữa (≥ {perMeal} g). Chạm vào món để thêm với số khẩu phần đã chọn.
      </p>
    </div>
  );
}

