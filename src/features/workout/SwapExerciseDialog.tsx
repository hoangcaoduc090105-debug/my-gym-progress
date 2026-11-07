import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeftRight } from 'lucide-react';
import { db } from '../../db/db';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise } from '../../db/types';
import { Badge, Modal } from '../../components/ui';
import { ExercisePickerList } from './ExercisePicker';

/**
 * Hộp thoại "Thay bài": trên là bài thay thế gợi ý (alternativeIds còn trong thư viện),
 * dưới là danh sách chọn bài bất kỳ. Tải lười cùng chunk riêng.
 */
export default function SwapExerciseDialog({ open, ex, currentId, onClose, onPick }: { open: boolean; ex: Exercise | undefined; currentId: string; onClose: () => void; onPick: (id: string) => void }) {
  const alts = useLiveQuery(async () => {
    const ids = (ex?.alternativeIds ?? []).filter((x) => x !== currentId);
    return ids.length ? (await db.exercises.bulkGet(ids)).filter((x): x is Exercise => !!x) : [];
  }, [ex?.id, currentId]);
  const pick = (id: string) => {
    onPick(id);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Thay bài: ${ex?.nameVi ?? 'bài tập'}`} wide>
      <section aria-label="Bài thay thế gợi ý" className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-muted">Bài thay thế gợi ý</h3>
        {alts && alts.length > 0 ? (
          <ul className="space-y-2">
            {alts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => pick(a.id)}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-left hover:bg-accent/10"
                  aria-label={`Thay bằng ${a.nameVi}`}
                >
                  <ArrowLeftRight size={18} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.nameVi}</div>
                    <div className="truncate text-xs text-muted">{EQUIPMENT_LABELS[a.equipment]}</div>
                  </div>
                  <Badge tone="accent">{MUSCLE_LABELS[a.primaryMuscle]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Bài này chưa có gợi ý thay thế — chọn ở danh sách bên dưới.</p>
        )}
      </section>
      <h3 className="mb-1 text-sm font-semibold text-muted">Hoặc chọn bài bất kỳ</h3>
      <ExercisePickerList onPick={pick} exclude={[currentId]} autoFocus={false} />
    </Modal>
  );
}
