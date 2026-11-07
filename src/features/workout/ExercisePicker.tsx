import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search } from 'lucide-react';
import { db } from '../../db/db';
import { MUSCLE_GROUPS, MUSCLE_LABELS, EQUIPMENT_LABELS, type MuscleGroup } from '../../db/types';
import { Badge, Modal, cx } from '../../components/ui';

export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function ExercisePicker({ open, onClose, onPick, title = 'Chọn bài tập' }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title?: string }) {
  const all = useLiveQuery(() => db.exercises.toArray(), []);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const list = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return (all ?? [])
      .filter((e) => (muscle === 'all' ? true : e.primaryMuscle === muscle))
      .filter((e) => !nq || normalizeVi(e.nameVi).includes(nq) || normalizeVi(e.nameEn).includes(nq))
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'));
  }, [all, q, muscle]);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 space-y-2 bg-surface px-4 pb-2 pt-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus className="w-full pl-10" placeholder="Tìm tên bài tập (VI/EN)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', ...MUSCLE_GROUPS] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              className={cx('h-8 shrink-0 rounded-full px-3 text-xs font-medium', muscle === m ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
            >
              {m === 'all' ? 'Tất cả' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line/60">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface2"
              onClick={() => {
                onPick(e.id);
                onClose();
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{e.nameVi}</div>
                <div className="truncate text-xs text-muted">
                  {e.nameEn} · {EQUIPMENT_LABELS[e.equipment]}
                </div>
              </div>
              <Badge tone="accent">{MUSCLE_LABELS[e.primaryMuscle]}</Badge>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-muted">Không tìm thấy bài tập.</li>}
      </ul>
    </Modal>
  );
}
