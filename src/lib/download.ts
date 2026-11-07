/** Tải tệp xuống thiết bị — tạo hoàn toàn cục bộ, không gửi đi đâu. Nhận chuỗi hoặc Blob (sao lưu lớn). */
export function downloadText(filename: string, content: string | Blob, mime: string): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampedName(base: string, ext: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}
