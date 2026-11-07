import { buildIcs, escapeIcsText, foldLine } from '../../src/lib/ics';

const unfold = (s: string) => s.replace(/\r\n /g, '');

describe('ics (RFC 5545)', () => {
  it('escape dấu phẩy, chấm phẩy, gạch chéo, xuống dòng', () => {
    expect(escapeIcsText('a,b;c\\d\ne\r\nf')).toBe('a\\,b\;c\\\\d\\ne\\nf');
  });
  it('gấp dòng ≤ 75 octet (UTF-8), không cắt giữa ký tự tiếng Việt', () => {
    const long = 'DESCRIPTION:' + 'Squat tạ ấm, đẩy ngực tạ đơn, kéo cáp ngồi; '.repeat(5);
    const folded = foldLine(long);
    const enc = new TextEncoder();
    for (const l of folded.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(unfold(folded)).toBe(long);
    expect(foldLine('SUMMARY:ngắn')).toBe('SUMMARY:ngắn');
  });
  it('2 sự kiện: VEVENT, giờ địa phương, VALARM trước 1 giờ, CRLF', () => {
    const ics = buildIcs(
      [
        { uid: 'a@x', date: '2026-11-09', startTime: '18:00', durationMin: 90, summary: 'Tập: Buổi A, toàn thân', description: 'Squat\nĐẩy ngực', alarmMinutesBefore: 60 },
        { uid: 'b@x', date: '2026-11-11', startTime: '23:30', durationMin: 60, summary: 'Tập: Buổi B', description: 'Kéo xô' },
      ],
      new Date(Date.UTC(2026, 10, 7, 1, 2, 3)),
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    const u = unfold(ics);
    expect(u).toContain('DTSTART:20261109T180000');
    expect(u).toContain('DTEND:20261109T193000');
    expect(u).toContain('DTEND:20261112T003000'); // qua nửa đêm
    expect(u).toContain('DTSTAMP:20261107T010203Z');
    expect(u).toContain('SUMMARY:Tập: Buổi A\\, toàn thân');
    expect(u).toContain('DESCRIPTION:Squat\\nĐẩy ngực');
    expect(u.match(/BEGIN:VALARM/g)).toHaveLength(1);
    expect(u).toContain('TRIGGER:-PT60M');
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });
});
