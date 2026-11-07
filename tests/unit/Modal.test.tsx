import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '../../src/components/ui';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Mở hộp thoại</button>
      <button>Nút nền</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Thử"
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Xong
          </button>
        }
      >
        <input aria-label="Ô đầu" />
        <input aria-label="Ô hai" />
      </Modal>
    </div>
  );
}

describe('Modal — focus & nền', () => {
  it('mở: focus nằm trong dialog (ô đầu tiên của nội dung), nền inert + aria-hidden', () => {
    render(<Harness />);
    const opener = screen.getByText('Mở hộp thoại');
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText('Ô đầu'));
    const appRoot = opener.closest('body > div')!;
    expect(appRoot.hasAttribute('inert')).toBe(true);
    expect(appRoot.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.closest('[inert]')).toBeNull();
  });

  it('Tab ở phần tử cuối quay về phần tử đầu; Shift+Tab ở đầu sang cuối', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Mở hộp thoại'));
    const dialog = screen.getByRole('dialog');
    const list = Array.from(dialog.querySelectorAll<HTMLElement>('button, input'));
    const first = list[0]!;
    const last = list[list.length - 1]!;
    expect(last.textContent).toBe('Xong');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('đóng: focus trả về nút đã mở, nền hết inert', () => {
    render(<Harness />);
    const opener = screen.getByText('Mở hộp thoại');
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByLabelText('Ô đầu'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    const appRoot = opener.closest('body > div')!;
    expect(appRoot.hasAttribute('inert')).toBe(false);
    expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
  });

  it('bấm nút Đóng cũng trả focus', () => {
    render(<Harness />);
    const opener = screen.getByText('Mở hộp thoại');
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(document.activeElement).toBe(opener);
  });
});
