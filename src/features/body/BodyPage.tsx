import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { Camera, Columns2, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { BODY_FIELDS, BODY_FIELD_LABELS, BODY_FIELD_UNITS, POSE_LABELS, type BodyField, type BodyMetric, type PhotoPose, type ProgressPhoto } from '../../db/types';
import { Badge, Button, Card, EmptyState, Explain, Field, FormError, IconButton, Insufficient, Modal, NumberInput, PageHeader, Segmented, Spinner, Tabs, cx } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { TrendLineChart } from '../../components/charts';
import { addPhoto, getPhotoData, loadSchemas, saveBodyMetric, softDeleteBodyMetric, softDeletePhoto } from '../../db/repo';
import { aggregate, linearTrend, seriesOf, type Granularity } from '../../domain/bodyTrends';
import { THRESHOLDS } from '../../domain/thresholds';
import { formatDate, formatMonth, formatShort, todayISO } from '../../lib/date';
import { fmt1, signed } from '../../lib/format';
import { compressImage, photoUrl } from '../../lib/image';
import { FieldErrorsContext, useFieldErrors } from '../../lib/formErrors';

type Tab = 'log' | 'chart' | 'photos';

export default function BodyPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'log';
  const [formOpen, setFormOpen] = useState(params.get('moi') === '1');
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const metrics = useLiveQuery(() => db.bodyMetrics.toArray(), []);
  if (!metrics) return <Spinner />;
  const active = metrics.filter((m) => !m.deletedAt).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <PageHeader
        title="Cơ thể"
        subtitle="Cân nặng, số đo vòng và ảnh tiến độ"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Ghi số đo
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'log', label: 'Nhật ký' },
          { value: 'chart', label: 'Biểu đồ' },
          { value: 'photos', label: 'Ảnh' },
        ]}
      />
      {tab === 'log' && (
        <MetricLog
          metrics={active}
          onEdit={(m) => {
            setEditing(m);
            setFormOpen(true);
          }}
        />
      )}
      {tab === 'chart' && <MetricCharts metrics={active} />}
      {tab === 'photos' && <Photos />}
      <MetricForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} last={active[0]} />
    </div>
  );
}

function MetricForm({ open, onClose, initial, last }: { open: boolean; onClose: () => void; initial: BodyMetric | null; last?: BodyMetric }) {
  const { toast, toastError } = useFeedback();
  const [date, setDate] = useState(todayISO());
  const [vals, setVals] = useState<Partial<Record<BodyField, number | null>>>({});
  const [note, setNote] = useState('');
  const fe = useFieldErrors();
  const { clearAll } = fe;
  useEffect(() => {
    if (!open) return;
    clearAll();
    setDate(initial?.date ?? todayISO());
    setVals(initial ? Object.fromEntries(BODY_FIELDS.map((f) => [f, initial[f] ?? null])) : {});
    setNote(initial?.note ?? '');
  }, [open, initial, clearAll]);

  async function save() {
    const clean = Object.fromEntries(BODY_FIELDS.map((f) => [f, vals[f] ?? null]));
    const S = await loadSchemas();
    const v = S.bodyMetricSchema.safeParse({ id: 'x', date, note, ...clean, createdAt: 'x', updatedAt: 'x' });
    if (!v.success) return fe.setFromZod(v.error);
    try {
      await saveBodyMetric({ id: initial?.id, date, note, ...clean });
      toast('Đã lưu số đo');
      onClose();
    } catch (e) {
      toastError(e);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Sửa số đo' : 'Ghi số đo mới'}
      footer={
        <Button variant="primary" block onClick={() => void save()}>
          Lưu
        </Button>
      }
    >
      <FieldErrorsContext.Provider value={fe}>
      <div className="space-y-3" ref={fe.containerRef as React.RefObject<HTMLDivElement>}>
        <FormError />
        <Field name="date" label="Ngày">{(id) => <input id={id} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          {BODY_FIELDS.map((f) => (
            <Field key={f} name={f} label={`${BODY_FIELD_LABELS[f]} (${BODY_FIELD_UNITS[f]})`}>
              {(id) => (
                <NumberInput
                  id={id}
                  value={vals[f] ?? null}
                  min={0}
                  max={400}
                  placeholder={last?.[f] != null ? fmt1(last[f]) : '—'}
                  onChange={(v) => setVals((x) => ({ ...x, [f]: v }))}
                />
              )}
            </Field>
          ))}
        </div>
        <Field name="note" label="Ghi chú">{(id) => <input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd. sáng, trước ăn" className="w-full" />}</Field>
        <p className="text-xs text-muted">
          Chỉ cần nhập chỉ số bạn đo. Để so sánh chính xác: đo cùng thời điểm (buổi sáng, sau vệ sinh, trước ăn), cùng vị trí thước dây. Ứng dụng không ước tính tỷ lệ mỡ cơ thể.
        </p>
      </div>
      </FieldErrorsContext.Provider>
    </Modal>
  );
}

function MetricLog({ metrics, onEdit }: { metrics: BodyMetric[]; onEdit: (m: BodyMetric) => void }) {
  const { confirm, toast } = useFeedback();
  if (metrics.length === 0) return <EmptyState title="Chưa có số đo nào" >Bấm "Ghi số đo" để thêm lần đo đầu tiên.</EmptyState>;
  return (
    <div className="space-y-2">
      {metrics.map((m) => (
        <Card key={m.id} className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="font-semibold">{formatDate(m.date)}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {BODY_FIELDS.filter((f) => m[f] != null).map((f) => (
                  <span key={f}>
                    <span className="text-muted">{BODY_FIELD_LABELS[f]}:</span>{' '}
                    <span className="font-medium tabular">
                      {fmt1(m[f])} {BODY_FIELD_UNITS[f]}
                    </span>
                  </span>
                ))}
              </div>
              {m.note && <div className="mt-1 text-xs text-muted">{m.note}</div>}
            </div>
            <IconButton label="Sửa" onClick={() => onEdit(m)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton
              label="Xóa"
              onClick={async () => {
                if (await confirm({ title: 'Xóa lần đo này?', message: 'Chuyển vào Thùng rác, khôi phục được trong Cài đặt.', danger: true, confirmText: 'Xóa' })) {
                  await softDeleteBodyMetric(m.id);
                  toast('Đã chuyển vào Thùng rác');
                }
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MetricCharts({ metrics }: { metrics: BodyMetric[] }) {
  const [field, setField] = useState<BodyField>('weightKg');
  const [g, setG] = useState<Granularity>('day');
  const points = useMemo(() => seriesOf(metrics, field), [metrics, field]);
  const agg = aggregate(points, g);
  const trend = linearTrend(points);
  const unit = BODY_FIELD_UNITS[field];
  const data = agg.map((a) => ({ label: g === 'month' ? formatMonth(a.key) : formatShort(a.key), value: a.value }));

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {BODY_FIELDS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setField(f)}
            aria-pressed={field === f}
            className={cx('h-9 shrink-0 rounded-full px-3 text-sm font-medium', field === f ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
          >
            {BODY_FIELD_LABELS[f]}
          </button>
        ))}
      </div>
      <Segmented
        className="w-full"
        value={g}
        onChange={setG}
        options={[
          { value: 'day', label: 'Ngày' },
          { value: 'week', label: 'Tuần' },
          { value: 'month', label: 'Tháng' },
        ]}
      />
      <Card title={`${BODY_FIELD_LABELS[field]} (${unit})`}>
        {points.length === 0 ? (
          <Insufficient>Chưa có dữ liệu {BODY_FIELD_LABELS[field].toLowerCase()}.</Insufficient>
        ) : (
          <TrendLineChart data={data} series={[{ key: 'value', name: BODY_FIELD_LABELS[field], unit }]} />
        )}
        <div className="mt-3 text-sm">
          {trend.status === 'ok' ? (
            <div>
              Xu hướng: <strong className="tabular">{signed(trend.slopePerWeek, 2)} {unit}/tuần</strong>{' '}
              <span className="text-muted">
                ({trend.points} lần đo trong {trend.spanDays} ngày)
              </span>
            </div>
          ) : (
            <div className="text-muted">Chưa đủ dữ liệu để tính xu hướng. {trend.reason}</div>
          )}
        </div>
        <Explain>
          <p>
            <strong>Ngày</strong>: từng lần đo. <strong>Tuần</strong> (Thứ Hai–CN) và <strong>Tháng</strong>: trung bình các lần đo trong kỳ, giúp giảm dao động do nước, muối, glycogen.
          </p>
          <p>
            <strong>Xu hướng</strong>: hồi quy tuyến tính trên mọi lần đo, quy đổi ra đơn vị/tuần. Chỉ hiển thị khi có ≥ {THRESHOLDS.minTrendPoints} lần đo trải dài ≥{' '}
            {THRESHOLDS.minTrendSpanDays} ngày, để tránh kết luận từ dao động ngắn hạn.
          </p>
        </Explain>
      </Card>
    </div>
  );
}

/** Ô ảnh trong lưới: dùng ảnh thu nhỏ (thumb). Ảnh cũ chưa có thumb hiện ô chờ — bước nền sẽ tạo. */
function PhotoThumb({ p, selected, onClick }: { p: ProgressPhoto; selected?: boolean; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!p.thumb) return setUrl(null);
    const u = photoUrl(p.thumb, 'image/jpeg');
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [p.thumb]);
  return (
    <button type="button" onClick={onClick} className={cx('relative aspect-[3/4] overflow-hidden rounded-xl bg-surface2', selected && 'ring-2 ring-accent')}>
      {url ? (
        <img src={url} alt={`Ảnh ${POSE_LABELS[p.pose]} ngày ${formatShort(p.date)}`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full items-center justify-center text-[11px] text-muted">Đang tạo ảnh thu nhỏ…</span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-left text-[11px] font-medium text-white">
        {formatShort(p.date)} · {POSE_LABELS[p.pose]}
      </span>
    </button>
  );
}

/** Ảnh gốc — chỉ tải bytes từ photoBlobs khi xem lớn hoặc so sánh. */
function PhotoFull({ p }: { p: ProgressPhoto }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let alive = true;
    void getPhotoData(p.id).then((data) => {
      if (!alive || !data) return;
      u = photoUrl(data, p.mimeType);
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [p.id, p.mimeType]);
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface2">
      {url ? <img src={url} alt={`Ảnh ${POSE_LABELS[p.pose]} ngày ${formatShort(p.date)}`} className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-xs text-muted">Đang tải…</span>}
    </div>
  );
}

function Photos() {
  const { toast, toastError, confirm } = useFeedback();
  const photos = useLiveQuery(async () => (await db.photos.toArray()).filter((p) => !p.deletedAt).sort((a, b) => b.date.localeCompare(a.date)), []);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [filter, setFilter] = useState<PhotoPose | 'all'>('all');
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!photos) return <Spinner />;
  const shown = photos.filter((p) => filter === 'all' || p.pose === filter);
  const pair = compare.map((id) => photos.find((p) => p.id === id)).filter((p): p is ProgressPhoto => !!p).sort((a, b) => a.date.localeCompare(b.date));

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const img = await compressImage(f);
      await addPhoto({ date, pose, ...img });
      toast('Đã lưu ảnh trên thiết bị');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Thêm ảnh tiến độ">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày chụp">{(id) => <input id={id} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />}</Field>
          <Field label="Góc chụp">
            {(id) => (
              <select id={id} value={pose} onChange={(e) => setPose(e.target.value as PhotoPose)}>
                {(Object.keys(POSE_LABELS) as PhotoPose[]).map((p) => (
                  <option key={p} value={p}>
                    {POSE_LABELS[p]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button className="mt-3" block variant="primary" icon={<Camera size={18} />} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? 'Đang xử lý…' : 'Chọn / chụp ảnh'}
        </Button>
        <p className="mt-2 text-xs text-muted">Ảnh được thu nhỏ (tối đa 1600 px) và lưu trong trình duyệt trên thiết bị này, không tải lên đâu cả. Ứng dụng không phân tích ảnh hay ước tính tỷ lệ mỡ.</p>
      </Card>

      <div className="flex items-center gap-2">
        <Segmented
          className="flex-1"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'Tất cả' }, ...(Object.keys(POSE_LABELS) as PhotoPose[]).map((p) => ({ value: p, label: POSE_LABELS[p] }))]}
        />
      </div>

      {compare.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-surface2 p-2 text-sm">
          <Columns2 size={16} className="text-accent" />
          <span className="flex-1">Đã chọn {compare.length}/2 ảnh để so sánh</span>
          <Button size="sm" variant="ghost" onClick={() => setCompare([])}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState title="Chưa có ảnh">Chụp cùng góc, cùng ánh sáng và khoảng cách để so sánh chính xác.</EmptyState>
      ) : (
        <>
          <p className="text-xs text-muted">Chạm ảnh để xem. Dùng nút "So sánh" dưới ảnh để chọn 2 ảnh.</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {shown.map((p) => (
              <div key={p.id} className="space-y-1">
                <PhotoThumb p={p} selected={compare.includes(p.id)} onClick={() => setViewing(p)} />
                <button
                  type="button"
                  className={cx('h-8 w-full rounded-lg text-xs', compare.includes(p.id) ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
                  onClick={() => setCompare((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c.slice(-1), p.id]))}
                >
                  {compare.includes(p.id) ? 'Đã chọn' : 'So sánh'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={pair.length === 2} onClose={() => setCompare([])} title="So sánh ảnh" wide>
        <div className="grid grid-cols-2 gap-2">
          {pair.map((p) => (
            <div key={p.id}>
              <PhotoFull p={p} />
              <div className="mt-1 text-center text-xs text-muted">{formatDate(p.date)}</div>
            </div>
          ))}
        </div>
        {pair.length === 2 && (
          <p className="mt-3 text-center text-sm">
            Cách nhau <Badge tone="accent">{Math.round((new Date(pair[1]!.date).getTime() - new Date(pair[0]!.date).getTime()) / 86400000)} ngày</Badge>
          </p>
        )}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${formatDate(viewing.date)} · ${POSE_LABELS[viewing.pose]}` : ''}>
        {viewing && (
          <div className="space-y-3">
            <PhotoFull p={viewing} />
            <Button
              block
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (await confirm({ title: 'Xóa ảnh này?', message: 'Ảnh được chuyển vào Thùng rác, khôi phục được trong Cài đặt.', danger: true, confirmText: 'Xóa' })) {
                  await softDeletePhoto(viewing.id);
                  setViewing(null);
                  setCompare((c) => c.filter((x) => x !== viewing.id));
                }
              }}
            >
              Xóa ảnh
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
