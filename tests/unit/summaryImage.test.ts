import { clip, MAX_LINES, MAX_PRS, summaryCardLines } from '../../src/lib/summaryImage';

describe('summaryImage — dữ liệu vẽ (v1.9)', () => {
  it('clip cắt và thêm …', () => {
    expect(clip('ngắn', 10)).toBe('ngắn');
    expect(clip('một chuỗi khá dài để thử', 12)).toBe('một chuỗi k…');
  });
  it('giới hạn số dòng, báo số dòng dư, bỏ dòng rỗng', () => {
    const lines = Array.from({ length: 9 }, (_, i) => `Bài ${i + 1}`);
    const r = summaryCardLines({ title: 't', dateLabel: 'd', stats: [], lines: [...lines, '  ', ''], prs: Array.from({ length: 6 }, (_, i) => `PR ${i}`) });
    expect(r.lines).toHaveLength(MAX_LINES);
    expect(r.moreLines).toBe(3);
    expect(r.prs).toHaveLength(MAX_PRS);
    expect(r.morePrs).toBe(2);
  });
});
