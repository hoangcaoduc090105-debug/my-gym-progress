import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutSession } from '../../db/types';
import { saveSession } from '../../db/repo';
import { registerFlusher } from '../../lib/saveQueue';

export type SaveState = 'saved' | 'saving' | 'error';
export const TEXT_DEBOUNCE_MS = 400;

/**
 * Hàng đợi ghi buổi tập:
 * - commit(): số liệu hiệp, ✓, thêm/bớt hiệp — ghi ngay.
 * - commitText(): ghi chú, cảm nhận, tên buổi — debounce 400 ms; flush khi blur, ẩn/đóng trang, trước khi Hoàn thành.
 * Mỗi lượt ghi lấy trạng thái MỚI NHẤT (latest.current) nên các thay đổi dồn lại được gộp.
 * Ghi lỗi => saveState 'error', giữ nguyên nội dung người dùng; retry() ghi lại.
 */
export function useSessionWriter(initial: WorkoutSession | null) {
  const [s, setS] = useState<WorkoutSession | null>(initial);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const latest = useRef<WorkoutSession | null>(initial);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0); // tăng mỗi khi state đổi
  const savedVersion = useRef(0);

  const load = useCallback((x: WorkoutSession) => {
    latest.current = x;
    setS(x);
  }, []);

  const writeNow = useCallback((): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSaveState('saving');
    queue.current = queue.current.then(async () => {
      const target = version.current;
      const snap = latest.current;
      if (!snap || target === savedVersion.current) {
        if (savedVersion.current === version.current) setSaveState('saved');
        return;
      }
      try {
        await saveSession(snap);
        savedVersion.current = Math.max(savedVersion.current, target);
        if (savedVersion.current === version.current) setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    });
    return queue.current;
  }, []);

  const apply = useCallback((fn: (cur: WorkoutSession) => WorkoutSession) => {
    const cur = latest.current;
    if (!cur) return false;
    const next = fn(cur);
    latest.current = next;
    version.current += 1;
    setS(next);
    return true;
  }, []);

  const commit = useCallback(
    (fn: (cur: WorkoutSession) => WorkoutSession) => {
      if (apply(fn)) void writeNow();
    },
    [apply, writeNow],
  );

  const commitText = useCallback(
    (fn: (cur: WorkoutSession) => WorkoutSession) => {
      if (!apply(fn)) return;
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void writeNow(), TEXT_DEBOUNCE_MS);
    },
    [apply, writeNow],
  );

  /** Ghi ngay phần đang chờ (nếu có), chờ hàng đợi trống; trả về true nếu mọi thay đổi đã được lưu. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current || version.current !== savedVersion.current) await writeNow();
    else await queue.current;
    return version.current === savedVersion.current;
  }, [writeNow]);

  const retry = useCallback(() => writeNow(), [writeNow]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onUnload = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    const unregister = registerFlusher(async () => {
      await flush();
    });
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      unregister();
      void flush(); // rời trang trong app (điều hướng) => ghi nốt
    };
  }, [flush]);

  return { s, latest, load, commit, commitText, flush, retry, saveState };
}
