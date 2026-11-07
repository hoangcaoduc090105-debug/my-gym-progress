import { estimate1RM } from '../../src/domain/oneRepMax';

describe('estimate1RM', () => {
  it('Epley: 100 kg × 5 lần ≈ 116,7 kg', () => {
    expect(estimate1RM(100, 5, 'epley')).toBe(116.7);
  });
  it('Brzycki: 100 kg × 5 lần = 112,5 kg', () => {
    expect(estimate1RM(100, 5, 'brzycki')).toBe(112.5);
  });
  it('1 lần lặp trả về chính mức tạ', () => {
    expect(estimate1RM(80, 1, 'epley')).toBe(80);
    expect(estimate1RM(80, 1, 'brzycki')).toBe(80);
  });
  it('Từ chối > 10 lần lặp (ngoài vùng tin cậy)', () => {
    expect(estimate1RM(50, 11)).toBeNull();
    expect(estimate1RM(50, 10)).toBe(66.7);
  });
  it('Từ chối dữ liệu không hợp lệ', () => {
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(-10, 5)).toBeNull();
    expect(estimate1RM(60, 0)).toBeNull();
    expect(estimate1RM(60, 2.5)).toBeNull();
    expect(estimate1RM(Number.NaN, 5)).toBeNull();
  });
});
