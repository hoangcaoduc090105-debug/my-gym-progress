/**
 * Thu nhỏ ảnh về cạnh dài tối đa maxSide px, nén JPEG — xử lý hoàn toàn trên thiết bị
 * để tiết kiệm bộ nhớ IndexedDB. Không gửi ảnh đi đâu.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<{ data: ArrayBuffer; mimeType: string; width: number; height: number }> {
  if (!/^image\//.test(file.type)) throw new Error('Tệp không phải ảnh.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Không đọc được ảnh (định dạng HEIC có thể không được trình duyệt hỗ trợ — hãy chọn JPEG/PNG).'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Nén ảnh thất bại.'))), 'image/jpeg', quality));
    return { data: await blob.arrayBuffer(), mimeType: 'image/jpeg', width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoUrl(data: ArrayBuffer, mimeType: string): string {
  return URL.createObjectURL(new Blob([data], { type: mimeType }));
}
