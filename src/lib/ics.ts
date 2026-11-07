/**
 * Tạo tệp iCalendar (RFC 5545) — thuần, không thư viện.
 * - TEXT escape: "\\" → "\\\\", ";" → "\\;", "," → "\\,", xuống dòng → "\\n".
 * - Gấp dòng: mỗi dòng tối đa 75 OCTET (UTF-8), dòng tiếp bắt đầu bằng CRLF + 1 khoảng trắng; không cắt giữa ký tự nhiều byte.
 * - Kết thúc dòng CRLF.
 */
export interface IcsEvent {
  uid: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:mm' giờ địa phương (floating time). */
  startTime: string;
  durationMin: number;
  summary: string;
  description: string;
  /** Nhắc trước bao nhiêu phút (VALARM). */
  alarmMinutesBefore?: number;
}

export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\n|\r/g, '\\n');
}

const enc = new TextEncoder();

/** Gấp một dòng nội dung theo 75 octet. */
export function foldLine(line: string): string {
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // dòng tiếp có 1 khoảng trắng đầu
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const pad = (n: number) => String(n).padStart(2, '0');
const utcStamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** 'YYYY-MM-DD' + 'HH:mm' (+ phút) → 'YYYYMMDDTHHMMSS' (giờ địa phương, không múi giờ). */
function localStamp(date: string, time: string, addMin = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + addMin));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Gym Progress//Lich tap//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${localStamp(e.date, e.startTime)}`,
      `DTEND:${localStamp(e.date, e.startTime, e.durationMin)}`,
      `SUMMARY:${escapeIcsText(e.summary)}`,
      `DESCRIPTION:${escapeIcsText(e.description)}`,
    );
    if (e.alarmMinutesBefore != null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(e.summary)}`, `TRIGGER:-PT${e.alarmMinutesBefore}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
