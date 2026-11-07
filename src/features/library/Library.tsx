import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { db } from '../../db/db';
import { EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type Equipment, type MuscleGroup } from '../../db/types';
import { Badge, Button, Card, LinkRow, PageHeader, Spinner, cx } from '../../components/ui';
import { normalizeVi } from '../workout/ExercisePicker';

export function Library() {
  const nav = useNavigate();
  const all = useLiveQuery(() => db.exercises.toArray(), []);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [equip, setEquip] = useState<Equipment | 'all'>('all');
  const list = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return (all ?? [])
      .filter((e) => muscle === 'all' || e.primaryMuscle === muscle)
      .filter((e) => equip === 'all' || e.equipment === equip)
      .filter((e) => !nq || normalizeVi(e.nameVi).includes(nq) || normalizeVi(e.nameEn).includes(nq))
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'));
  }, [all, q, muscle, equip]);
  if (!all) return <Spinner />;
  const grouped = MUSCLE_GROUPS.map((m) => ({ m, items: list.filter((e) => e.primaryMuscle === m) })).filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thư viện bài tập"
        subtitle={
          <>
            {all.length} bài · bấm vào bài để xem cách tập đúng ·{' '}
            <Link to="/huong-dan?tab=train" className="text-info underline">
              Nguyên tắc cho người mới
            </Link>
          </>
        }
        action={
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => nav('/thu-vien/moi')}>
            Thêm
          </Button>
        }
      />
      <div className="space-y-2">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Tìm bài tập" className="w-full pl-10" placeholder="Tìm tên bài tập (VI/EN)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', ...MUSCLE_GROUPS] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              className={cx('h-9 shrink-0 rounded-full px-3 text-sm font-medium', muscle === m ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
            >
              {m === 'all' ? 'Tất cả' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
        <select aria-label="Lọc dụng cụ" value={equip} onChange={(e) => setEquip(e.target.value as Equipment | 'all')} className="w-full">
          <option value="all">Mọi dụng cụ</option>
          {EQUIPMENT.map((x) => (
            <option key={x} value={x}>
              {EQUIPMENT_LABELS[x]}
            </option>
          ))}
        </select>
      </div>
      {grouped.length === 0 && <p className="text-center text-sm text-muted">Không tìm thấy bài tập phù hợp.</p>}
      {grouped.map(({ m, items }) => (
        <Card key={m} title={`${MUSCLE_LABELS[m]} · ${items.length}`}>
          <div className="-mx-3">
            {items.map((e) => (
              <LinkRow key={e.id} to={`/thu-vien/${e.id}`} right={<ChevronRight size={18} className="text-muted" />}>
                <div className="flex items-center gap-2 font-medium">
                  {e.nameVi} {e.isCustom && <Badge tone="info">Tự tạo</Badge>}
                </div>
                <div className="truncate text-xs text-muted">
                  {e.nameEn} · {EQUIPMENT_LABELS[e.equipment]}
                </div>
              </LinkRow>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
