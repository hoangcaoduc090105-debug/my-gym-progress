import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, SkipForward, Timer } from 'lucide-react';
import { formatClock } from '../../lib/date';
import { IconButton } from '../../components/ui';

/**
 * Đồng hồ nghỉ dựa trên mốc kết thúc (endAt) => chính xác cả khi khóa màn hình, giữ qua tải lại trang.
 *
 * Tách 2 context để KHÔNG render lại cả app mỗi giây:
 * - TimerActionsContext: start/adjust/stop — ổn định suốt vòng đời Provider.
 * - TimerStateContext: { endAt, totalSec, label } — chỉ đổi khi bắt đầu/chỉnh/dừng.
 * Số giây còn lại không nằm trong context nào: RestTimerBar tự đếm từ endAt.
 */
export interface TimerState {
  endAt: number;
  totalSec: number;
  label: string;
}
export interface TimerActions {
  start: (sec: number, label: string) => void;
  adjust: (delta: number) => void;
  stop: () => void;
}

const TimerActionsContext = createContext<TimerActions | null>(null);
const TimerStateContext = createContext<TimerState | null>(null);
const KEY = 'mgp.restTimer';
/** Thời gian giữ thông báo "Hết giờ nghỉ!" trước khi tự ẩn. */
export const DONE_HOLD_MS = 4000;

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

type AC = AudioContext;
/**
 * Âm báo. Đặt trong object để test có thể thay thế (vi.spyOn(timerSound, 'beep')).
 * AudioContext được tạo trong cử chỉ người dùng (start) nên iOS Safari cho phát tiếng.
 */
export const timerSound = {
  createContext(): AC | null {
    const Ctor = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
    return Ctor ? new Ctor() : null;
  },
  beep(ctx: AC | null): void {
    if (!ctx) return;
    try {
      void ctx.resume?.();
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
    } catch {
      /* bỏ qua */
    }
  },
};

export function RestTimerProvider({ children, sound, vibrate }: { children: ReactNode; sound: boolean; vibrate: boolean }) {
  const [state, setState] = useState<TimerState | null>(load);
  const audio = useRef<AC | null>(null);
  const fired = useRef(false);
  const opts = useRef({ sound, vibrate });
  opts.current = { sound, vibrate };

  const actions = useMemo<TimerActions>(
    () => ({
      start(sec, label) {
        // Đang ở trong cử chỉ bấm => tạo/mở khóa AudioContext một lần, dùng lại khi hết giờ.
        try {
          if (!audio.current) audio.current = timerSound.createContext();
          void audio.current?.resume?.();
        } catch {
          audio.current = null;
        }
        fired.current = false;
        const s = { endAt: Date.now() + sec * 1000, totalSec: sec, label };
        setState(s);
        persist(s);
      },
      adjust(delta) {
        setState((s) => {
          if (!s) return s;
          const n = { ...s, endAt: Math.max(Date.now() + 1000, s.endAt + delta * 1000), totalSec: Math.max(1, s.totalSec + delta) };
          fired.current = false;
          persist(n);
          return n;
        });
      },
      stop() {
        setState(null);
        persist(null);
      },
    }),
    [],
  );

  // Hết giờ: setTimeout tới đúng endAt (không phụ thuộc interval vẽ); quay lại tab => tính lại ngay.
  useEffect(() => {
    if (!state) return;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let end: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      if (opts.current.sound) timerSound.beep(audio.current);
      if (opts.current.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
      hold = setTimeout(() => actions.stop(), DONE_HOLD_MS);
    };
    const schedule = () => {
      if (end) clearTimeout(end);
      const ms = state.endAt - Date.now();
      if (ms <= 0) fire();
      else end = setTimeout(fire, ms);
    };
    schedule();
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (end) clearTimeout(end);
      if (hold) clearTimeout(hold);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state, actions]);

  return (
    <TimerActionsContext.Provider value={actions}>
      <TimerStateContext.Provider value={state}>{children}</TimerStateContext.Provider>
    </TimerActionsContext.Provider>
  );
}

export function useRestTimerActions(): TimerActions {
  const c = useContext(TimerActionsContext);
  if (!c) throw new Error('useRestTimerActions ngoài RestTimerProvider');
  return c;
}

export function useRestTimerState(): TimerState | null {
  return useContext(TimerStateContext);
}

/** Thanh đếm ngược — tự vẽ lại 4 lần/giây; chỉ thanh này render lại, không phải cả app. */
export function RestTimerBar() {
  const state = useRestTimerState();
  const { adjust, stop } = useRestTimerActions();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    const onVis = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state]);
  if (!state) return null;
  const remaining = Math.max(0, (state.endAt - now) / 1000);
  const done = remaining <= 0;
  const pct = Math.min(100, (1 - remaining / state.totalSec) * 100);
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 px-3 pb-2 md:bottom-4 md:left-64" role="timer" aria-live="off">
      <div className={`mx-auto max-w-xl overflow-hidden rounded-2xl border shadow-2xl ${done ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2'}`}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Timer size={20} className={done ? '' : 'text-accent'} />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold leading-none tabular" data-testid="rest-remaining">
              {done ? 'Hết giờ nghỉ!' : formatClock(remaining)}
            </div>
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
