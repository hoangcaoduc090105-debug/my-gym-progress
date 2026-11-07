import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { dueSchedules } from '../domain/schedule';
import { todayISO } from '../lib/date';

/**
 * Nhắc lịch tập KHÔNG cần máy chủ (v1.8):
 * - huy hiệu trên icon app = số lịch hẹn đến hạn (navigator.setAppBadge, im lặng nếu không hỗ trợ);
 * - thông báo khi app được mở/quay lại (visible) nếu có lịch đến hạn và hôm nay chưa báo.
 * App KHÔNG thể đẩy thông báo nền khi đang đóng (không có backend) — dùng tệp .ics để Lịch điện thoại nhắc.
 */
export const LAST_DUE_NOTICE_KEY = 'mgp.lastDueNotice';

export function shouldNotifyToday(o: { enabled: boolean; permission: NotificationPermission | 'unsupported'; dueCount: number; today: string; lastNotice: string | null }): boolean {
  return o.enabled && o.permission === 'granted' && o.dueCount > 0 && o.lastNotice !== o.today;
}

type BadgeNav = { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export async function updateAppBadge(n: number, nav: BadgeNav = (typeof navigator !== 'undefined' ? navigator : {}) as BadgeNav): Promise<void> {
  try {
    if (n > 0) await nav.setAppBadge?.(n);
    else await nav.clearAppBadge?.();
  } catch {
    /* trình duyệt không hỗ trợ / không cho phép — bỏ qua */
  }
}

interface NotifyEnv {
  permission: () => NotificationPermission | 'unsupported';
  show: (title: string, options: NotificationOptions) => Promise<void>;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
}

const defaultEnv = (): NotifyEnv => ({
  permission: () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
  show: async (title, options) => {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) await reg.showNotification(title, options);
    else if (typeof Notification !== 'undefined') new Notification(title, options);
  },
  storage: localStorage,
});

/** Báo "buổi đến hạn" tối đa MỘT lần mỗi ngày. Trả true nếu đã hiện thông báo. */
export async function maybeNotifyDue(o: { enabled: boolean; dueCount: number; today: string }, env: NotifyEnv = defaultEnv()): Promise<boolean> {
  let last: string | null = null;
  try {
    last = env.storage.getItem(LAST_DUE_NOTICE_KEY);
  } catch {
    /* bộ nhớ tạm không khả dụng */
  }
  if (!shouldNotifyToday({ ...o, permission: env.permission(), lastNotice: last })) return false;
  try {
    await env.show('Đến buổi tập rồi 💪', {
      body: o.dueCount === 1 ? 'Bạn có 1 buổi tập đến hạn. Chạm để mở lịch tập.' : `Bạn có ${o.dueCount} buổi tập đến hạn. Chạm để mở lịch tập.`,
      tag: 'mgp-due',
      icon: 'icons/icon-192.png',
      data: { url: './#/lich-tap' },
    });
    env.storage.setItem(LAST_DUE_NOTICE_KEY, o.today);
    return true;
  } catch {
    return false;
  }
}

/** Xin quyền thông báo — PHẢI gọi trong cử chỉ bấm của người dùng. */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Số lịch đến hạn (live) + huy hiệu + thông báo khi app visible. Dùng một lần ở gốc app. */
export function useDueReminders(enabled: boolean): number | undefined {
  const due = useLiveQuery(async () => {
    const schedule = await db.schedule.toArray();
    if (schedule.length === 0) return 0;
    const done: { status: 'completed'; deletedAt: null; scheduleId: string }[] = [];
    await db.sessions
      .where('status')
      .equals('completed')
      .each((s) => {
        if (s.scheduleId && !s.deletedAt) done.push({ status: 'completed', deletedAt: null, scheduleId: s.scheduleId });
      });
    return dueSchedules(schedule, done, todayISO()).length;
  }, []);
  useEffect(() => {
    if (due != null) void updateAppBadge(due);
  }, [due]);
  useEffect(() => {
    if (due == null) return;
    const check = () => {
      if (document.visibilityState === 'visible') void maybeNotifyDue({ enabled, dueCount: due, today: todayISO() });
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [due, enabled]);
  return due;
}
