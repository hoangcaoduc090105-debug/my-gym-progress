import { addDays, diffDays, isISODate, startOfWeek } from '../../src/lib/date';
import { parseNumber } from '../../src/lib/format';
import { csvCell, toCsv, workoutsToCsv } from '../../src/backup/csv';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../src/backup/base64';
import { exMap, session, set } from './fixtures';

describe('date utils', () => {
  it('startOfWeek = Thứ Hai', () => {
    expect(startOfWeek('2026-11-07')).toBe('2026-11-02'); // Thứ Bảy
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // Chủ Nhật
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // Thứ Hai
  });
  it('addDays / diffDays qua tháng và năm', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2027-01-02', '2026-12-30')).toBe(3);
  });
  it('isISODate', () => {
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-1-1')).toBe(false);
  });
  it('parseNumber hiểu dấu chấm phân cách nghìn kiểu Việt', () => {
    expect(parseNumber('1.200')).toBe(1200);
    expect(parseNumber('2.500')).toBe(2500);
    expect(parseNumber('1.200,5')).toBe(1200.5);
    expect(parseNumber('1 200')).toBe(1200);
    expect(parseNumber('1,200')).toBe(1.2);
    expect(parseNumber('1.25')).toBe(1.25);
    expect(parseNumber('100.')).toBe(100);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('-2,5')).toBe(-2.5);
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
    expect(parseNumber('-')).toBeNull();
  });
  it('parseNumber chấp nhận dấu phẩy', () => {
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('csv', () => {
  it('escape dấu phẩy, ngoặc kép, xuống dòng', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe('');
  });
  it('chặn CSV injection nhưng giữ số âm', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-2.5')).toBe('-2.5');
  });
  it('có BOM UTF-8 và CRLF', () => {
    const out = toCsv([['Ngực', 1]]);
    expect(out.startsWith('﻿')).toBe(true);
    expect(out.endsWith('\r\n')).toBe(true);
  });
  it('xuất lịch sử tập: 1 dòng mỗi hiệp, chỉ buổi đã hoàn thành', () => {
    const s = [
      session('2026-11-01', [{ exerciseId: 'db-bench-press', sets: [set(20, 10), set(20, 9)] }]),
      session('2026-11-02', [{ exerciseId: 'db-curl', sets: [set(10, 10)] }], { status: 'draft' }),
      session('2026-11-03', [{ exerciseId: 'db-curl', sets: [set(10, 10)] }], { deletedAt: 'x' }),
    ];
    const lines = workoutsToCsv(s, exMap, 'epley').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Đẩy ngực tạ đơn');
    expect(lines[1]).toContain('26.7');
  });
});

describe('base64', () => {
  it('khứ hồi ArrayBuffer', () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256);
    const back = new Uint8Array(base64ToArrayBuffer(arrayBufferToBase64(bytes.buffer)));
    expect(back.length).toBe(70000);
    expect(back[12345]).toBe(12345 % 256);
  });
});

describe('CSV theo đơn vị (v1.8.0)', () => {
  it('lb: cột tạ & e1RM đổi sang lb, tiêu đề ghi lb; kg: giữ nguyên số gốc', async () => {
    const { workoutsToCsv, bodyMetricsToCsv } = await import('../../src/backup/csv');
    const { session, set, exMap } = await import('./fixtures');
    const s = session('2026-01-01', [{ exerciseId: 'goblet-squat', sets: [set(100, 5)] }]);
    const lb = workoutsToCsv([s], exMap, 'epley', 'lb');
    expect(lb).toContain('Mức tạ (lb)');
    expect(lb).toContain(',220.5,');
    const kg = workoutsToCsv([{ ...s, exercises: [{ ...s.exercises[0]!, sets: [set(102.06, 5)] }] }], exMap, 'epley');
    expect(kg).toContain('Mức tạ (kg)');
    expect(kg).toContain(',102.06,');
    const body = bodyMetricsToCsv([{ id: 'b', date: '2026-01-01', weightKg: 100, waistCm: 80, createdAt: 'x', updatedAt: 'x' } as never], 'lb');
    expect(body).toContain('Cân nặng (lb)');
    expect(body).toContain('2026-01-01,220.5');
  });
});
