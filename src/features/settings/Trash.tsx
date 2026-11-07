import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { BODY_FIELDS, BODY_FIELD_LABELS, POSE_LABELS } from '../../db/types';
import { Card, IconButton } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { purgeBodyMetric, purgePhoto, purgeSession, restoreBodyMetric, restorePhoto, restoreSession } from '../../db/repo';
import { formatDate } from '../../lib/date';
import { fmt1 } from '../../lib/format';

/** Thùng rác: chỉ người dùng mới xóa vĩnh viễn — app không bao giờ tự dọn. */
export function Trash() {
  const { confirm, toast, toastError } = useFeedback();
  const data = useLiveQuery(async () => ({
    sessions: await db.sessions.filter((s) => !!s.deletedAt).toArray(),
    metrics: await db.bodyMetrics.filter((s) => !!s.deletedAt).toArray(),
    // Chỉ đọc siêu dữ liệu (bảng photos không còn chứa bytes ảnh gốc).
    photos: (await db.photos.filter((s) => !!s.deletedAt).toArray()).map((p) => ({ id: p.id, date: p.date, pose: p.pose })),
  }), []);
  if (!data) return null;
  const rows = [
    ...data.sessions.map((s) => ({ id: s.id, kind: 'Buổi tập', title: s.dayName, date: s.date, restore: () => restoreSession(s.id), purge: () => purgeSession(s.id) })),
    ...data.metrics.map((m) => ({
      id: m.id,
      kind: 'Số đo',
      title: BODY_FIELDS.filter((f) => m[f] != null).map((f) => `${BODY_FIELD_LABELS[f]} ${fmt1(m[f])}`).join(', '),
      date: m.date,
      restore: () => restoreBodyMetric(m.id),
      purge: () => purgeBodyMetric(m.id),
    })),
    ...data.photos.map((p) => ({ id: p.id, kind: 'Ảnh', title: POSE_LABELS[p.pose], date: p.date, restore: () => restorePhoto(p.id), purge: () => purgePhoto(p.id) })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card title={`Thùng rác (${rows.length})`} id="thung-rac">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Trống. Mục bị xóa sẽ nằm ở đây cho tới khi bạn xóa vĩnh viễn.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-1 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {r.kind}: {r.title}
                </div>
                <div className="text-xs text-muted">{formatDate(r.date)}</div>
              </div>
              <IconButton label="Khôi phục" onClick={() => void r.restore().then(() => toast('Đã khôi phục')).catch(toastError)}>
                <RotateCcw size={18} />
              </IconButton>
              <IconButton
                label="Xóa vĩnh viễn"
                onClick={async () => {
                  if (await confirm({ title: 'Xóa vĩnh viễn?', message: 'Không thể hoàn tác. Hãy chắc chắn bạn đã có bản sao lưu nếu cần.', danger: true, confirmText: 'Xóa vĩnh viễn' }))
                    await r.purge().catch(toastError);
                }}
              >
                <Trash2 size={18} className="text-danger" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
