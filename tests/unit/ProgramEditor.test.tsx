import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as repo from '../../src/db/repo';
import { FeedbackProvider } from '../../src/components/feedback';
import { ProgramEditor } from '../../src/features/workout/ProgramEditor';
import { resetDb } from '../integration/helpers';

async function renderEditor() {
  await resetDb();
  const p = (await repo.getActiveProgram())!;
  render(
    <FeedbackProvider>
      <MemoryRouter initialEntries={['/lich-tap', `/giao-an/${p.id}`]} initialIndex={1}>
        <Routes>
          <Route path="/lich-tap" element={<h1>Trang lịch tập</h1>} />
          <Route path="/giao-an/:id" element={<ProgramEditor />} />
        </Routes>
      </MemoryRouter>
    </FeedbackProvider>,
  );
  await screen.findByLabelText('Tên giáo án');
  return p;
}

describe('ProgramEditor — thay đổi chưa lưu', () => {
  beforeEach(() => localStorage.clear());

  it('sửa tên → Quay lại → hiện hỏi xác nhận; chọn Hủy thì ở lại trang', async () => {
    await renderEditor();
    fireEvent.change(screen.getByLabelText('Tên giáo án'), { target: { value: 'Giáo án mới của tôi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    const dlg = await screen.findByRole('dialog', { name: 'Có thay đổi chưa lưu. Rời trang?' });
    expect(dlg).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Tên giáo án')).toHaveValue('Giáo án mới của tôi');
    expect(screen.queryByText('Trang lịch tập')).toBeNull();
  });

  it('chưa sửa gì → Quay lại đi luôn, không hỏi', async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    await screen.findByText('Trang lịch tập');
  });

  it('chọn Rời trang → quay về và xóa bản nháp', async () => {
    const p = await renderEditor();
    fireEvent.change(screen.getByLabelText('Tên giáo án'), { target: { value: 'Đổi tên' } });
    await act(() => new Promise((r) => setTimeout(r, 1100)));
    expect(localStorage.getItem(`mgp.programDraft.${p.id}`)).toContain('Đổi tên');
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rời trang' }));
    await screen.findByText('Trang lịch tập');
    expect(localStorage.getItem(`mgp.programDraft.${p.id}`)).toBeNull();
  });

  it('mở lại khi còn bản nháp → hỏi "Khôi phục bản nháp?"; đồng ý thì nạp nháp', async () => {
    await resetDb();
    const p = (await repo.getActiveProgram())!;
    localStorage.setItem(`mgp.programDraft.${p.id}`, JSON.stringify({ ...p, name: 'Tên trong nháp' }));
    render(
      <FeedbackProvider>
        <MemoryRouter initialEntries={[`/giao-an/${p.id}`]}>
          <Routes>
            <Route path="/giao-an/:id" element={<ProgramEditor />} />
          </Routes>
        </MemoryRouter>
      </FeedbackProvider>,
    );
    await screen.findByRole('dialog', { name: 'Khôi phục bản nháp?' });
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
    await waitFor(() => expect(screen.getByLabelText('Tên giáo án')).toHaveValue('Tên trong nháp'));
  });
});

/* v1.7.1 — ô "Tên giáo án" đang báo lỗi không được nuốt ký tự đầu (xem giải thích ở formErrorsForm.test.tsx). */
describe('ProgramEditor — ô tên đang lỗi nhận đúng ký tự đầu tiên', () => {
  const setNative = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function userInput(el: HTMLInputElement, value: string) {
    setNative.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: false }));
    await tick();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
  }
  let prevAct: unknown;
  beforeEach(() => {
    localStorage.clear();
    prevAct = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT;
  });
  afterEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevAct;
  });

  it('xóa tên → Lưu → gõ "X" → ô có "X", lỗi biến mất; dán chuỗi cũng đủ', async () => {
    await renderEditor();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = false;
    const input = screen.getByLabelText<HTMLInputElement>('Tên giáo án');
    await userInput(input, '');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await screen.findByText('Cần tên giáo án');
    await waitFor(() => expect(document.activeElement).toBe(input));
    await userInput(input, 'X');
    expect(input.value).toBe('X');
    expect(screen.queryByText('Cần tên giáo án')).toBeNull();
    // Dán vào ô đang lỗi lần nữa
    await userInput(input, '');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await screen.findByText('Cần tên giáo án');
    await userInput(input, 'Giáo án dán');
    expect(input.value).toBe('Giáo án dán');
  });
});
