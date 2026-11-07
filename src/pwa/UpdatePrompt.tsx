import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../components/ui';

/**
 * Cập nhật kiểu "prompt": có bản mới thì HỎI người dùng, không tự tải lại
 * (tránh mất thao tác khi đang ghi hiệp tập). Dữ liệu IndexedDB không bị ảnh hưởng khi cập nhật.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[55] flex justify-center p-3 pt-safe">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-info/40 bg-[#0f2230] p-3 text-sm shadow-xl">
        {needRefresh ? <RefreshCw size={18} className="shrink-0 text-info" /> : <WifiOff size={18} className="shrink-0 text-info" />}
        <div className="flex-1">
          {needRefresh ? 'Có phiên bản mới. Dữ liệu của bạn được giữ nguyên.' : 'Ứng dụng đã sẵn sàng dùng offline.'}
        </div>
        {needRefresh ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Để sau
            </Button>
            <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
              Cập nhật
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setOfflineReady(false)}>
            OK
          </Button>
        )}
      </div>
    </div>
  );
}
