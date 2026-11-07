import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { RestTimerBar, RestTimerProvider, timerSound, useRestTimerActions, type TimerActions } from '../../src/features/workout/RestTimer';

let renders = 0;
let actions: TimerActions | null = null;
function Child() {
  const a = useRestTimerActions();
  renders++;
  useEffect(() => {
    actions = a;
  }, [a]);
  return null;
}

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    renders = 0;
    actions = null;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('component chỉ dùng actions KHÔNG render lại khi đồng hồ đang chạy', () => {
    render(
      <RestTimerProvider sound={false} vibrate={false}>
        <Child />
        <RestTimerBar />
      </RestTimerProvider>,
    );
    const before = renders;
    act(() => actions!.start(3, 'x'));
    act(() => vi.advanceTimersByTime(1000));
    expect(renders).toBe(before);
  });

  it('RestTimerBar hiển thị đếm ngược', () => {
    render(
      <RestTimerProvider sound={false} vibrate={false}>
        <Child />
        <RestTimerBar />
      </RestTimerProvider>,
    );
    act(() => actions!.start(3, 'Squat'));
    expect(screen.getByTestId('rest-remaining')).toHaveTextContent('0:03');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('rest-remaining')).toHaveTextContent('0:02');
    expect(screen.getByText('Nghỉ · Squat')).toBeInTheDocument();
  });

  it('hết giờ gọi beep đúng 1 lần (AudioContext tạo trong start)', () => {
    const fakeCtx = { resume: vi.fn() } as unknown as AudioContext;
    const create = vi.spyOn(timerSound, 'createContext').mockReturnValue(fakeCtx);
    const beep = vi.spyOn(timerSound, 'beep').mockImplementation(() => undefined);
    render(
      <RestTimerProvider sound={true} vibrate={false}>
        <Child />
        <RestTimerBar />
      </RestTimerProvider>,
    );
    act(() => actions!.start(3, 'x'));
    expect(create).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2900));
    expect(beep).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(beep).toHaveBeenCalledTimes(1);
    expect(beep).toHaveBeenCalledWith(fakeCtx);
    expect(screen.getByTestId('rest-remaining')).toHaveTextContent('Hết giờ nghỉ!');
    act(() => vi.advanceTimersByTime(5000));
    expect(beep).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('timer')).toBeNull();
  });
});
