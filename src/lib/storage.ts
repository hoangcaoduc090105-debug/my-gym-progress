/** Xin trình duyệt lưu trữ bền vững để IndexedDB không bị tự động dọn khi thiếu dung lượng. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function storageInfo(): Promise<{ persisted: boolean | null; usage: number | null; quota: number | null }> {
  try {
    const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    return { persisted, usage: est?.usage ?? null, quota: est?.quota ?? null };
  } catch {
    return { persisted: null, usage: null, quota: null };
  }
}

export function formatBytes(n: number | null): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

/* ---------- Thông báo dung lượng thay đổi (xuất/nhập, thêm/xóa ảnh, xóa thùng rác) ---------- */
const STORAGE_EVT = 'mgp-storage-changed';

export function notifyStorageChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_EVT));
}

export function onStorageChanged(cb: () => void): () => void {
  window.addEventListener(STORAGE_EVT, cb);
  return () => window.removeEventListener(STORAGE_EVT, cb);
}

/**
 * Kiểm tra còn đủ chỗ trống để ghi `needed` byte (nhân hệ số an toàn `factor`).
 * Trả về thông báo lỗi tiếng Việt nếu không đủ; null nếu đủ hoặc trình duyệt không cho biết hạn mức.
 */
export async function checkFreeSpace(needed: number, factor = 1): Promise<string | null> {
  try {
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    if (!est || est.quota == null || est.usage == null) return null;
    const free = est.quota - est.usage;
    if (free < needed * factor) {
      return `Không đủ dung lượng trống trên thiết bị: cần khoảng ${formatBytes(needed * factor)}, còn ${formatBytes(Math.max(0, free))}. Hãy xóa bớt ảnh tiến độ hoặc giải phóng bộ nhớ rồi thử lại.`;
    }
    return null;
  } catch {
    return null;
  }
}

/* ---------- Xin lại lưu trữ bền vững ---------- */
/** Hệ số an toàn: chỉ ghi khi còn trống ít nhất 2 × dung lượng cần. */
export const SPACE_FACTOR = 2;

type PersistRecorder = (v: boolean | null) => Promise<void> | void;
let recorder: PersistRecorder | null = null;
/** App đăng ký nơi lưu kết quả (meta.persisted) — tách để lib không phụ thuộc db. */
export function setPersistRecorder(r: PersistRecorder | null): void {
  recorder = r;
}

/** Xin lưu trữ bền vững rồi ghi kết quả (true/false/null) qua recorder. */
export async function requestAndRecordPersistence(): Promise<boolean | null> {
  const r = await requestPersistence();
  try {
    await recorder?.(r);
  } catch {
    /* ghi meta lỗi không ảnh hưởng kết quả */
  }
  notifyStorageChanged();
  return r;
}

/**
 * Chrome/Edge thường chỉ cấp persist() sau khi người dùng tương tác với trang:
 * xin lại một lần ở lần chạm/nhấp đầu tiên. Trả về hàm hủy.
 */
export function retryPersistenceOnFirstInteraction(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onDown = () => {
    window.removeEventListener('pointerdown', onDown);
    void requestAndRecordPersistence();
  };
  window.addEventListener('pointerdown', onDown, { once: true });
  return () => window.removeEventListener('pointerdown', onDown);
}
