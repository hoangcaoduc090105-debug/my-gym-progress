import { parseCsv } from '../../src/backup/csvParse';

describe('parseCsv (RFC 4180)', () => {
  it('cơ bản, CRLF, bỏ dòng trống cuối', () => {
    expect(parseCsv('a,b,c\r\n1,2,3\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });
  it('ô có dấu phẩy trong ngoặc kép', () => {
    expect(parseCsv('name,notes\n"Squat, high bar","ok"\n')).toEqual([
      ['name', 'notes'],
      ['Squat, high bar', 'ok'],
    ]);
  });
  it('ô có xuống dòng (LF và CRLF) trong ngoặc kép', () => {
    expect(parseCsv('a,b\n"dòng 1\ndòng 2",x\r\n"p\r\nq",y')).toEqual([
      ['a', 'b'],
      ['dòng 1\ndòng 2', 'x'],
      ['p\r\nq', 'y'],
    ]);
  });
  it('ngoặc kép kép "" trong ô', () => {
    expect(parseCsv('a\n"He said ""hi"""\n')).toEqual([['a'], ['He said "hi"']]);
  });
  it('bỏ BOM; ô rỗng và ô cuối rỗng', () => {
    expect(parseCsv('﻿a,b,c\n1,,\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', ''],
    ]);
  });
  it('dấu chấm phẩy (Excel vùng châu Âu) được tự nhận; dòng cuối không có xuống dòng', () => {
    expect(parseCsv('a;b\n"1,5";2')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
    expect(parseCsv('x,y\n1,2')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ]);
  });
});
