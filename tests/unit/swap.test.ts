import { swapExercise } from '../../src/domain/swap';
import { flattenWorkingSets, splitByExercise } from '../../src/domain/sets';
import type { SessionExercise } from '../../src/db/types';
import { session, set } from './fixtures';

const base = (): SessionExercise => ({
  id: 'se1',
  exerciseId: 'goblet-squat',
  target: { sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSec: 120 },
  note: 'gối hơi đau',
  sets: [set(16, 12, 2), { ...set(16, 10, 2), done: false }, { ...set(null, null, null), done: false }],
});

describe('swapExercise', () => {
  it('giữ id/target/note; hiệp chưa làm xóa số; hiệp đã làm giữ nguyên + replacedFrom', () => {
    const r = swapExercise(base(), 'leg-press');
    expect(r.id).toBe('se1');
    expect(r.exerciseId).toBe('leg-press');
    expect(r.target).toEqual(base().target);
    expect(r.note).toBe('gối hơi đau');
    expect(r.replacedFrom).toBe('goblet-squat');
    expect(r.sets).toHaveLength(3);
    expect(r.sets[0]).toMatchObject({ weightKg: 16, reps: 12, rir: 2, done: true, replacedFrom: 'goblet-squat' });
    expect(r.sets[1]).toMatchObject({ weightKg: null, reps: null, rir: null, done: false });
    expect(r.sets[1]!.replacedFrom).toBeUndefined();
  });
  it('thay 2 lần: hiệp giữ đúng bài gốc của nó; thay về bài cũ thì hiệp lại thuộc bài hiện tại', () => {
    const a = swapExercise(base(), 'leg-press');
    const b = swapExercise({ ...a, sets: [...a.sets.slice(0, 1), { ...set(80, 10, 2) }, ...a.sets.slice(2)] }, 'hack-squat');
    expect(b.sets[0]!.replacedFrom).toBe('goblet-squat');
    expect(b.sets[1]!.replacedFrom).toBe('leg-press');
    expect(b.replacedFrom).toBe('goblet-squat');
    const c = swapExercise(b, 'goblet-squat');
    expect(c.sets[0]!.replacedFrom).toBeUndefined();
    expect(c.sets[1]!.replacedFrom).toBe('leg-press');
  });
  it('cùng bài => không đổi gì', () => {
    const se = base();
    expect(swapExercise(se, 'goblet-squat')).toBe(se);
  });
});

describe('thống kê sau khi thay bài không gán sai bài', () => {
  it('flattenWorkingSets/splitByExercise gán hiệp cũ cho bài cũ', () => {
    const se = swapExercise(base(), 'leg-press');
    se.sets[1] = { ...set(80, 10, 2) };
    const parts = splitByExercise(se);
    expect(parts.map((p) => [p.exerciseId, p.sets.length])).toEqual([
      ['goblet-squat', 1],
      ['leg-press', 2],
    ]);
    const flat = flattenWorkingSets([session('2026-01-01', [{ exerciseId: 'x', sets: [] }], { exercises: [se] })]);
    expect(flat.map((f) => [f.exerciseId, f.weightKg])).toEqual([
      ['goblet-squat', 16],
      ['leg-press', 80],
    ]);
  });
});
