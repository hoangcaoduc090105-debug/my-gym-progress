/**
 * Bộ đọc CSV theo RFC 4180 (tự viết, không thư viện):
 * - ô bọc ngoặc kép, "" trong ô = một dấu ngoặc kép, dấu phẩy và xuống dòng trong ô;
 * - xuống dòng CRLF / LF / CR; bỏ BOM đầu tệp; bỏ dòng trống cuối;
 * - dấu phân cách mặc định ',', tự nhận ';' nếu dòng đầu có ';' mà không có ',' (Excel một số vùng).
 */
export function detectDelimiter(text: string): ',' | ';' {
  const first = text.replace(/^﻿/, '').split(/\r\n|\n|\r/, 1)[0] ?? '';
  return !first.includes(',') && first.includes(';') ? ';' : ',';
}

export function parseCsv(input: string, delimiter: ',' | ';' = detectDelimiter(input)): string[][] {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  while (i < n) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"' && cell === '') {
      inQuotes = true;
      i += 1;
    } else if (c === delimiter) {
      endCell();
      i += 1;
    } else if (c === '\r' || c === '\n') {
      endRow();
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      cell += c;
      i += 1;
    }
  }
  if (cell !== '' || row.length > 0 || inQuotes) endRow();
  // Bỏ các dòng trống (vd. dòng trống cuối tệp).
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}
