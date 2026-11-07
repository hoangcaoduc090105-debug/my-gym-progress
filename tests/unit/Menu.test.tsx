import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Menu } from '../../src/components/ui';

function setup() {
  const a = vi.fn();
  const b = vi.fn();
  const c = vi.fn();
  render(
    <Menu
      label="Thêm thao tác"
      items={[
        { label: 'Thay bài', onSelect: a },
        { label: 'Đưa lên', onSelect: b, disabled: true },
        { label: 'Bỏ bài', onSelect: c, danger: true },
      ]}
    />,
  );
  return { a, b, c, trigger: screen.getByRole('button', { name: 'Thêm thao tác' }) };
}

describe('Menu (nút ⋯)', () => {
  it('đóng mặc định; mở thì có role=menu, focus mục đầu, aria-expanded đúng', () => {
    const { trigger } = setup();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Thêm thao tác' })).toBeInTheDocument();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Thay bài' }));
  });

  it('↓ bỏ qua mục tắt và xoay vòng; Esc đóng, trả focus về nút', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Bỏ bài' }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Thay bài' }));
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('chọn mục => gọi handler và đóng; mục tắt không gọi', () => {
    const { a, b, trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đưa lên' }));
    expect(b).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Thay bài' }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('bấm ngoài menu => đóng', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
