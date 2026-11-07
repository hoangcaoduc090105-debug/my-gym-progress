import { db } from '../../src/db/db';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as repo from '../../src/db/repo';
import { FeedbackProvider } from '../../src/components/feedback';
import { RestTimerProvider } from '../../src/features/workout/RestTimer';
import { SessionLogger } from '../../src/features/workout/SessionLogger';
import { resetDb } from '../integration/helpers';

vi.mock('../../src/db/repo', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/db/repo')>();
  return { ...m, saveSession: vi.fn(m.saveSession) };
});
const saveSpy = vi.mocked(repo.saveSession);
const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

async function renderLogger() {
  await resetDb();
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Thay bài' })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Thay bằng Đạp đùi máy' }));
    // Buổi theo giáo án => hỏi phạm vi; chọn "Chỉ buổi này"
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉ buổi này' }));
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
    expect(await screen.findByRole('link', { name: 'Đạp đùi máy' })).toBeInTheDocument();
  });
});
