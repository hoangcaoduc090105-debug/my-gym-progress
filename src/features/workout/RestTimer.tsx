import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, SkipForward, Timer } from 'lucide-react';
import { formatClock } from '../../lib/date';
import { IconButton } from '../../components/ui';

/** Đồng hồ nghỉ dựa trên mốc thời gian kết thúc (endAt) => chính xác cả khi khóa màn hình, giữ qua tải lại trang. */
interface TimerState {
  endAt: number;
  totalSec: number;
  label: string;
}
interface Ctx {
  state: TimerState | null;
  remaining: number;
  start: (sec: number, label: string) => void;
  adjust: (delta: number) => void;
  stop: () => void;
}
const C = createContext<Ctx | null>(null);
const KEY = 'mgp.restTimer';

function load(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    return s.endAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}
function persist(s: TimerState | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* bộ nhớ tạm không khả dụng — đồng hồ vẫn chạy trong phiên */
  }
}

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* bỏ qua */
  }
}

export function RestTimerProvider({ children, sound, vibrate }: { children: ReactNode; sound: boolean; vibrate: boolean }) {
  const [state, setState] = useState<TimerState | null>(load);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [state]);

  const remaining = state ? Math.max(0, (state.endAt - now) / 1000) : 0;

  useEffect(() => {
    if (state && remaining <= 0 && !fired.current) {
      fired.current = true;
      if (sound) beep();
      if (vibrate && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
      const t = setTimeout(() => {
        setState(null);
        persist(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [remaining, state, sound, vibrate]);

  const start = useCallback((sec: number, label: string) => {
    fired.current = false;
    const s = { endAt: Date.now() + sec * 1000, totalSec: sec, label };
    setNow(Date.now());
    setState(s);
    persist(s);
  }, []);
  const adjust = useCallback((delta: number) => {
    setState((s) => {
      if (!s) return s;
      const n = { ...s, endAt: Math.max(Date.now() + 1000, s.endAt + delta * 1000), totalSec: Math.max(1, s.totalSec + delta) };
      fired.current = false;
      persist(n);
      return n;
    });
  }, []);
  const stop = useCallback(() => {
    setState(null);
    persist(null);
  }, []);

  return <C.Provider value={{ state, remaining, start, adjust, stop }}>{children}</C.Provider>;
}

export function useRestTimer(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useRestTimer ngoài RestTimerProvider');
  return c;
}

export function RestTimerBar() {
  const { state, remaining, adjust, stop } = useRestTimer();
  if (!state) return null;
  const done = remaining <= 0;
  const pct = Math.min(100, (1 - remaining / state.totalSec) * 100);
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 px-3 pb-2 md:bottom-4 md:left-64" role="timer" aria-live="off">
      <div className={`mx-auto max-w-xl overflow-hidden rounded-2xl border shadow-2xl ${done ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2'}`}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Timer size={20} className={done ? '' : 'text-accent'} />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold leading-none tabular">{done ? 'Hết giờ nghỉ!' : formatClock(remaining)}</div>
            <div className={`truncate text-xs ${done ? '' : 'text-muted'}`}>Nghỉ · {state.label}</div>
          </div>
          {!done && (
            <>
              <IconButton label="Bớt 15 giây" onClick={() => adjust(-15)}>
                <Minus size={18} />
              </IconButton>
              <IconButton label="Thêm 15 giây" onClick={() => adjust(15)}>
                <Plus size={18} />
              </IconButton>
            </>
          )}
          <IconButton label="Bỏ qua" onClick={stop}>
            <SkipForward size={18} />
          </IconButton>
        </div>
        {!done && (
          <div className="h-1 bg-line">
            <div className="h-1 bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
