import { db } from '../../src/db/db';
import * as repo from '../../src/db/repo';
import { BUILTIN_EXERCISES } from '../../src/data/exercises';
import { PROGRAM_TEMPLATES, programFromTemplate } from '../../src/data/programTemplates';
import { resetDb } from './helpers';

beforeEach(resetDb);

describe('giáo án mẫu (v1.9)', () => {
  it('mọi exerciseId tồn tại trong thư viện gốc; mỗi ngày ≤ 8 bài; số buổi khớp daysPerWeek; tên mẫu không trùng nhau', () => {
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id));
    const names = new Set<string>();
    for (const t of PROGRAM_TEMPLATES) {
      expect(names.has(t.name), t.name).toBe(false);
      names.add(t.name);
      expect(t.days.length).toBe(t.daysPerWeek);
      for (const d of t.days) {
        expect(d.rows.length, `${t.key}/${d.name}`).toBeLessThanOrEqual(8);
        expect(d.rows.length).toBeGreaterThanOrEqual(5);
        for (const [exId, sets, repMin, repMax] of d.rows) {
          expect(ids.has(exId), `${t.key}: ${exId}`).toBe(true);
          expect(sets).toBeGreaterThanOrEqual(2);
          expect(repMax).toBeGreaterThanOrEqual(repMin);
        }
      }
    }
    expect(PROGRAM_TEMPLATES.map((t) => t.key)).toEqual(['fullbody-2', 'upper-lower-4', 'ppl-6']);
  });

  it('programFromTemplate tạo id mới mỗi lần và qua được schema (saveProgram)', async () => {
    let n = 0;
    const newId = (p: string) => `${p}-${++n}`;
    const a = programFromTemplate(PROGRAM_TEMPLATES[0]!, newId, '2026-11-07T00:00:00.000Z');
    const b = programFromTemplate(PROGRAM_TEMPLATES[0]!, newId, '2026-11-07T00:00:00.000Z');
    expect(a.id).not.toBe(b.id);
    expect(a.days[0]!.exercises[0]!.id).not.toBe(b.days[0]!.exercises[0]!.id);
    for (const t of PROGRAM_TEMPLATES) await expect(repo.saveProgram(programFromTemplate(t, newId, '2026-11-07T00:00:00.000Z'))).resolves.toBeTruthy();
  });

  it('addProgramFromTemplate: thêm 2 lần không tạo trùng; activate chuyển giáo án đang dùng', async () => {
    const before = await db.programs.count();
    const r1 = await repo.addProgramFromTemplate('upper-lower-4');
    expect(r1.existed).toBe(false);
    expect(r1.program.isActive).toBe(false);
    const r2 = await repo.addProgramFromTemplate('upper-lower-4');
    expect(r2.existed).toBe(true);
    expect(r2.program.id).toBe(r1.program.id);
    expect(await db.programs.count()).toBe(before + 1);
    const r3 = await repo.addProgramFromTemplate('upper-lower-4', { activate: true });
    expect(r3.existed).toBe(true);
    expect((await repo.getActiveProgram())?.id).toBe(r1.program.id);
    expect((await db.programs.toArray()).filter((p) => p.isActive)).toHaveLength(1);
    await expect(repo.addProgramFromTemplate('khong-co')).rejects.toBeTruthy();
  });
});
