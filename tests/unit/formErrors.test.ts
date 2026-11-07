import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { programSchema, settingsSchema } from '../../src/db/schemas';
import { createDefaultProgram } from '../../src/data/defaultProgram';
import { useFieldErrors, zodIssuesToFieldErrors } from '../../src/lib/formErrors';

describe('zodIssuesToFieldErrors', () => {
  it('đường dẫn lồng nhau: progression.minRIR', () => {
    const r = settingsSchema.safeParse({ id: 'app', progression: { minRIR: 9 } });
    expect(r.success).toBe(false);
    if (r.success) return;
    const errs = zodIssuesToFieldErrors(r.error);
    expect(errs['progression.minRIR']).toBeTruthy();
    expect(errs['progression.minRIR']).toMatch(/5/);
  });

  it('đường dẫn mảng: days.0.exercises.1.repMin', () => {
    const p = createDefaultProgram('2026-01-01T00:00:00.000Z');
    const ex1 = p.days[0]?.exercises[1];
    if (!ex1) throw new Error('giáo án mặc định cần ≥ 2 bài ở buổi đầu');
    ex1.repMin = 0;
    const r = programSchema.safeParse(p);
    expect(r.success).toBe(false);
    if (r.success) return;
    const errs = zodIssuesToFieldErrors(r.error);
    expect(Object.keys(errs)).toContain('days.0.exercises.1.repMin');
  });

  it('mỗi ô chỉ giữ lỗi đầu tiên; path rỗng là lỗi chung', () => {
    const errs = zodIssuesToFieldErrors({
      issues: [
        { path: ['a'], message: 'một' },
        { path: ['a'], message: 'hai' },
        { path: [], message: 'chung' },
      ],
    });
    expect(errs).toEqual({ a: 'một', '': 'chung' });
  });

  it('thông báo lỗi tiếng Việt cho ô bỏ trống', () => {
    const r = settingsSchema.safeParse({ id: 'app' });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(zodIssuesToFieldErrors(r.error)['restTimerDefaultSec']).toBe('Bắt buộc nhập');
  });
});

describe('useFieldErrors', () => {
  it('clear(field) chỉ xóa ô đó (và lỗi chung)', () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => result.current.setFromZod({ issues: [{ path: ['a'], message: 'x' }, { path: ['b'], message: 'y' }, { path: [], message: 'z' }] }));
    act(() => result.current.clear('a'));
    expect(result.current.errors).toEqual({ b: 'y' });
    act(() => result.current.clearAll());
    expect(result.current.errors).toEqual({});
  });
});
