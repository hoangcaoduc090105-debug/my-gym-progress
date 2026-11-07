import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { db } from '../../db/db';
import { Card, PageHeader, Tabs } from '../../components/ui';
import { APP_GUIDE, GUIDE_REFERENCES, TRAINING_RULES } from './guideContent';

type Tab = 'app' | 'train' | 'moves';

export function GuidePage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'app';
  return (
    <div>
      <PageHeader title="Hướng dẫn" subtitle="Cách dùng app và cách tập đúng cho người mới" back={true} />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'app', label: 'Dùng ứng dụng' },
          { value: 'train', label: 'Tập đúng cách' },
          { value: 'moves', label: 'Từng động tác' },
        ]}
      />
      {tab === 'app' && <AppGuide />}
      {tab === 'train' && <TrainGuide />}
      {tab === 'moves' && <MovesGuide />}
    </div>
  );
}

function Numbered({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">{n}</div>
        <div className="min-w-0 flex-1">
          <h2 className="mb-1.5 font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </Card>
  );
}

function AppGuide() {
  return (
    <div className="space-y-3">
      {APP_GUIDE.map((s, i) => (
        <Numbered key={s.title} n={i + 1} title={s.title}>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed">
            {s.body.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Numbered>
      ))}
    </div>
  );
}

function TrainGuide() {
  return (
    <div className="space-y-3">
      {TRAINING_RULES.map((r, i) => (
        <Numbered key={r.title} n={i + 1} title={r.title}>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed">
            {r.body.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {r.cite && <p className="mt-2 text-xs italic text-muted">{r.cite}</p>}
        </Numbered>
      ))}
      <Card title="Tài liệu tham khảo">
        <ol className="space-y-2 text-xs leading-relaxed text-muted">
          {GUIDE_REFERENCES.map((r) => (
            <li key={r} className="break-words pl-4 -indent-4">
              {r}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Nội dung mang tính tham khảo cho người khỏe mạnh, không thay thế tư vấn y tế hay huấn luyện viên trực tiếp.</p>
      </Card>
    </div>
  );
}

function MovesGuide() {
  const data = useLiveQuery(async () => {
    const programs = await db.programs.toArray();
    const active = programs.find((p) => p.isActive) ?? programs[0];
    const ex = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    return { active, ex };
  }, []);
  if (!data) return null;
  const { active, ex } = data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Hướng dẫn kỹ thuật chi tiết từng động tác trong giáo án đang dùng. Khi đang tập, bấm biểu tượng 📖 cạnh tên bài để xem nhanh.
      </p>
      {active?.days.map((d) => (
        <Card key={d.id} title={d.name}>
          <ul className="-mx-2">
            {d.exercises.map((pe) => {
              const e = ex.get(pe.exerciseId);
              if (!e) return null;
              return (
                <li key={pe.id}>
                  <Link to={`/thu-vien/${e.id}`} className="flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{e.nameVi}</div>
                      <div className="truncate text-xs text-muted">{e.feel ?? e.nameEn}</div>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      <Link to="/thu-vien" className="block text-center text-sm text-info">
        Xem toàn bộ thư viện {ex.size} bài tập →
      </Link>
    </div>
  );
}
