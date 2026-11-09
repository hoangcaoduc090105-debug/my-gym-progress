import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { confirmLeave, hasLeaveGuard } from '../lib/leaveGuard';
import { BarChart3, BookOpen, CircleHelp, Dumbbell, Grid2x2, Home, Ruler, Settings, Utensils, Play } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cx } from '../components/ui';
import { RestTimerBar } from '../features/workout/RestTimer';
import { db } from '../db/db';

/** Điều hướng chính: 4 mục dùng hằng ngày + "Thêm" chứa các mục ít dùng. */
export const NAV = [
  { to: '/', label: 'Hôm nay', short: 'Hôm nay', icon: Home, end: true },
  { to: '/lich-tap', label: 'Tập', short: 'Tập', icon: Dumbbell },
  { to: '/co-the', label: 'Cơ thể', short: 'Cơ thể', icon: Ruler },
  { to: '/dinh-duong', label: 'Ăn uống', short: 'Ăn uống', icon: Utensils },
] as const;

export const MORE = [
  { to: '/thu-vien', label: 'Thư viện bài tập', desc: 'Cách tập đúng từng động tác, bản đồ cơ', icon: BookOpen },
  { to: '/phan-tich', label: 'Phân tích', desc: 'Biểu đồ sức mạnh, kỷ lục, số hiệp theo nhóm cơ', icon: BarChart3 },
  { to: '/huong-dan', label: 'Hướng dẫn', desc: 'Cách dùng app và nguyên tắc tập cho người mới', icon: CircleHelp },
  { to: '/cai-dat', label: 'Cài đặt', desc: 'Hồ sơ, mục tiêu, giao diện, sao lưu dữ liệu', icon: Settings },
] as const;
const MORE_PATHS = ['/them', ...MORE.map((m) => m.to)];

function ActiveWorkoutBanner() {
  const loc = useLocation();
  const draft = useLiveQuery(() => db.sessions.where('status').equals('draft').filter((s) => !s.deletedAt).first(), []);
  // Trang Hôm nay đã có thẻ "Đang tập dở" nên không hiện banner trùng.
  if (!draft || loc.pathname === '/' || loc.pathname.startsWith('/tap/')) return null;
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
  const loc = useLocation();
  const nav = useNavigate();
  // Link nội bộ khi trang đang có thay đổi chưa lưu: hỏi trước, đồng ý mới chuyển.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!hasLeaveGuard() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest('a[href]');
    const href = a?.getAttribute('href');
    if (!a || !href?.startsWith('#/') || a.getAttribute('target') === '_blank') return;
    e.preventDefault();
    e.stopPropagation();
    void confirmLeave().then((ok) => ok && nav(href.slice(1)));
  };
  return (
    <div className="min-h-dvh md:flex" onClickCapture={onClickCapture}>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="icons/favicon.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
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
          <div className="mb-1 mt-5 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Khác</div>
          {MORE.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-safe backdrop-blur md:hidden"
      >
        {NAV.map(({ to, short, icon: Icon, ...r }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in r}
            className={({ isActive }) => cx('flex h-16 min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none', isActive ? 'text-accent' : 'text-muted')}
          >
            <Icon size={22} />
            <span className="whitespace-nowrap">{short}</span>
          </NavLink>
        ))}
        <NavLink
          to="/them"
          className={() =>
            cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none', MORE_PATHS.some((p) => loc.pathname.startsWith(p)) ? 'text-accent' : 'text-muted')
          }
        >
          <Grid2x2 size={22} />
          <span>Thêm</span>
        </NavLink>
      </nav>
    </div>
  );
}
