import { Link } from 'react-router-dom';
import { AlertTriangle, Lightbulb, Target, Wind } from 'lucide-react';
import { MUSCLE_LABELS, type Exercise } from '../../db/types';
import { GENERIC_BREATHING } from '../../data/exerciseGuides';

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Hướng dẫn kỹ thuật đầy đủ của một bài — dùng ở trang bài tập và trong lúc đang tập. */
export function ExerciseTechnique({ ex, compact }: { ex: Exercise; compact?: boolean }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {ex.setup && ex.setup.length > 0 && (
        <Section title="1. Chuẩn bị tư thế">
          <ul className="list-disc space-y-1 pl-5">
            {ex.setup.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}
      {ex.instructions.length > 0 && (
        <Section title={ex.setup?.length ? '2. Thực hiện' : 'Thực hiện'}>
          <ol className="list-decimal space-y-1 pl-5">
            {ex.instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Section>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-info/10 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-info">
            <Wind size={14} /> Hít thở
          </div>
          <p>{ex.breathing ?? GENERIC_BREATHING}</p>
        </div>
        <div className="rounded-xl bg-accent/10 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Target size={14} /> Cảm nhận cơ ở đâu
          </div>
          <p>{ex.feel ?? `${MUSCLE_LABELS[ex.primaryMuscle]} là chính${ex.secondaryMuscles.length ? `; ${ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')} hỗ trợ` : ''}.`}</p>
        </div>
      </div>
      {ex.tips && ex.tips.length > 0 && (
        <Section title="Mẹo cho người mới" icon={<Lightbulb size={16} className="text-warn" />}>
          <ul className="list-disc space-y-1 pl-5">
            {ex.tips.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}
      {ex.commonMistakes.length > 0 && (
        <Section title="Lỗi thường gặp — tránh" icon={<AlertTriangle size={16} className="text-danger" />}>
          <ul className="space-y-1">
            {ex.commonMistakes.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-danger">✕</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {!compact && (
        <p className="rounded-xl border border-line p-3 text-xs text-muted">
          Chọn mức tạ: dùng mức bạn làm đủ số lần mục tiêu mà vẫn còn khoảng 2–3 lần dự trữ, kỹ thuật không bị biến dạng. Xem thêm{' '}
          <Link to="/huong-dan?tab=train" className="font-medium text-info underline">
            Nguyên tắc tập cho người mới
          </Link>
          .
        </p>
      )}
    </div>
  );
}
