/**
 * Đăng ký các hàng đợi ghi đang mở (ví dụ màn hình đang tập) để nơi khác có thể chờ chúng ghi xong,
 * ví dụ nút "Cập nhật" phiên bản app phải chờ trước khi tải lại trang.
 */
type Flusher = () => Promise<void>;
const flushers = new Set<Flusher>();

export function registerFlusher(fn: Flusher): () => void {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

/** Ghi ngay mọi thay đổi đang chờ (bỏ qua debounce) và chờ hàng đợi trống. */
export async function flushPending(): Promise<void> {
  await Promise.all([...flushers].map((f) => f().catch(() => undefined)));
}
