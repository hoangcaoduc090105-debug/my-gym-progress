import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { sessionsWithExercise, prSessionIdsFor } from '../../db/history';
import { formatSets, historyRows, rangeStart, type HistoryRange, type HistoryRow } from '../../domain/exerciseHistory';
import type { OneRmFormula } from '../../domain/oneRepMax';
import { Badge, Button, Spinner, cx } from '../../components/ui';
import { formatDate } from '../../lib/date';
import { fmt1 } from '../../lib/format';
import { todayISO } from '../../lib/date';

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: '3m', label: '3 tháng' },
  { value: '1y', label: '1 năm' },
  { value: 'all', label: 'Tất cả' },
];

/**
 * Lịch sử từng buổi của một bài: ngày, tên buổi, các hiệp, e1RM tốt nhất, huy hiệu PR.
 * Tải theo trang (`pageSize`), có bộ lọc 3 tháng / 1 năm / tất cả (tắt bằng `filters={false}`).
 */
export default function ExerciseHistoryList({
  exerciseId,
  formula,
  pageSize = 20,
  filters = true,
  paged = true,
  excludeSessionId,
  onNavigate,
}: {
  exerciseId: string;
  formula: OneRmFormula;
  pageSize?: number;
  filters?: boolean;
  paged?: boolean;
  excludeSessionId?: string;
  /** Gọi trước khi chuyển sang trang chi tiết buổi (vd. đóng hộp thoại). */
  onNavigate?: () => void;
}) {
  const [range, setRange] = useState<HistoryRange>(filters ? '3m' : 'all');
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [prIds, setPrIds] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    void prSessionIdsFor(exerciseId, formula).then((s) => !off && setPrIds(s));
    return () => {
      off = true;
    };
  }, [exerciseId, formula]);

  const load = useCallback(
    async (before: string | undefined, append: boolean) => {
      if (!prIds) return;
      setBusy(true);
      try {
        const r = await sessionsWithExercise(exerciseId, { before, limit: pageSize, since: rangeStart(range, todayISO()), excludeSessionId });
        const page = historyRows(r.sessions, exerciseId, formula, prIds);
        setRows((old) => (append && old ? [...old, ...page] : page));
        setNext(r.next);
      } finally {
        setBusy(false);
      }
    },
    [exerciseId, formula, pageSize, range, excludeSessionId, prIds],
  );

  useEffect(() => {
    void load(undefined, false);
  }, [load]);

  return (
    <div>
      {filters && (
        <div className="mb-3 flex gap-1.5" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => setRange(r.value)}
              className={cx('h-11 rounded-full px-4 text-sm font-medium', range === r.value ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted')}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {rows == null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">{range === 'all' ? 'Chưa có buổi nào có bài này.' : 'Không có buổi nào trong khoảng này — thử "Tất cả".'}</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line/60">
          {rows.map((r) => (
            <li key={r.sessionId}>
              <Link to={`/lich-tap/buoi/${r.sessionId}`} onClick={onNavigate} className="flex min-h-[56px] items-center gap-2 rounded-xl px-2 py-2 hover:bg-surface2" data-testid="history-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {formatDate(r.date)}
                    {r.isPR && (
                      <Badge tone="accent">
                        <Trophy size={12} className="mr-0.5 inline" />
                        PR
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted">{r.dayName}</div>
                  <div className="mt-0.5 text-sm tabular">{formatSets(r.sets)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-muted">e1RM</div>
                  <div className="text-sm font-semibold tabular">{r.bestE1RM != null ? fmt1(r.bestE1RM) : '—'}</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {paged && next && (
        <Button block className="mt-3" disabled={busy} onClick={() => void load(next, true)}>
          Xem thêm
        </Button>
      )}
    </div>
  );
}
