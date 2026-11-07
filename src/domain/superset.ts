/**
 * Superset / nhóm bài (thuần). Bài cùng `groupId` nằm LIÊN TIẾP trong mảng.
 * Nhãn: nhóm thứ nhất A1, A2…; nhóm thứ hai B1, B2…; bài lẻ không có nhãn.
 */
export interface Groupable {
  groupId?: string;
}
export interface GroupedItem<T> {
  item: T;
  index: number;
  /** "A1", "A2"… hoặc null với bài lẻ. */
  label: string | null;
}
export interface ExerciseGroup<T> {
  groupId: string | null;
  /** "A", "B"… hoặc null với bài lẻ. */
  letter: string | null;
  items: GroupedItem<T>[];
}

const letterOf = (n: number) => {
  let s = '';
  let k = n;
  do {
    s = String.fromCharCode(65 + (k % 26)) + s;
    k = Math.floor(k / 26) - 1;
  } while (k >= 0);
  return s;
};

/** Chia mảng thành các khối liên tiếp; khối có ≥ 2 bài cùng groupId là một nhóm. */
export function groupExercises<T extends Groupable>(list: T[]): ExerciseGroup<T>[] {
  const runs: { groupId: string | null; items: { item: T; index: number }[] }[] = [];
  list.forEach((item, index) => {
    const g = item.groupId ?? null;
    const last = runs[runs.length - 1];
    if (g && last && last.groupId === g) last.items.push({ item, index });
    else runs.push({ groupId: g, items: [{ item, index }] });
  });
  let n = 0;
  return runs.flatMap((r): ExerciseGroup<T>[] => {
    if (r.groupId && r.items.length >= 2) {
      const letter = letterOf(n++);
      return [{ groupId: r.groupId, letter, items: r.items.map((x, k) => ({ ...x, label: `${letter}${k + 1}` })) }];
    }
    // groupId lẻ (1 bài) => coi như bài lẻ
    return r.items.map((x) => ({ groupId: null, letter: null, items: [{ ...x, label: null }] }));
  });
}

/** Bỏ groupId của bài đứng một mình trong nhóm (vd. sau khi bỏ bài). */
export function normalizeGroups<T extends Groupable>(list: T[]): T[] {
  const sizes = new Map<string, number>();
  for (const g of groupExercises(list)) if (g.groupId) sizes.set(g.groupId, g.items.length);
  let changed = false;
  const out = list.map((x) => {
    if (x.groupId && !sizes.has(x.groupId)) {
      changed = true;
      const { groupId: _g, ...rest } = x;
      return rest as T;
    }
    return x;
  });
  return changed ? out : list;
}

/** Ghép bài `i` với bài ngay dưới (nối cả nhóm của bài dưới nếu có). */
export function linkWithNext<T extends Groupable>(list: T[], i: number, newId: () => string): T[] {
  const a = list[i];
  const b = list[i + 1];
  if (!a || !b) return list;
  const id = a.groupId ?? b.groupId ?? newId();
  const other = b.groupId && b.groupId !== id ? b.groupId : null;
  return list.map((x, k) => (k === i || k === i + 1 || (other && x.groupId === other) ? { ...x, groupId: id } : x));
}

/** Tách nhóm chứa bài `i` (mọi bài trong nhóm thành bài lẻ). */
export function ungroup<T extends Groupable>(list: T[], i: number): T[] {
  const g = list[i]?.groupId;
  if (!g) return list;
  return list.map((x) => {
    if (x.groupId !== g) return x;
    const { groupId: _g, ...rest } = x;
    return rest as T;
  });
}

/** Di chuyển cả khối (nhóm hoặc bài lẻ) chứa bài `i` lên (-1) / xuống (+1) qua nguyên khối kế bên. */
export function moveBlock<T extends Groupable>(list: T[], i: number, d: -1 | 1): T[] {
  const groups = groupExercises(list);
  const gi = groups.findIndex((g) => g.items.some((x) => x.index === i));
  const gj = gi + d;
  if (gi < 0 || gj < 0 || gj >= groups.length) return list;
  const order = [...groups];
  [order[gi], order[gj]] = [order[gj]!, order[gi]!];
  return order.flatMap((g) => g.items.map((x) => x.item));
}

/** Bài `i` có phải bài cuối của nhóm (hoặc bài lẻ) không — chỉ khi đó mới bấm giờ nghỉ. */
export function isLastInGroup<T extends Groupable>(list: T[], i: number): boolean {
  const g = list[i]?.groupId;
  if (!g) return true;
  return list[i + 1]?.groupId !== g;
}

/** Vị trí bài kế tiếp trong cùng nhóm (để cuộn tới), hoặc null. */
export function nextInGroup<T extends Groupable>(list: T[], i: number): number | null {
  const g = list[i]?.groupId;
  return g && list[i + 1]?.groupId === g ? i + 1 : null;
}

/** Thời gian nghỉ của nhóm = restSec lớn nhất trong nhóm (bài lẻ: của chính nó). */
export function groupRestSec<T extends Groupable>(list: T[], i: number, restOf: (x: T) => number | null | undefined): number | null {
  const g = list[i]?.groupId;
  const members = g ? list.filter((x) => x.groupId === g) : list[i] ? [list[i]!] : [];
  const vals = members.map(restOf).filter((v): v is number => typeof v === 'number' && v > 0);
  return vals.length ? Math.max(...vals) : null;
}
