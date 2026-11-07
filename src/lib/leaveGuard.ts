/**
 * Chặn rời trang khi có thay đổi chưa lưu (HashRouter không có useBlocker).
 * Trang đang sửa đăng ký một hàm hỏi xác nhận; Layout gọi nó trước khi đi theo link nội bộ.
 */
type Guard = () => Promise<boolean>;
let current: Guard | null = null;

export function setLeaveGuard(g: Guard | null): void {
  current = g;
}

/** true = được phép rời trang. */
export async function confirmLeave(): Promise<boolean> {
  return current ? current() : true;
}

export function hasLeaveGuard(): boolean {
  return current != null;
}
