import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileJson, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import { db, USER_TABLES } from '../../db/db';
import { Badge, Button, Card, Modal, Segmented, Toggle } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { countConflicts, countExisting, exportAllToBlob, importBackup, parseBackupText, TABLE_LABELS, type BackupFile, type ImportMode } from '../../backup/backup';
import { bodyMetricsToCsv, workoutsToCsv } from '../../backup/csv';
import { downloadText, stampedName } from '../../lib/download';
import { checkFreeSpace, formatBytes, onStorageChanged, requestAndRecordPersistence, SPACE_FACTOR, storageInfo } from '../../lib/storage';
import { useSettings } from '../../app/useAppData';

const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

export function DataManagement() {
  const settings = useSettings();
  const { toast, toastError, confirm } = useFeedback();
  const [includePhotos, setIncludePhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ backup: BackupFile; counts: Record<string, number>; conflicts: number; existing: Record<string, number>; fileName: string } | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const fileRef = useRef<HTMLInputElement>(null);
  // storageInfo không phụ thuộc bảng nào => useState + làm mới sau xuất/nhập/xóa ảnh/xóa thùng rác.
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>> | null>(null);
  const refreshInfo = useCallback(() => void storageInfo().then(setInfo), []);
  useEffect(() => {
    refreshInfo();
    return onStorageChanged(refreshInfo);
  }, [refreshInfo]);
  const photoCount = useLiveQuery(() => db.photos.count(), []);

  async function doExport(withPhotos: boolean) {
    setBusy(true);
    try {
      const blob = await exportAllToBlob({ includePhotos: withPhotos, appVersion: __APP_VERSION__ });
      downloadText(stampedName('my-gym-progress', 'json'), blob, 'application/json');
      toast('Đã xuất bản sao lưu JSON');
      try {
        localStorage.setItem('mgp.lastBackup', new Date().toISOString());
      } catch {
        /* bỏ qua */
      }
      refreshInfo();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  async function retryPersist() {
    const r = await requestAndRecordPersistence();
    setInfo(await storageInfo());
    if (r === true) toast('Trình duyệt đã cấp lưu trữ bền vững');
    else toast('Trình duyệt chưa cấp. Cài app lên màn hình chính rồi mở lại, sau đó thử lại.', 'info');
  }

  async function onFile(f: File | undefined) {
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    setErrors(null);
    if (f.size > MAX_IMPORT_BYTES) return setErrors([`Tệp quá lớn (${formatBytes(f.size)}). Giới hạn ${formatBytes(MAX_IMPORT_BYTES)}.`]);
    const space = await checkFreeSpace(f.size, SPACE_FACTOR);
    if (space) return setErrors([space]);
    setBusy(true);
    try {
      const r = parseBackupText(await f.text());
      if (!r.ok || !r.backup) {
        setErrors(r.errors);
        return;
      }
      const [conflicts, existing] = await Promise.all([countConflicts(r.backup), countExisting()]);
      setPreview({ backup: r.backup, counts: r.counts as Record<string, number>, conflicts, existing, fileName: f.name });
      setMode('merge');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    if (!preview) return;
    const ok = await confirm({
      title: mode === 'replace' ? 'Thay thế TOÀN BỘ dữ liệu hiện tại?' : 'Gộp dữ liệu từ tệp?',
      message:
        mode === 'replace' ? (
          <>
            <p>Mọi dữ liệu hiện có trên thiết bị sẽ bị xóa và thay bằng nội dung tệp{!preview.backup.includesPhotos ? ' (ảnh hiện có được giữ lại vì tệp không kèm ảnh)' : ''}.</p>
            <p className="mt-2 text-warn">Khuyến nghị: bấm "Hủy", xuất một bản sao lưu hiện tại trước, rồi nhập lại.</p>
          </>
        ) : (
          <p>Dữ liệu hiện có được giữ. {preview.conflicts > 0 ? `${preview.conflicts} bản ghi trùng id sẽ bị ghi đè bằng bản trong tệp.` : 'Không có bản ghi trùng.'}</p>
        ),
      confirmText: mode === 'replace' ? 'Thay thế toàn bộ' : 'Gộp dữ liệu',
      danger: mode === 'replace',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { written, notices } = await importBackup(preview.backup, mode);
      const total = Object.values(written).reduce((a, b) => a + b, 0);
      toast(`Đã nhập ${total} bản ghi`);
      for (const n of notices) toast(n, 'info');
      setPreview(null);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv(kind: 'workouts' | 'body') {
    try {
      if (kind === 'workouts') {
        const [sessions, exercises] = await Promise.all([db.sessions.toArray(), db.exercises.toArray()]);
        downloadText(stampedName('my-gym-progress-lich-su-tap', 'csv'), workoutsToCsv(sessions, new Map(exercises.map((e) => [e.id, e])), settings.oneRmFormula, settings.weightUnit), 'text/csv;charset=utf-8');
      } else {
        downloadText(stampedName('my-gym-progress-so-do', 'csv'), bodyMetricsToCsv(await db.bodyMetrics.toArray(), settings.weightUnit), 'text/csv;charset=utf-8');
      }
      toast('Đã xuất CSV');
    } catch (e) {
      toastError(e);
    }
  }

  let lastBackup: string | null = null;
  try {
    lastBackup = localStorage.getItem('mgp.lastBackup');
  } catch {
    /* bỏ qua */
  }

  return (
    <Card title="Sao lưu & khôi phục" id="sao-luu">
      <div className="mb-3 flex gap-2 rounded-xl bg-surface2 p-3 text-xs text-muted">
        <ShieldCheck size={18} className="shrink-0 text-ok" />
        <div>
          Dữ liệu chỉ nằm trong trình duyệt trên thiết bị này. Xóa dữ liệu trình duyệt hoặc gỡ ứng dụng sẽ làm mất dữ liệu — hãy xuất JSON định kỳ và lưu vào nơi an toàn.
          <div className="mt-1">
            Lần xuất gần nhất trên thiết bị này: <span className="text-text">{lastBackup ? new Date(lastBackup).toLocaleString('vi-VN') : 'chưa có'}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Toggle label="Kèm ảnh tiến độ" hint={`${photoCount ?? 0} ảnh · tệp sẽ lớn hơn`} checked={includePhotos} onChange={setIncludePhotos} />
        <Button block variant="primary" icon={<Download size={18} />} disabled={busy} onClick={() => void doExport(includePhotos)}>
          Xuất toàn bộ dữ liệu (JSON)
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-input" />
        <Button block icon={<Upload size={18} />} disabled={busy} onClick={() => fileRef.current?.click()}>
          Nhập dữ liệu JSON
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<FileSpreadsheet size={18} />} onClick={() => void exportCsv('workouts')}>
            CSV lịch sử tập
          </Button>
          <Button icon={<FileSpreadsheet size={18} />} onClick={() => void exportCsv('body')}>
            CSV số đo
          </Button>
        </div>
      </div>
      {errors && (
        <div role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <div className="font-semibold">Tệp không hợp lệ — chưa có dữ liệu nào bị thay đổi.</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 text-xs text-muted">
        Dung lượng đang dùng: {formatBytes(info?.usage ?? null)} / {formatBytes(info?.quota ?? null)} · Lưu trữ bền vững:{' '}
        {info?.persisted == null ? 'không rõ' : info.persisted ? <Badge tone="ok">Đã bật</Badge> : <Badge tone="warn">Chưa được cấp</Badge>}
        {info?.persisted === false && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 p-2.5 text-text" data-testid="persist-hint">
            <span className="min-w-0 flex-1">Cài app lên màn hình chính rồi mở lại để trình duyệt cấp lưu trữ bền vững</span>
            <Button size="sm" variant="outline" onClick={() => void retryPersist()}>
              Thử cấp lại
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Kiểm tra tệp sao lưu"
        footer={
          <>
            <Button block onClick={() => setPreview(null)}>
              Hủy
            </Button>
            <Button block variant={mode === 'replace' ? 'danger' : 'primary'} disabled={busy} onClick={() => void doImport()}>
              Nhập
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <FileJson size={18} className="text-ok" />
              <span className="flex-1 truncate">{preview.fileName}</span>
              <Badge tone="ok">Hợp lệ</Badge>
            </div>
            <div className="text-xs text-muted">
              Xuất lúc {preview.backup.exportedAt ? new Date(preview.backup.exportedAt).toLocaleString('vi-VN') : '—'} · phiên bản app {preview.backup.appVersion || '—'}
            </div>
            <table className="w-full tabular">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-normal">Bảng</th>
                  <th className="text-right font-normal">Trong tệp</th>
                  <th className="text-right font-normal">Hiện có</th>
                </tr>
              </thead>
              <tbody>
                {USER_TABLES.map((t) => (
                  <tr key={t} className="border-t border-line/50">
                    <td className="py-1">{TABLE_LABELS[t]}</td>
                    <td className="text-right">{preview.counts[t] ?? 0}</td>
                    <td className="text-right text-muted">{preview.existing[t] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Segmented
              className="w-full"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: 'Gộp' },
                { value: 'replace', label: 'Thay thế toàn bộ' },
              ]}
            />
            <p className="text-xs text-muted">
              {mode === 'merge'
                ? `Giữ dữ liệu hiện có, thêm bản ghi mới; ${preview.conflicts} bản ghi trùng id sẽ được ghi đè.`
                : 'Xóa dữ liệu hiện có rồi ghi dữ liệu trong tệp. Toàn bộ chạy trong một giao dịch: nếu lỗi giữa chừng, dữ liệu cũ được giữ nguyên.'}
            </p>
            {mode === 'replace' && (
              <Button block size="sm" icon={<Download size={16} />} onClick={() => void doExport(true)}>
                Xuất bản sao lưu hiện tại trước
              </Button>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
