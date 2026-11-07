import { Component, type ReactNode } from 'react';
import { downloadText, stampedName } from '../lib/download';

interface State {
  error: Error | null;
}

/** Khi giao diện lỗi: dữ liệu vẫn an toàn trong IndexedDB; cho phép xuất sao lưu khẩn cấp. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  private async emergencyExport() {
    try {
      const { exportAll } = await import('../backup/backup');
      const b = await exportAll({ includePhotos: false, appVersion: __APP_VERSION__ });
      downloadText(stampedName('my-gym-progress-khan-cap', 'json'), JSON.stringify(b), 'application/json');
    } catch (e) {
      alert('Không xuất được dữ liệu: ' + String(e));
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">Đã xảy ra lỗi hiển thị</h1>
        <p className="mt-2 text-sm text-muted">Dữ liệu của bạn vẫn được lưu trên thiết bị. Hãy thử tải lại trang.</p>
        <pre className="mt-3 overflow-auto rounded-xl bg-surface p-3 text-left text-xs text-danger">{this.state.error.message}</pre>
        <div className="mt-4 flex flex-col gap-2">
          <button className="h-11 rounded-xl bg-accent font-semibold text-accent-ink" onClick={() => location.reload()}>
            Tải lại trang
          </button>
          <button className="h-11 rounded-xl bg-surface2" onClick={() => void this.emergencyExport()}>
            Xuất sao lưu khẩn cấp (JSON)
          </button>
        </div>
      </div>
    );
  }
}
