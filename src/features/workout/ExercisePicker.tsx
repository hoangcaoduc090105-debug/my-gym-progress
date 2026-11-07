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

/** Danh sách tìm + lọc + chọn bài (dùng trong ExercisePicker và hộp thoại "Thay bài"). */
export function ExercisePickerList({ onPick, exclude, autoFocus = true }: { onPick: (id: string) => void; exclude?: string[]; autoFocus?: boolean }) {
  const all = useLiveQuery(() => db.exercises.toArray(), []);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const list = useMemo(() => {
    const nq = normalizeVi(q.trim());
    const skip = new Set(exclude ?? []);
    return (all ?? [])
      .filter((e) => !skip.has(e.id))
      .filter((e) => (muscle === 'all' ? true : e.primaryMuscle === muscle))
      .filter((e) => !nq || normalizeVi(e.nameVi).includes(nq) || normalizeVi(e.nameEn).includes(nq))
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'));
  }, [all, q, muscle, exclude]);

  return (
    <>
      <div className="sticky -top-4 z-10 -mx-4 space-y-2 bg-surface px-4 pb-2 pt-2">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus={autoFocus} aria-label="Tìm bài tập" className="w-full pl-10" placeholder="Tìm tên bài tập (VI/EN)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', ...MUSCLE_GROUPS] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              aria-pressed={muscle === m}
              className={cx('h-11 shrink-0 rounded-full px-3 text-xs font-medium', muscle === m ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
            >
              {m === 'all' ? 'Tất cả' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line/60">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" className="flex min-h-[52px] w-full items-center gap-3 py-3 text-left hover:bg-surface2" onClick={() => onPick(e.id)}>
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
    </>
  );
}

export function ExercisePicker({ open, onClose, onPick, title = 'Chọn bài tập' }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="-mt-2">
        <ExercisePickerList
          onPick={(id) => {
            onPick(id);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
