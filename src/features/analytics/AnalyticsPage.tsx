import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { BODY_FIELD_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type BodyField, type BodyMetric, type WorkoutSession } from '../../db/types';
import { Card, Explain, Insufficient, PageHeader, Segmented, Spinner, Stat } from '../../components/ui';
import { SimpleBarChart, TrendLineChart } from '../../components/charts';
import { useExerciseMap, useSettings } from '../../app/useAppData';
import { useUnits } from '../../app/useUnits';
import { activeCompleted } from '../../domain/sets';
import { countWorkingSets, setsByMuscle, totalVolume, weeklyBuckets } from '../../domain/volume';
import { recordsByExercise, strengthSeries } from '../../domain/records';
import { aggregate, linearTrend, seriesOf } from '../../domain/bodyTrends';
import { THRESHOLDS } from '../../domain/thresholds';
import { FORMULA_LABEL, type OneRmFormula } from '../../domain/oneRepMax';
import { stagnation } from '../../domain/stagnation';
import { addDays, formatDate, formatShort, startOfWeek, todayISO } from '../../lib/date';
import { fmt0, fmt1, signed } from '../../lib/format';

type Period = '4w' | '12w' | '26w' | 'all';
const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { '4w': 28, '12w': 84, '26w': 182 };

export default function AnalyticsPage() {
  const settings = useSettings();
  const u = useUnits();
  const exMap = useExerciseMap();
  const [period, setPeriod] = useState<Period>('12w');
  const data = useLiveQuery(async () => ({ sessions: await db.sessions.toArray(), metrics: await db.bodyMetrics.toArray() }), []);
  const completed = useMemo(() => activeCompleted(data?.sessions ?? []), [data]);
  const [exId, setExId] = useState<string>('');
  if (!data || !exMap) return <Spinner />;

  const today = todayISO();
  const from = period === 'all' ? (completed[0]?.date ?? today) : addDays(today, -PERIOD_DAYS[period] + 1);
  const inPeriod = completed.filter((s) => s.date >= from && s.date <= today);
  const weeks = weeklyBuckets(inPeriod, from, today);
  // Trung bình/tuần chỉ tính từ tuần có buổi tập đầu tiên trong kỳ,
  // để người mới tập 1 buổi không thấy "0,1 buổi/tuần" vì chia cho 12 tuần trống.
  const firstInPeriod = inPeriod[0]?.date ?? from;
  const nWeeks = Math.max(1, weeks.filter((w) => w.weekStart >= startOfWeek(firstInPeriod)).length);
  const muscle = setsByMuscle(inPeriod, exMap, settings.secondaryMuscleFactor);
  const records = recordsByExercise(completed, settings.oneRmFormula);
  const trainedIds = [...records.keys()].sort((a, b) => (exMap.get(a)?.nameVi ?? '').localeCompare(exMap.get(b)?.nameVi ?? '', 'vi'));
  // Mặc định chọn bài đã có e1RM (có hiệp ≤ 10 lần) để biểu đồ có ý nghĩa ngay.
  const defaultId = trainedIds.find((id) => records.get(id)?.bestE1RM) ?? trainedIds[0] ?? '';
  const selected = exId && records.has(exId) ? exId : defaultId;
  const series = selected ? strengthSeries(completed, selected, settings.oneRmFormula) : [];
  const withE = series.filter((p) => p.e1rm != null);
  const fullWeeks = weeks.filter((w) => w.weekStart <= startOfWeek(today));

  return (
    <div className="space-y-4">
      <PageHeader title="Phân tích" subtitle="Mọi chỉ số tính ngay trên thiết bị, kèm giải thích cách tính" />
      <Segmented
        className="w-full"
        value={period}
        onChange={setPeriod}
        options={[
          { value: '4w', label: '4 tuần' },
          { value: '12w', label: '12 tuần' },
          { value: '26w', label: '6 tháng' },
          { value: 'all', label: 'Tất cả' },
        ]}
      />

      {completed.length === 0 ? (
        <Insufficient>Chưa có buổi tập hoàn thành. Phân tích sẽ xuất hiện sau buổi tập đầu tiên.</Insufficient>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Buổi tập" value={inPeriod.length} hint={`TB ${fmt1(inPeriod.length / nWeeks)}/tuần`} />
            <Stat label="Hiệp làm việc" value={countWorkingSets(inPeriod)} />
            <Stat label="Tổng khối lượng" value={fmt0(u.show(totalVolume(inPeriod)))} unit={u.unit} />
          </div>

          <Card title="Số buổi tập mỗi tuần">
            <SimpleBarChart
              data={fullWeeks.map((w) => ({ label: formatShort(w.weekStart), value: w.sessions, deload: w.deloadSessions }))}
              series={{ key: 'value', name: 'Buổi tập', unit: 'buổi' }}
              height={180}
              highlight={(d) => !d.deload}
            />
            {fullWeeks.some((w) => w.deloadSessions > 0) && <p className="mt-1 text-xs text-muted">Cột màu nhạt: tuần có buổi nhẹ (deload).</p>}
            <Explain>
              <p>Đếm số buổi đã hoàn thành theo tuần (Thứ Hai–Chủ Nhật, nhãn là ngày Thứ Hai). Buổi đã xóa không được tính. Tuần hiện tại có thể chưa kết thúc.</p>
            </Explain>
          </Card>

          <Card title="Tổng số hiệp theo nhóm cơ">
            <SimpleBarChart
              horizontal
              height={340}
              data={MUSCLE_GROUPS.map((m) => ({ label: MUSCLE_LABELS[m], value: Math.round(muscle[m] * 10) / 10 }))}
              series={{ key: 'value', name: 'Số hiệp', unit: 'hiệp' }}
            />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-5">
              {MUSCLE_GROUPS.map((m) => (
                <span key={m}>
                  {MUSCLE_LABELS[m]}: <span className="text-text tabular">{fmt1(muscle[m] / nWeeks)}</span>/tuần
                </span>
              ))}
            </div>
            <Explain>
              <p>Nhóm cơ chính của bài: +1 hiệp mỗi hiệp làm việc. Mỗi nhóm cơ phụ: +{fmt1(settings.secondaryMuscleFactor)} (chỉnh trong Cài đặt). Hiệp khởi động và hiệp chưa ✓ không được tính.</p>
              <p>
                Trung bình/tuần = tổng ÷ {nWeeks} tuần, tính từ tuần có buổi tập đầu tiên trong kỳ (tuần chưa có dữ liệu không bị tính vào). Nghiên cứu cho thấy khối lượng tập theo tuần có quan hệ liều–đáp ứng với mức tăng cơ (Schoenfeld et al., 2017), nhưng con số phù hợp tùy từng người. Ứng dụng chỉ hiển thị, không chấm đúng/sai.
              </p>
            </Explain>
          </Card>

          <Card title={`Tổng khối lượng tập mỗi tuần (${u.unit})`}>
            <SimpleBarChart
              data={fullWeeks.map((w) => ({ label: formatShort(w.weekStart), value: u.show(w.volumeKg), deload: w.deloadSessions }))}
              highlight={(d) => !d.deload}
              series={{ key: 'value', name: 'Khối lượng', unit: u.unit }}
              height={180}
            />
            <Explain>
              <p>Khối lượng = Σ (mức tạ × số lần) của mọi hiệp làm việc. Bài trọng lượng cơ thể ghi mức tạ 0 không được cộng; nếu đeo thêm tạ thì chỉ cộng phần tạ thêm.</p>
              <p>Khối lượng phụ thuộc lựa chọn bài tập, nên so sánh giữa các tuần chỉ có ý nghĩa khi giáo án tương tự.</p>
            </Explain>
          </Card>

          <StagnantCard ids={trainedIds} sessions={completed} formula={settings.oneRmFormula} names={(id) => exMap.get(id)?.nameVi ?? id} />

          <Card title="Tiến bộ sức mạnh theo bài tập">
            <select aria-label="Chọn bài tập" className="mb-3 w-full" value={selected} onChange={(e) => setExId(e.target.value)}>
              {trainedIds.map((id) => (
                <option key={id} value={id}>
                  {exMap.get(id)?.nameVi ?? id}
                </option>
              ))}
            </select>
            {series.length === 0 ? (
              <Insufficient>Chưa có dữ liệu.</Insufficient>
            ) : (
              <>
                <TrendLineChart
                  data={series.map((p) => ({ label: formatShort(p.date), e1rm: p.e1rm == null ? null : u.show(p.e1rm), max: u.show(p.maxWeight) }))}
                  series={[
                    { key: 'e1rm', name: 'e1RM ước tính', unit: u.unit },
                    { key: 'max', name: 'Mức tạ cao nhất', unit: u.unit },
                  ]}
                />
                <div className="mt-2 text-sm">
                  {withE.length >= THRESHOLDS.minSessionsForStrengthTrend ? (
                    <span>
                      e1RM: {u.fmt(withE[0]!.e1rm ?? 0)} → <strong>{u.fmtU(withE[withE.length - 1]!.e1rm ?? 0)}</strong>{' '}
                      <span className="text-muted">
                        ({signed(u.show((withE[withE.length - 1]!.e1rm ?? 0) - (withE[0]!.e1rm ?? 0)))} {u.unit} qua {withE.length} buổi)
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">
                      {withE.length === 0
                        ? `Bài này chưa có hiệp nào ≤ ${THRESHOLDS.maxRepsFor1RM} lần nên chưa ước tính được e1RM; biểu đồ chỉ hiện mức tạ cao nhất.`
                        : `Cần ít nhất ${THRESHOLDS.minSessionsForStrengthTrend} buổi có hiệp ≤ ${THRESHOLDS.maxRepsFor1RM} lần để đánh giá xu hướng (hiện ${withE.length}).`}
                    </span>
                  )}
                </div>
              </>
            )}
            <Explain>
              <p>
                <strong>e1RM</strong> (1RM ước tính) — mức tạ tối đa ước tính cho 1 lần, lấy giá trị cao nhất trong buổi. Công thức đang dùng: {FORMULA_LABEL[settings.oneRmFormula]}
                {settings.oneRmFormula === 'epley' ? ' (Epley, 1985)' : ' (Brzycki, 1993)'}. Chỉ tính với hiệp 1–{THRESHOLDS.maxRepsFor1RM} lần vì sai số tăng khi số lần lặp cao.
              </p>
              <p>e1RM là ước tính, không phải kết quả kiểm tra thực tế. Không cần và không nên thử 1RM thật khi mới tập.</p>
            </Explain>
          </Card>

          <Card title="Kỷ lục cá nhân (Personal Records)">
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm tabular">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-1 py-1 text-left font-normal">Bài tập</th>
                    <th className="px-1 text-right font-normal">Tạ cao nhất</th>
                    <th className="px-1 text-right font-normal">e1RM tốt nhất</th>
                    <th className="px-1 text-right font-normal">Hiệp</th>
                  </tr>
                </thead>
                <tbody>
                  {trainedIds.map((id) => {
                    const r = records.get(id)!;
                    return (
                      <tr key={id} className="border-t border-line/50">
                        <td className="px-1 py-1.5">
                          <Link to={`/thu-vien/${id}`} className="hover:text-accent">
                            {exMap.get(id)?.nameVi ?? id}
                          </Link>
                        </td>
                        <td className="px-1 text-right">
                          {r.heaviest ? (
                            <span title={formatDate(r.heaviest.date)}>
                              <Trophy size={12} className="mr-1 inline text-brand2-text" />
                              {u.fmt(r.heaviest.weightKg)}×{r.heaviest.reps}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-1 text-right">{r.bestE1RM ? u.fmt(r.bestE1RM.value) : '—'}</td>
                        <td className="px-1 text-right text-muted">{r.totalSets}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Explain>
              <p>Tạ cao nhất: hiệp làm việc nặng nhất (cùng mức tạ thì lấy hiệp nhiều lần hơn). Tính trên toàn bộ lịch sử, không theo kỳ đã chọn.</p>
              <p>Lần tập đầu tiên của một bài là mốc khởi điểm, không tính là "kỷ lục mới" trong dòng thời gian.</p>
            </Explain>
          </Card>
        </>
      )}

      <BodyTrendCard metrics={data.metrics} field="weightKg" from={period === 'all' ? null : from} />
      <BodyTrendCard metrics={data.metrics} field="waistCm" from={period === 'all' ? null : from} />
      <p className="text-xs text-muted">
        Nguồn: Epley (1985); Brzycki (1993); Schoenfeld, Ogborn & Krieger (2017). Danh mục tài liệu đầy đủ trong Cài đặt → Nguồn tham khảo.
      </p>
    </div>
  );
}

/** "Bài đang chững": tối đa 5 bài có 4 buổi gần nhất không vượt mốc cũ (không tính khi có buổi deload xen giữa). */
function StagnantCard({ ids, sessions, formula, names }: { ids: string[]; sessions: WorkoutSession[]; formula: OneRmFormula; names: (id: string) => string }) {
  const list = useMemo(() => ids.filter((id) => stagnation(sessions, id, formula).stagnant).slice(0, 5), [ids, sessions, formula]);
  return (
    <Card title="Bài đang chững">
      {list.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bài nào chững 4 buổi liền. 👍</p>
      ) : (
        <ul className="space-y-1 text-sm" data-testid="stagnant-list">
          {list.map((id) => (
            <li key={id}>
              <Link to={`/thu-vien/${id}`} className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-1 hover:bg-surface2">
                <span>{names(id)}</span>
                <span className="text-xs text-warn">4 buổi chưa tiến bộ</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Explain>
        <p>Xét 4 buổi gần nhất có bài: nếu e1RM tốt nhất của 3 buổi mới nhất không vượt mức tốt nhất từ buổi thứ 4 trở về trước, và không có buổi deload xen giữa, bài được coi là chững. Gợi ý: giảm tạ 10% hoặc nghỉ thêm. Ứng dụng không tự đổi gì.</p>
      </Explain>
    </Card>
  );
}

function BodyTrendCard({ metrics, field, from }: { metrics: BodyMetric[]; field: BodyField; from: string | null }) {
  const u = useUnits();
  const isW = field === 'weightKg';
  const unit = isW ? u.unit : 'cm';
  // Cân nặng hiển thị theo đơn vị đã chọn (kg/lb); số đo vòng luôn cm.
  const pts = seriesOf(metrics, field)
    .filter((p) => !from || p.date >= from)
    .map((p) => (isW ? { ...p, value: u.show(p.value) } : p));
  const weekly = aggregate(pts, 'week');
  const tr = linearTrend(pts);
  return (
    <Card title={`Tiến độ ${BODY_FIELD_LABELS[field].toLowerCase()}`}>
      {pts.length === 0 ? (
        <Insufficient>Chưa có dữ liệu. Ghi số đo trong mục Tiến độ cơ thể.</Insufficient>
      ) : (
        <>
          <TrendLineChart data={weekly.map((w) => ({ label: formatShort(w.key), value: w.value }))} series={[{ key: 'value', name: `TB tuần`, unit }]} height={180} />
          <div className="mt-2 text-sm">
            {tr.status === 'ok' ? (
              <span>
                Xu hướng <strong className="tabular">{signed(tr.slopePerWeek, 2)} {unit}/tuần</strong>
                <span className="text-muted"> · từ {fmt1(tr.first.value)} đến {fmt1(tr.last.value)} {unit} ({tr.spanDays} ngày)</span>
              </span>
            ) : (
              <span className="text-muted">{tr.reason}</span>
            )}
          </div>
        </>
      )}
      <Explain>
        <p>Biểu đồ: trung bình theo tuần (Thứ Hai–CN). Xu hướng: hồi quy tuyến tính trên từng lần đo, quy đổi ra đơn vị/tuần.</p>
        <p>
          Chỉ đưa ra xu hướng khi có ≥ {THRESHOLDS.minTrendPoints} lần đo trải dài ≥ {THRESHOLDS.minTrendSpanDays} ngày. Cân nặng có thể dao động 1–2 kg/ngày do nước và thức ăn, nên một lần đo đơn lẻ không phản ánh tiến độ.
        </p>
        {field === 'waistCm' && <p>Vòng eo kết hợp với cân nặng giúp bạn tự theo dõi thay đổi hình thể. Ứng dụng không suy đoán tỷ lệ mỡ.</p>}
      </Explain>
    </Card>
  );
}
