import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FieldErrorsContext, useFieldErrors } from '../../src/lib/formErrors';
import { Field, FormError } from '../../src/components/ui';

describe('form dùng useFieldErrors', () => {
  function Form() {
    const fe = useFieldErrors();
    return (
      <FieldErrorsContext.Provider value={fe}>
        <div ref={fe.containerRef as React.RefObject<HTMLDivElement>}>
          <FormError />
          <Field name="a" label="Ô A">{(id) => <input id={id} />}</Field>
          <Field name="b" label="Ô B">{(id) => <input id={id} />}</Field>
          <button onClick={() => fe.setFromZod({ issues: [{ path: ['b'], message: 'Lỗi B' }, { path: [], message: 'Lỗi chung' }] })}>Lưu</button>
        </div>
      </FieldErrorsContext.Provider>
    );
  }

  it('focus ô lỗi đầu tiên, hiện lỗi chung, sửa ô thì lỗi biến mất', () => {
    render(<Form />);
    act(() => screen.getByText('Lưu').click());
    const b = screen.getByLabelText('Ô B');
    expect(document.activeElement).toBe(b);
    expect(screen.getByText('Lỗi B')).toBeTruthy();
    expect(screen.getByText('Lỗi chung')).toBeTruthy();
    expect(screen.getByLabelText('Ô A').getAttribute('aria-invalid')).toBeNull();
    act(() => {
      b.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(screen.queryByText('Lỗi B')).toBeNull();
    expect(b.getAttribute('aria-invalid')).toBeNull();
  });
});

/*
 * v1.7.1 — ô đang báo lỗi nuốt lần gõ đầu tiên.
 * Form dưới đây viết đúng như ProgramEditor 1.7.0: state + useFieldErrors trong CÙNG component,
 * onChange đọc e.target.value BÊN TRONG hàm cập nhật (đọc muộn).
 * Không có @testing-library/user-event (không thêm thư viện) → gõ/dán mô phỏng bằng sự kiện input thật
 * của DOM như trình duyệt phát ra: mỗi phím một sự kiện, dán = một sự kiện với cả chuỗi.
 */
describe('ô đang lỗi nhận đúng ký tự đầu tiên (v1.7.1)', () => {
  function NameForm() {
    const [p, setP] = useState({ name: '', note: '' });
    const fe = useFieldErrors();
    return (
      <FieldErrorsContext.Provider value={fe}>
        <div ref={fe.containerRef as React.RefObject<HTMLDivElement>}>
          <Field name="name" label="Tên giáo án">
            {(id) => <input id={id} value={p.name} onChange={(e) => setP((x) => ({ ...x, name: e.target.value }))} />}
          </Field>
          <Field name="note" label="Mô tả">
            {(id) => <input id={id} value={p.note} onChange={(e) => setP((x) => ({ ...x, note: e.target.value }))} />}
          </Field>
          <button onClick={() => fe.setFromZod({ issues: [{ path: ['name'], message: 'Cần tên giáo án' }] })}>Lưu</button>
        </div>
      </FieldErrorsContext.Provider>
    );
  }
  /*
   * Mô phỏng ĐÚNG thứ tự của trình duyệt khi người dùng gõ phím.
   * React 18 gắn 2 listener `input` lên gốc: một ở pha capture (chỉ chạy onInputCapture/onChangeCapture),
   * một ở pha bubble (mới chạy ChangeEventPlugin → onChange của ô).
   * Với sự kiện do NGƯỜI DÙNG tạo ra, trình duyệt chạy microtask GIỮA hai listener; React xả cập nhật
   * trong microtask đó. Sự kiện do script dispatchEvent() không có điểm dừng này (và act() càng không) →
   * test thông thường không thấy lỗi. Ở đây tách làm 2 bước để có điểm dừng microtask y như trình duyệt:
   *   1) sự kiện không nổi bọt → chỉ listener pha capture ở gốc chạy;
   *   2) chờ microtask/macrotask (React render + commit nếu có cập nhật);
   *   3) sự kiện nổi bọt → listener pha bubble chạy (pha capture chạy lại, khi đó không còn lỗi nên vô hại).
   */
  const setNative = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function inputEvent(el: HTMLInputElement, value: string) {
    setNative.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: false }));
    await tick();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
  }
  /** Gõ từng ký tự: mỗi phím một sự kiện input. */
  async function typeInto(el: HTMLInputElement, text: string) {
    for (const ch of text) await inputEvent(el, el.value + ch);
  }
  /** Dán: cả chuỗi vào trong MỘT sự kiện input. */
  async function pasteInto(el: HTMLInputElement, text: string) {
    await inputEvent(el, el.value + text);
  }
  let prevAct: unknown;
  beforeEach(() => {
    prevAct = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = false;
  });
  afterEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevAct;
  });
  async function showError() {
    render(<NameForm />);
    fireEvent.click(screen.getByText('Lưu'));
    await screen.findByText('Cần tên giáo án');
    const input = screen.getByLabelText<HTMLInputElement>('Tên giáo án');
    expect(screen.getByText('Cần tên giáo án')).toBeTruthy();
    expect(document.activeElement).toBe(input);
    return input;
  }

  it('gõ "A" vào ô đang lỗi → ô có "A" và lỗi biến mất', async () => {
    const input = await showError();
    await typeInto(input, 'A');
    expect(input.value).toBe('A');
    expect(screen.queryByText('Cần tên giáo án')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('dán "Giáo án" một lần vào ô đang lỗi → đủ cả chuỗi', async () => {
    const input = await showError();
    await pasteInto(input, 'Giáo án');
    expect(input.value).toBe('Giáo án');
    expect(screen.queryByText('Cần tên giáo án')).toBeNull();
  });

  it('gõ nhiều ký tự liên tiếp → không mất ký tự nào', async () => {
    const input = await showError();
    await typeInto(input, 'Push');
    expect(input.value).toBe('Push');
  });

  it('ô không lỗi bên cạnh vẫn gõ bình thường, lỗi ô tên giữ nguyên', async () => {
    await showError();
    const note = screen.getByLabelText<HTMLInputElement>('Mô tả');
    await typeInto(note, 'B');
    expect(note.value).toBe('B');
    expect(screen.getByText('Cần tên giáo án')).toBeTruthy();
  });
});
