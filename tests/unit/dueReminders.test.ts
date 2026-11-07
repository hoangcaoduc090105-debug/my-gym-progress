import { LAST_DUE_NOTICE_KEY, maybeNotifyDue, shouldNotifyToday, updateAppBadge } from '../../src/app/dueReminders';

describe('thông báo buổi đến hạn — mỗi ngày một lần', () => {
  const shown: { title: string; options?: NotificationOptions }[] = [];
  class FakeNotification {
    static permission: NotificationPermission = 'granted';
    constructor(title: string, options?: NotificationOptions) {
      shown.push({ title, options });
    }
  }
  const orig = (globalThis as { Notification?: unknown }).Notification;
  beforeEach(() => {
    shown.length = 0;
    localStorage.clear();
    FakeNotification.permission = 'granted';
    (globalThis as { Notification?: unknown }).Notification = FakeNotification;
  });
  afterAll(() => {
    (globalThis as { Notification?: unknown }).Notification = orig;
  });

  it('báo 1 lần trong ngày, ghi localStorage; hôm sau báo lại', async () => {
    expect(await maybeNotifyDue({ enabled: true, dueCount: 2, today: '2026-11-07' })).toBe(true);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.options?.body).toContain('2 buổi');
    expect((shown[0]!.options?.data as { url: string }).url).toBe('./#/lich-tap');
    expect(localStorage.getItem(LAST_DUE_NOTICE_KEY)).toBe('2026-11-07');
    expect(await maybeNotifyDue({ enabled: true, dueCount: 2, today: '2026-11-07' })).toBe(false);
    expect(shown).toHaveLength(1);
    expect(await maybeNotifyDue({ enabled: true, dueCount: 1, today: '2026-11-08' })).toBe(true);
    expect(shown).toHaveLength(2);
  });
  it('không báo khi tắt, khi chưa cấp quyền, khi không có buổi đến hạn', async () => {
    expect(await maybeNotifyDue({ enabled: false, dueCount: 1, today: '2026-11-07' })).toBe(false);
    expect(await maybeNotifyDue({ enabled: true, dueCount: 0, today: '2026-11-07' })).toBe(false);
    FakeNotification.permission = 'denied';
    expect(await maybeNotifyDue({ enabled: true, dueCount: 1, today: '2026-11-07' })).toBe(false);
    expect(shown).toHaveLength(0);
    expect(localStorage.getItem(LAST_DUE_NOTICE_KEY)).toBeNull();
  });
  it('shouldNotifyToday thuần', () => {
    const base = { enabled: true, permission: 'granted' as const, dueCount: 1, today: '2026-11-07', lastNotice: null };
    expect(shouldNotifyToday(base)).toBe(true);
    expect(shouldNotifyToday({ ...base, lastNotice: '2026-11-07' })).toBe(false);
    expect(shouldNotifyToday({ ...base, permission: 'unsupported' })).toBe(false);
  });
});

describe('huy hiệu app', () => {
  it('n > 0 => setAppBadge(n); n = 0 => clearAppBadge; không có API / lỗi => im lặng', async () => {
    const nav = { setAppBadge: vi.fn(async () => undefined), clearAppBadge: vi.fn(async () => undefined) };
    await updateAppBadge(3, nav);
    expect(nav.setAppBadge).toHaveBeenCalledWith(3);
    await updateAppBadge(0, nav);
    expect(nav.clearAppBadge).toHaveBeenCalledTimes(1);
    await expect(updateAppBadge(2, {})).resolves.toBeUndefined();
    await expect(updateAppBadge(2, { setAppBadge: async () => Promise.reject(new Error('x')) })).resolves.toBeUndefined();
  });
});
