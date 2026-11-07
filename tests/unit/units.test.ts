import { fmtWeightU, fromDisplay, KG_PER_LB, lbToKg, toDisplay, unitLabel } from '../../src/lib/units';

describe('đơn vị lb (chỉ hiển thị)', () => {
  it('100 kg ⇒ "220,5 lb"; kg giữ nguyên', () => {
    expect(fmtWeightU(100, 'lb')).toBe('220,5 lb');
    expect(fmtWeightU(42.5, 'kg')).toBe('42,5 kg');
    expect(unitLabel('lb')).toBe('lb');
  });
  it('nhập 225 lb ⇒ lưu 102,06 kg', () => {
    expect(fromDisplay(225, 'lb')).toBe(102.06);
  });
  it('khứ hồi không trôi: 60 kg → 132,3 lb → 60 kg khi không sửa', () => {
    expect(toDisplay(60, 'lb')).toBe(132.3);
    expect(fromDisplay(132.3, 'lb', 60)).toBe(60);
    // không có gốc thì mới làm tròn theo số nhập
    expect(fromDisplay(132.3, 'lb')).toBe(60.01);
    // nhiều vòng liên tiếp vẫn giữ nguyên
    let kg = 61.23;
    for (let i = 0; i < 10; i++) kg = fromDisplay(toDisplay(kg, 'lb'), 'lb', kg);
    expect(kg).toBe(61.23);
    // sửa số thật => đổi
    expect(fromDisplay(135, 'lb', 60)).toBe(61.23);
  });
  it('đĩa lb lưu dạng kg vẫn hiển thị đúng số lb', () => {
    expect(toDisplay(lbToKg(45), 'lb')).toBe(45);
    expect(toDisplay(lbToKg(2.5), 'lb')).toBe(2.5);
    expect(lbToKg(1)).toBe(KG_PER_LB);
  });
});
