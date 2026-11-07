import { backupReminder } from '../../src/domain/backupReminder';

const now = new Date('2026-11-07T12:00:00Z');
describe('backupReminder', () => {
  it('chưa đủ 5 buổi tập => không nhắc', () => {
    expect(backupReminder(null, 4, now)).toEqual({ show: false });
  });
  it('chưa từng sao lưu và đủ 5 buổi => nhắc', () => {
    expect(backupReminder(null, 5, now)).toEqual({ show: true, days: null });
  });
  it('quá 30 ngày => nhắc kèm số ngày; trong 30 ngày => không', () => {
    expect(backupReminder('2026-10-01T12:00:00Z', 10, now)).toEqual({ show: true, days: 37 });
    expect(backupReminder('2026-10-20T12:00:00Z', 10, now)).toEqual({ show: false });
  });
});
