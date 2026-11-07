import type { SessionExercise } from '../db/types';

/**
 * "Thay bài" giữa buổi (thuần, không I/O):
 * - giữ id, target, note của SessionExercise;
 * - hiệp CHƯA làm: giữ số hiệp, xóa tạ/lần/RIR (tạ của bài khác không dùng được);
 * - hiệp ĐÃ làm: giữ nguyên, gắn `replacedFrom` = bài cũ để thống kê không gán sai bài;
 * - `se.replacedFrom` = bài cũ (bài ban đầu nếu thay nhiều lần).
 * Thay về đúng bài cũ của một hiệp ⇒ hiệp đó lại thuộc bài hiện tại (bỏ `replacedFrom`).
 */
export function swapExercise(se: SessionExercise, newExerciseId: string): SessionExercise {
  if (newExerciseId === se.exerciseId) return se;
  const oldId = se.exerciseId;
  const sets = se.sets.map((set) => {
    if (!set.done) return { ...set, weightKg: null, reps: null, rir: null };
    const owner = set.replacedFrom ?? oldId;
    if (owner === newExerciseId) {
      const { replacedFrom: _drop, ...rest } = set;
      return rest;
    }
    return { ...set, replacedFrom: owner };
  });
  return { ...se, exerciseId: newExerciseId, replacedFrom: se.replacedFrom ?? oldId, sets };
}
