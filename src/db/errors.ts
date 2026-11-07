/** Lỗi nghiệp vụ có thông điệp tiếng Việt hiển thị trực tiếp cho người dùng. */
export class AppError extends Error {
  details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'AppError';
    this.details = details;
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof AppError) return e.details.length ? `${e.message}\n• ${e.details.join('\n• ')}` : e.message;
  if (e instanceof Error) {
    if (e.name === 'QuotaExceededError') return 'Bộ nhớ thiết bị đã đầy. Hãy xuất sao lưu và xóa bớt ảnh tiến độ.';
    return `Đã xảy ra lỗi: ${e.message}`;
  }
  return 'Đã xảy ra lỗi không xác định.';
}
