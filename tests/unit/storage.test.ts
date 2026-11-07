import { checkFreeSpace, requestAndRecordPersistence, requestPersistence, retryPersistenceOnFirstInteraction, setPersistRecorder, SPACE_FACTOR } from '../../src/lib/storage';
import { addPhoto } from '../../src/db/repo';
import { db } from '../../src/db/db';
import { persistAfterFirstWorkout, readPersisted } from '../../src/db/persistence';
import { resetDb } from '../integration/helpers';

type StorageMock = Partial<Pick<StorageManager, 'persist' | 'persisted' | 'estimate'>>;
const original = Object.getOwnPropertyDescriptor(navigator, 'storage');
function mockStorage(m: StorageMock | undefined) {
  Object.defineProperty(navigator, 'storage', { configurable: true, value: m });
}
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'storage', original);
  else Reflect.deleteProperty(navigator, 'storage');
  setPersistRecorder(null);
});

describe('requestPersistence', () => {
  it('đã bền vững sẵn → true, không gọi persist()', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => true, persist });
    expect(await requestPersistence()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
  it('trình duyệt cấp → true', async () => {
    mockStorage({ persisted: async () => false, persist: async () => true });
    expect(await requestPersistence()).toBe(true);
  });
  it('trình duyệt từ chối → false', async () => {
    mockStorage({ persisted: async () => false, persist: async () => false });
    expect(await requestPersistence()).toBe(false);
  });
  it('không hỗ trợ API → null', async () => {
    mockStorage(undefined);
    expect(await requestPersistence()).toBeNull();
  });
  it('API ném lỗi → null', async () => {
    mockStorage({ persisted: async () => Promise.reject(new Error('x')), persist: async () => true });
    expect(await requestPersistence()).toBeNull();
  });
});

describe('ghi kết quả & xin lại', () => {
  beforeEach(async () => {
    await resetDb();
    setPersistRecorder(async (v) => {
      await db.meta.put({ key: 'persisted', value: v });
    });
  });

  it('requestAndRecordPersistence lưu meta.persisted', async () => {
    mockStorage({ persisted: async () => false, persist: async () => false });
    expect(await requestAndRecordPersistence()).toBe(false);
    expect(await readPersisted()).toBe(false);
  });

  it('pointerdown đầu tiên xin lại đúng một lần', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => false, persist });
    retryPersistenceOnFirstInteraction();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(async () => expect(await readPersisted()).toBe(true));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('sau buổi hoàn thành đầu tiên: xin lại; chưa có buổi nào thì không', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => false, persist });
    expect(await persistAfterFirstWorkout()).toBeUndefined();
    expect(persist).not.toHaveBeenCalled();
    await db.sessions.add({ id: 's1', date: '2026-01-01', status: 'completed', startedAt: 'x', exercises: [], createdAt: 'x', updatedAt: 'x' } as never);
    expect(await persistAfterFirstWorkout()).toBe(true);
    expect(await readPersisted()).toBe(true);
  });
});

describe('kiểm tra dung lượng (2 × cần)', () => {
  it('đủ chỗ → null; thiếu chỗ → thông báo lỗi', async () => {
    mockStorage({ estimate: async () => ({ quota: 10_000, usage: 7_000 }) });
    expect(await checkFreeSpace(1_000, SPACE_FACTOR)).toBeNull();
    const msg = await checkFreeSpace(2_000, SPACE_FACTOR);
    expect(msg).toMatch(/Không đủ dung lượng/);
  });
  it('trình duyệt không cho biết hạn mức → không chặn', async () => {
    mockStorage({});
    expect(await checkFreeSpace(10 ** 12, SPACE_FACTOR)).toBeNull();
  });
  it('addPhoto báo lỗi rõ ràng khi thiếu chỗ, không ghi gì', async () => {
    await resetDb();
    mockStorage({ estimate: async () => ({ quota: 1_000, usage: 900 }) });
    await expect(addPhoto({ date: '2026-01-01', pose: 'front', mimeType: 'image/jpeg', data: new ArrayBuffer(80) })).rejects.toThrow(/Không đủ dung lượng/);
    expect(await db.photos.count()).toBe(0);
    expect(await db.photoBlobs.count()).toBe(0);
  });
});
