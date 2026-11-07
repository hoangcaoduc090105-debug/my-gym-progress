import { db } from '../../src/db/db';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as repo from '../../src/db/repo';
import { FeedbackProvider } from '../../src/components/feedback';
import { RestTimerProvider } from '../../src/features/workout/RestTimer';
import { SessionLogger } from '../../src/features/workout/SessionLogger';
import { resetDb } from '../integration/helpers';

// Test giao diện nặng (render cả trang + IndexedDB giả): runner CI chậm hơn máy dev ~3 lần — nới THỜI GIAN CHỜ, không nới điều kiện.
vi.setConfig({ testTimeout: 20_000 });
/** Hộp thoại tải lười (import động) + truy vấn IndexedDB: runner CI có thể quá 1 s mặc định của findBy*. */
const LAZY_WAIT = 8000;

vi.mock('../../src/db/repo', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/db/repo')>();
  return { ...m, saveSession: vi.fn(m.saveSession) };
});
const saveSpy = vi.mocked(repo.saveSession);
const timerStart = vi.hoisted(() => vi.fn());
vi.mock('../../src/features/workout/RestTimer', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/features/workout/RestTimer')>();
  return {
    ...m,
    useRestTimerActions: () => {
      const a = m.useRestTimerActions();
      return {
        ...a,
        start: (sec: number, label: string) => {
          timerStart(sec, label);
          a.start(sec, label);
        },
      };
    },
  };
});
const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
/** Test trước unmount => useSessionWriter ghi nốt (bất đồng bộ). Chờ xong rồi mới reset để không sinh buổi dở "ma". */
const settleThenReset = async () => {
  await sleep(300);
  await resetDb();
};

async function renderLogger() {
  await settleThenReset();
  const p = (await repo.getActiveProgram())!;
  const s = await repo.startSession({ programId: p.id, programDayId: 'day-a' });
  render(
    <FeedbackProvider>
      <RestTimerProvider sound={false} vibrate={false}>
        <MemoryRouter initialEntries={[`/tap/${s.id}`]}>
          <Routes>
            <Route path="/tap/:id" element={<SessionLogger />} />
          </Routes>
        </MemoryRouter>
      </RestTimerProvider>
    </FeedbackProvider>,
  );
  await screen.findByRole('heading', { name: 'Đang tập' });
  await screen.findAllByLabelText('Mức tạ hiệp 1');
  saveSpy.mockClear();
  return s;
}

describe('SessionLogger — hàng đợi ghi', () => {
  afterEach(() => saveSpy.mockReset());

  it('gõ 10 ký tự vào ghi chú => saveSession được gọi ≤ 2 lần', async () => {
    await renderLogger();
    const notes = screen.getByLabelText('Ghi chú buổi tập');
    const text = 'Ngủ đủ 8h';
    for (let i = 1; i <= 10; i++) fireEvent.change(notes, { target: { value: (text + '!!').slice(0, i) } });
    expect(screen.getByTestId('save-status')).toHaveTextContent('Đang lưu…');
    await sleep(700);
    expect(saveSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(saveSpy.mock.calls.length).toBeLessThanOrEqual(2);
    expect(saveSpy.mock.calls.at(-1)![0].notes).toBe((text + '!!').slice(0, 10));
    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('Đã lưu'));
  });

  it('✓ một hiệp => ghi ngay đúng 1 lần', async () => {
    await renderLogger();
    fireEvent.change(screen.getAllByLabelText('Mức tạ hiệp 1')[0]!, { target: { value: '16' } });
    fireEvent.change(screen.getAllByLabelText('Số lần hiệp 1')[0]!, { target: { value: '12' } });
    await sleep(50);
    saveSpy.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hoàn thành hiệp 1' })[0]!);
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
    expect(saveSpy.mock.calls[0]![0].exercises[0]!.sets[0]).toMatchObject({ weightKg: 16, reps: 12, done: true });
    await sleep(500);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('ghi lỗi => "Lưu thất bại", giữ nội dung; bấm "Thử lại" => ghi lại và "Đã lưu"', async () => {
    await renderLogger();
    saveSpy.mockRejectedValueOnce(new Error('Đĩa đầy'));
    const notes = screen.getByLabelText('Ghi chú buổi tập') as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: 'Tập nặng' } });
    expect(await screen.findByText(/Lưu thất bại/)).toBeInTheDocument();
    expect(notes.value).toBe('Tập nặng');
    const before = saveSpy.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(saveSpy.mock.calls.length).toBe(before + 1));
    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('Đã lưu'));
    expect(saveSpy.mock.calls.at(-1)![0].notes).toBe('Tập nặng');
  });
});

describe('SessionLogger — Thay bài (v1.8.0)', () => {
  afterEach(() => saveSpy.mockReset());

  it('thay bài: target, note giữ nguyên; hiệp chưa làm bị xóa số; hiệp đã làm giữ nguyên và có replacedFrom', async () => {
    const s = await renderLogger();
    const before = (await repo.getActiveProgram())!;
    // Bài đầu (goblet-squat): ✓ hiệp 1, nhập dở hiệp 2, ghi cảm nhận
    fireEvent.change(screen.getAllByLabelText('Mức tạ hiệp 1')[0]!, { target: { value: '16' } });
    fireEvent.change(screen.getAllByLabelText('Số lần hiệp 1')[0]!, { target: { value: '12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Hoàn thành hiệp 1' })[0]!);
    fireEvent.change(screen.getAllByLabelText('Mức tạ hiệp 2')[0]!, { target: { value: '18' } });
    fireEvent.change(screen.getAllByLabelText('Số lần hiệp 2')[0]!, { target: { value: '10' } });
    fireEvent.change(screen.getAllByLabelText('Cảm nhận bài tập')[0]!, { target: { value: 'gối hơi đau' } });
    await sleep(600);
    const orig = (await db.sessions.get(s.id))!.exercises[0]!;

    // v1.9: "Thay bài" nằm trong menu ⋯ của bài
    fireEvent.click(screen.getAllByRole('button', { name: 'Thêm thao tác' })[0]!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Thay bài' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thay bằng Đạp đùi máy' }, { timeout: LAZY_WAIT }));
    // Buổi theo giáo án => hỏi phạm vi; chọn "Chỉ buổi này"
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉ buổi này' }, { timeout: LAZY_WAIT }));
    await waitFor(async () => expect((await db.sessions.get(s.id))!.exercises[0]!.exerciseId).toBe('leg-press'));

    const se = (await db.sessions.get(s.id))!.exercises[0]!;
    expect(se.id).toBe(orig.id);
    expect(se.target).toEqual(orig.target);
    expect(se.note).toBe('gối hơi đau');
    expect(se.replacedFrom).toBe('goblet-squat');
    expect(se.sets).toHaveLength(orig.sets.length);
    expect(se.sets[0]).toMatchObject({ weightKg: 16, reps: 12, done: true, replacedFrom: 'goblet-squat' });
    expect(se.sets[1]).toMatchObject({ weightKg: null, reps: null, rir: null, done: false });
    expect(se.sets[1]!.replacedFrom).toBeUndefined();
    // "Chỉ buổi này" => giáo án không đổi
    expect((await repo.getActiveProgram())!.days).toEqual(before.days);
    expect(await screen.findByRole('link', { name: 'Đạp đùi máy' }, { timeout: LAZY_WAIT })).toBeInTheDocument();
  });
});

describe('SessionLogger — superset (v1.8.0)', () => {
  afterEach(() => saveSpy.mockReset());

  it('✓ bài A1 => KHÔNG bấm giờ nghỉ; ✓ bài A2 => bấm giờ 1 lần với restSec lớn nhất nhóm', async () => {
    await settleThenReset();
    const p = (await repo.getActiveProgram())!;
    const g = structuredClone(p);
    const [e1, e2] = g.days[0]!.exercises;
    Object.assign(e1!, { groupId: 'grp-a', restSec: 90 });
    Object.assign(e2!, { groupId: 'grp-a', restSec: 150 });
    await repo.saveProgram(g);
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a' });
    expect(s.exercises.slice(0, 2).map((x) => x.groupId)).toEqual(['grp-a', 'grp-a']);
    expect(s.exercises[2]!.groupId).toBeUndefined();
    render(
      <FeedbackProvider>
        <RestTimerProvider sound={false} vibrate={false}>
          <MemoryRouter initialEntries={[`/tap/${s.id}`]}>
            <Routes>
              <Route path="/tap/:id" element={<SessionLogger />} />
            </Routes>
          </MemoryRouter>
        </RestTimerProvider>
      </FeedbackProvider>,
    );
    await screen.findByRole('heading', { name: 'Đang tập' });
    expect(await screen.findByLabelText('Superset A', undefined, { timeout: LAZY_WAIT })).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
    timerStart.mockClear();
    const kg = screen.getAllByLabelText('Mức tạ hiệp 1');
    const reps = screen.getAllByLabelText('Số lần hiệp 1');
    const done = screen.getAllByRole('button', { name: 'Hoàn thành hiệp 1' });
    fireEvent.change(kg[0]!, { target: { value: '16' } });
    fireEvent.change(reps[0]!, { target: { value: '12' } });
    fireEvent.click(done[0]!);
    await sleep(20);
    expect(timerStart).not.toHaveBeenCalled();
    fireEvent.change(kg[1]!, { target: { value: '20' } });
    fireEvent.change(reps[1]!, { target: { value: '10' } });
    fireEvent.click(done[1]!);
    await waitFor(() => expect(timerStart).toHaveBeenCalledTimes(1));
    expect(timerStart.mock.calls[0]![0]).toBe(150);
    // Bài lẻ sau nhóm vẫn nghỉ theo restSec của chính nó
    fireEvent.change(kg[2]!, { target: { value: '30' } });
    fireEvent.change(reps[2]!, { target: { value: '10' } });
    fireEvent.click(done[2]!);
    await waitFor(() => expect(timerStart).toHaveBeenCalledTimes(2));
    expect(timerStart.mock.calls[1]![0]).toBe(s.exercises[2]!.target!.restSec);
  });
});

describe('SessionLogger — đơn vị lb (v1.8.0)', () => {
  afterEach(() => saveSpy.mockReset());
  it('hiển thị "lb"; nhập 225 lb lưu 102,06 kg; ô không sửa thì kg gốc không trôi', async () => {
    await settleThenReset();
    const st = await repo.getSettings();
    const { id: _i, updatedAt: _u, ...rest } = st;
    await repo.saveSettings({ ...rest, weightUnit: 'lb' });
    const p = (await repo.getActiveProgram())!;
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a' });
    s.exercises[1]!.sets[0] = { ...s.exercises[1]!.sets[0]!, weightKg: 60 };
    await repo.saveSession(s);
    render(
      <FeedbackProvider>
        <RestTimerProvider sound={false} vibrate={false}>
          <MemoryRouter initialEntries={[`/tap/${s.id}`]}>
            <Routes>
              <Route path="/tap/:id" element={<SessionLogger />} />
            </Routes>
          </MemoryRouter>
        </RestTimerProvider>
      </FeedbackProvider>,
    );
    await screen.findByRole('heading', { name: 'Đang tập' });
    await waitFor(() => expect(screen.getAllByText('lb').length).toBeGreaterThan(0));
    const kg = screen.getAllByLabelText('Mức tạ hiệp 1') as HTMLInputElement[];
    await waitFor(() => expect(kg[1]!.value).toBe('132,3'));
    fireEvent.change(kg[0]!, { target: { value: '225' } });
    // ô thứ 2: gõ lại đúng số đang hiển thị => giữ nguyên 60 kg
    fireEvent.change(kg[1]!, { target: { value: '132,3' } });
    await sleep(50);
    await waitFor(async () => expect((await db.sessions.get(s.id))!.exercises[0]!.sets[0]!.weightKg).toBe(102.06));
    expect((await db.sessions.get(s.id))!.exercises[1]!.sets[0]!.weightKg).toBe(60);
  });
});

describe('SessionLogger — thu gọn bài đã xong (v1.9.0)', () => {
  afterEach(() => saveSpy.mockReset());

  it('bài xong hết hiệp lúc mở trang => thu gọn, hiện tóm tắt; bấm tóm tắt thì mở lại', async () => {
    await settleThenReset();
    const p = (await repo.getActiveProgram())!;
    const s = await repo.startSession({ programId: p.id, programDayId: 'day-a' });
    s.exercises[0]!.sets = s.exercises[0]!.sets.map((x, i) => ({ ...x, weightKg: 20, reps: 10 - i, done: true }));
    await repo.saveSession(s);
    render(
      <FeedbackProvider>
        <RestTimerProvider sound={false} vibrate={false}>
          <MemoryRouter initialEntries={[`/tap/${s.id}`]}>
            <Routes>
              <Route path="/tap/:id" element={<SessionLogger />} />
            </Routes>
          </MemoryRouter>
        </RestTimerProvider>
      </FeedbackProvider>,
    );
    await screen.findByRole('heading', { name: 'Đang tập' });
    const summary = await screen.findByTestId('collapsed-summary');
    expect(summary.textContent).toContain(`${s.exercises[0]!.sets.length} hiệp xong`);
    expect(summary.textContent).toContain('20×10');
    // Bài thứ 2 chưa làm => không thu gọn
    expect(screen.getAllByTestId('collapsed-summary')).toHaveLength(1);
    const inputsBefore = screen.getAllByLabelText('Mức tạ hiệp 1');
    expect(inputsBefore.every((el) => !el.closest('[hidden]'))).toBe(false);
    fireEvent.click(summary);
    expect(screen.queryByTestId('collapsed-summary')).toBeNull();
    expect(screen.getAllByLabelText('Mức tạ hiệp 1').every((el) => !el.closest('[hidden]'))).toBe(true);
  });
});

describe('SessionLogger — hiệp khởi động tự tính (v1.9.0)', () => {
  afterEach(() => saveSpy.mockReset());

  it('chưa có tạ => không có nút; nhập 40 kg hiệp 1 => "Thêm khởi động" chèn 3 hiệp K (15/25/32,5) lên đầu, bấm lần 2 không nhân đôi', async () => {
    const s = await renderLogger();
    // Bài đầu (goblet squat, tạ đơn) chưa có tạ => chưa có nút; bài trọng lượng cơ thể trong buổi vẫn có nút (1 hiệp không tạ).
    const card = screen.getByRole('link', { name: 'Squat tạ ấm/tạ đơn trước ngực' }).closest('section')!;
    expect(within(card).queryByRole('button', { name: 'Thêm khởi động' })).toBeNull();
    fireEvent.change(screen.getAllByLabelText('Mức tạ hiệp 1')[0]!, { target: { value: '40' } });
    fireEvent.click(await within(card).findByRole('button', { name: 'Thêm khởi động' }));
    await waitFor(async () => expect((await db.sessions.get(s.id))!.exercises[0]!.sets.filter((x) => x.isWarmup)).toHaveLength(3));
    let sets = (await db.sessions.get(s.id))!.exercises[0]!.sets;
    expect(sets.slice(0, 3).map((x) => [x.weightKg, x.reps, x.isWarmup, x.done])).toEqual([
      [15, 8, true, false],
      [25, 5, true, false],
      [32.5, 3, true, false],
    ]);
    expect(sets[3]!.weightKg).toBe(40);
    fireEvent.click(within(card).getByRole('button', { name: 'Thêm khởi động' }));
    await sleep(100);
    sets = (await db.sessions.get(s.id))!.exercises[0]!.sets;
    expect(sets.filter((x) => x.isWarmup)).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Hiệp khởi động — chạm để đổi' }).length).toBeGreaterThanOrEqual(3);
  });
});
