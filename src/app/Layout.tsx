import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, Dumbbell, LayoutDashboard, Ruler, Settings, Utensils, Play } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cx } from '../components/ui';
import { RestTimerBar } from '../features/workout/RestTimer';
import { db } from '../db/db';

export const NAV = [
  { to: '/', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/lich-tap', label: 'Lịch tập', short: 'Lịch tập', icon: CalendarDays },
  { to: '/thu-vien', label: 'Thư viện bài tập', short: 'Thư viện', icon: BookOpen },
  { to: '/co-the', label: 'Tiến độ cơ thể', short: 'Cơ thể', icon: Ruler },
  { to: '/dinh-duong', label: 'Dinh dưỡng', short: 'Dinh dưỡng', icon: Utensils },
  { to: '/phan-tich', label: 'Phân tích', short: 'Phân tích', icon: BarChart3 },
  { to: '/cai-dat', label: 'Cài đặt', short: 'Cài đặt', icon: Settings },
] as const;

function ActiveWorkoutBanner() {
  const loc = useLocation();
  const draft = useLiveQuery(() => db.sessions.where('status').equals('draft').filter((s) => !s.deletedAt).first(), []);
  if (!draft || loc.pathname.startsWith('/tap/')) return null;
  return (
    <Link
      to={`/tap/${draft.id}`}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-3 text-sm"
    >
      <Play size={18} className="text-accent" />
      <span className="flex-1">
        <span className="font-semibold">Buổi tập đang diễn ra</span>
        <span className="block text-muted">{draft.dayName}</span>
      </span>
      <span className="font-semibold text-accent">Tiếp tục</span>
    </Link>
  );
}

export function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <Dumbbell size={20} />
          </div>
          <div>
            <div className="font-bold leading-tight">My Gym Progress</div>
            <div className="text-xs text-muted">Lưu trên thiết bị · Offline</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Điều hướng chính">
          {NAV.map(({ to, label, icon: Icon, ...r }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in r}
              className={({ isActive }) =>
                cx('flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium', isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface2 hover:text-text')
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] md:pb-12 md:pt-8">
        <ActiveWorkoutBanner />
        <Outlet />
      </main>

      <RestTimerBar />

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-line bg-bg/95 pb-safe backdrop-blur md:hidden"
      >
        {NAV.map(({ to, short, icon: Icon, ...r }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in r}
            className={({ isActive }) => cx('flex h-16 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden text-[10px] font-medium leading-none tracking-tighter', isActive ? 'text-accent' : 'text-muted')}
          >
            <Icon size={21} />
            <span className="whitespace-nowrap">{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
