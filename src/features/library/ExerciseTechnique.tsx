import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, Lightbulb, Target, Wind } from 'lucide-react';
import { MUSCLE_LABELS, type Exercise } from '../../db/types';
import { GENERIC_BREATHING } from '../../data/genericBreathing';
import { MuscleMap } from '../../components/MuscleMap';
import { cx } from '../../components/ui';

/** Link tìm video trên YouTube — chỉ mở khi người dùng bấm; app không nhúng hay tải gì từ YouTube. */
export function youtubeSearchUrl(ex: Exercise): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.nameEn || ex.nameVi} proper form`)}`;
}

/**
 * Hướng dẫn kỹ thuật dạng đơn giản: bản đồ cơ → làm nhanh 3 bước → 3 lỗi cần tránh → video.
 * Chi tiết đầy đủ (chuẩn bị, hít thở, cảm nhận cơ, mẹo) nằm trong phần mở rộng.
 */
export function ExerciseTechnique({ ex, compact }: { ex: Exercise; compact?: boolean }) {
  const [more, setMore] = useState(false);
  const quick = ex.instructions.slice(0, 3);
  const mistakes = ex.commonMistakes.slice(0, 3);
  const feel =
    ex.feel ??
    `${MUSCLE_LABELS[ex.primaryMuscle]} là chính${ex.secondaryMuscles.length ? `; ${ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')} hỗ trợ` : ''}.`;

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <MuscleMap primary={ex.primaryMuscle} secondary={ex.secondaryMuscles} />

      <div className="flex gap-2 rounded-xl bg-accent/10 p-3">
        <Target size={18} className="mt-0.5 shrink-0 text-accent" />
        <p>
          <strong>Cảm nhận đúng cơ:</strong> {feel}
        </p>
      </div>

      {quick.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Làm nhanh {quick.length} bước</h3>
          <ol className="space-y-2">
            {quick.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {mistakes.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Tránh {mistakes.length} lỗi này</h3>
          <ul className="space-y-1.5">
            {mistakes.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-danger">✕</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <a
        href={youtubeSearchUrl(ex)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface font-medium hover:bg-surface2"
      >
        <ExternalLink size={16} /> Xem video mẫu trên YouTube
      </a>
      <p className="-mt-2 text-center text-[11px] text-muted">Mở YouTube ở tab mới (cần mạng). App chỉ gửi tên bài tập để tìm kiếm, không gửi dữ liệu của bạn.</p>

      <div className="rounded-xl border border-line">
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex h-11 w-full items-center justify-between px-3 font-medium">
          Hướng dẫn chi tiết
          <ChevronDown size={18} className={cx('transition-transform', more && 'rotate-180')} />
        </button>
        {more && (
          <div className="space-y-4 border-t border-line p-3">
            {ex.setup && ex.setup.length > 0 && (
              <section>
                <h4 className="mb-1 font-semibold">Chuẩn bị tư thế</h4>
                <ul className="list-disc space-y-1 pl-5">
                  {ex.setup.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}
            {ex.instructions.length > 3 && (
              <section>
                <h4 className="mb-1 font-semibold">Toàn bộ các bước</h4>
                <ol className="list-decimal space-y-1 pl-5">
                  {ex.instructions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </section>
            )}
            <div className="flex gap-2 rounded-xl bg-info/10 p-3">
              <Wind size={16} className="mt-0.5 shrink-0 text-info" />
              <p>
                <strong>Hít thở:</strong> {ex.breathing ?? GENERIC_BREATHING}
              </p>
            </div>
            {ex.tips && ex.tips.length > 0 && (
              <section>
                <h4 className="mb-1 flex items-center gap-1.5 font-semibold">
                  <Lightbulb size={16} className="text-warn" /> Mẹo cho người mới
                </h4>
                <ul className="list-disc space-y-1 pl-5">
                  {ex.tips.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}
            {ex.commonMistakes.length > 3 && (
              <section>
                <h4 className="mb-1 font-semibold">Các lỗi khác</h4>
                <ul className="list-disc space-y-1 pl-5">
                  {ex.commonMistakes.slice(3).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}
            {!compact && (
              <p className="text-xs text-muted">
                Chọn mức tạ: làm đủ số lần mục tiêu mà còn dư khoảng 2–3 lần, kỹ thuật không biến dạng.{' '}
                <Link to="/huong-dan?tab=train" className="text-info underline">
                  Nguyên tắc cho người mới
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
