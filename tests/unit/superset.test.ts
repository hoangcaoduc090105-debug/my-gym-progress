import { groupExercises, groupRestSec, isLastInGroup, linkWithNext, moveBlock, nextInGroup, normalizeGroups, ungroup } from '../../src/domain/superset';

type X = { id: string; groupId?: string; rest?: number };
const L = (...spec: (string | [string, string])[]): X[] => spec.map((s) => (Array.isArray(s) ? { id: s[0], groupId: s[1] } : { id: s }));
const ids = (l: X[]) => l.map((x) => x.id).join(',');

describe('groupExercises', () => {
  it('nhóm liên tiếp cùng groupId; nhãn A1/A2, B1/B2; bài lẻ không nhãn', () => {
    const g = groupExercises(L('a', ['b', 'g1'], ['c', 'g1'], 'd', ['e', 'g2'], ['f', 'g2'], ['h', 'g2']));
    expect(g.map((x) => [x.letter, x.items.map((i) => `${i.item.id}:${i.label ?? '-'}`).join(' ')])).toEqual([
      [null, 'a:-'],
      ['A', 'b:A1 c:A2'],
      [null, 'd:-'],
      ['B', 'e:B1 f:B2 h:B3'],
    ]);
    expect(g[1]!.items.map((i) => i.index)).toEqual([1, 2]);
  });
  it('groupId chỉ có 1 bài hoặc không liên tiếp => coi là bài lẻ / nhóm riêng', () => {
    const g = groupExercises(L(['a', 'g1'], 'b', ['c', 'g1']));
    expect(g.map((x) => x.letter)).toEqual([null, null, null]);
  });
});

describe('thao tác nhóm', () => {
  it('ghép với bài dưới, ghép tiếp nối dài nhóm; tách nhóm', () => {
    let l = L('a', 'b', 'c');
    l = linkWithNext(l, 0, () => 'G');
    expect(l.map((x) => x.groupId)).toEqual(['G', 'G', undefined]);
    l = linkWithNext(l, 1, () => 'H');
    expect(l.map((x) => x.groupId)).toEqual(['G', 'G', 'G']);
    l = ungroup(l, 1);
    expect(l.every((x) => x.groupId === undefined)).toBe(true);
  });
  it('ghép 2 nhóm kề nhau thành một', () => {
    const l = linkWithNext(L(['a', 'g1'], ['b', 'g1'], ['c', 'g2'], ['d', 'g2']), 1, () => 'X');
    expect(new Set(l.map((x) => x.groupId))).toEqual(new Set(['g1']));
  });
  it('bỏ bài làm nhóm còn 1 bài => tự bỏ groupId', () => {
    const l = normalizeGroups(L('a', ['b', 'g1'], 'd'));
    expect(l[1]!.groupId).toBeUndefined();
    const keep = L(['a', 'g1'], ['b', 'g1']);
    expect(normalizeGroups(keep)).toBe(keep);
  });
  it('di chuyển bài thì di chuyển cả nhóm', () => {
    const l = L('a', ['b', 'g'], ['c', 'g'], 'd');
    expect(ids(moveBlock(l, 2, -1))).toBe('b,c,a,d');
    expect(ids(moveBlock(l, 1, 1))).toBe('a,d,b,c');
    expect(ids(moveBlock(l, 3, -1))).toBe('a,d,b,c');
    expect(moveBlock(l, 0, -1)).toBe(l);
  });
  it('cuối nhóm, bài kế trong nhóm, thời gian nghỉ lớn nhất nhóm', () => {
    const l: X[] = [{ id: 'a', groupId: 'g', rest: 60 }, { id: 'b', groupId: 'g', rest: 120 }, { id: 'c', rest: 90 }];
    expect([0, 1, 2].map((i) => isLastInGroup(l, i))).toEqual([false, true, true]);
    expect(nextInGroup(l, 0)).toBe(1);
    expect(nextInGroup(l, 1)).toBeNull();
    expect(groupRestSec(l, 0, (x) => x.rest)).toBe(120);
    expect(groupRestSec(l, 2, (x) => x.rest)).toBe(90);
  });
});
