import { db } from './db';
import { makeThumbnail } from '../lib/image';

export const THUMB_BATCH = 5;

/**
 * Tạo ảnh thu nhỏ còn thiếu (ảnh từ bản cũ hoặc nhập từ tệp sao lưu).
 * Mỗi lượt tối đa THUMB_BATCH ảnh rồi nhường luồng chính, để không chặn giao diện.
 * Trả về số ảnh đã tạo thumbnail. `make` có thể thay thế trong test (môi trường không có canvas).
 */
export async function ensureThumbnails(make: (data: ArrayBuffer, mime: string) => Promise<ArrayBuffer> = makeThumbnail): Promise<number> {
  let done = 0;
  const failed = new Set<string>();
  for (;;) {
    const batch = (await db.photos.filter((p) => !p.thumb && !failed.has(p.id)).limit(THUMB_BATCH).toArray()).map((p) => ({ id: p.id, mime: p.mimeType }));
    if (batch.length === 0) return done;
    for (const { id, mime } of batch) {
      try {
        const blob = await db.photoBlobs.get(id);
        if (!blob) {
          failed.add(id);
          continue;
        }
        const thumb = await make(blob.data, mime);
        await db.photos.update(id, { thumb });
        done++;
      } catch {
        failed.add(id); // ảnh hỏng/không giải mã được: bỏ qua, không lặp vô hạn
      }
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
