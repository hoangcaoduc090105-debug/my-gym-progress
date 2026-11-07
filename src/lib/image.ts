/**
 * Xử lý ảnh hoàn toàn trên thiết bị (canvas) — không gửi ảnh đi đâu.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Không đọc được ảnh (định dạng HEIC có thể không được trình duyệt hỗ trợ — hãy chọn JPEG/PNG).'));
    i.src = url;
  });
}

async function drawJpeg(img: HTMLImageElement, maxSide: number, quality: number): Promise<{ data: ArrayBuffer; width: number; height: number }> {
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
  return { data: await blob.arrayBuffer(), width: w, height: h };
}

/** Kiểm tra ArrayBuffer không phụ thuộc realm (dữ liệu đọc từ IndexedDB có thể thuộc realm khác). */
export function isArrayBuffer(x: unknown): x is ArrayBuffer {
  return x instanceof ArrayBuffer || Object.prototype.toString.call(x) === '[object ArrayBuffer]';
}

export const THUMB_SIDE = 320;
export const THUMB_QUALITY = 0.7;

/**
 * Thu nhỏ ảnh về cạnh dài tối đa maxSide px (JPEG) và tạo thêm ảnh thu nhỏ 320 px cho lưới ảnh.
 */
export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<{ data: ArrayBuffer; thumb: ArrayBuffer; mimeType: string; width: number; height: number }> {
  if (!/^image\//.test(file.type)) throw new Error('Tệp không phải ảnh.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const full = await drawJpeg(img, maxSide, quality);
    const thumb = await drawJpeg(img, THUMB_SIDE, THUMB_QUALITY);
    return { data: full.data, thumb: thumb.data, mimeType: 'image/jpeg', width: full.width, height: full.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tạo ảnh thu nhỏ từ bytes ảnh gốc (dùng cho ảnh cũ/ảnh nhập từ tệp sao lưu). */
export async function makeThumbnail(data: ArrayBuffer, mimeType: string): Promise<ArrayBuffer> {
  const url = photoUrl(data, mimeType);
  try {
    return (await drawJpeg(await loadImage(url), THUMB_SIDE, THUMB_QUALITY)).data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoUrl(data: ArrayBuffer, mimeType: string): string {
  return URL.createObjectURL(new Blob([data], { type: mimeType }));
}
