import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { NumberInput, numberToInputText } from '../../src/components/ui';

describe('numberToInputText', () => {
  it('dấu phẩy thập phân, không phân cách nghìn, null => rỗng', () => {
    expect(numberToInputText(88.2)).toBe('88,2');
    expect(numberToInputText(40)).toBe('40');
    expect(numberToInputText(1250.75)).toBe('1250,75');
    expect(numberToInputText(null)).toBe('');
    expect(numberToInputText(undefined)).toBe('');
  });
});

function Harness({ initial }: { initial: number | null }) {
  const [v, setV] = useState<number | null>(initial);
  return (
    <>
      <NumberInput aria-label="Số" value={v} onChange={setV} />
      <button type="button" onClick={() => setV(2.5)}>
        Đặt 2,5
      </button>
      <output data-testid="state">{v == null ? 'null' : String(v)}</output>
    </>
  );
}

describe('NumberInput — hiển thị số kiểu Việt', () => {
  it('giá trị ban đầu 88.2 hiện "88,2"', () => {
    render(<Harness initial={88.2} />);
    expect((screen.getByLabelText('Số') as HTMLInputElement).value).toBe('88,2');
  });

  it('cha đổi giá trị => ô hiện dấu phẩy', () => {
    render(<Harness initial={40} />);
    const input = screen.getByLabelText('Số') as HTMLInputElement;
    expect(input.value).toBe('40');
    fireEvent.click(screen.getByRole('button', { name: 'Đặt 2,5' }));
    expect(input.value).toBe('2,5');
  });

  it('gõ "62.5" hay "62,5" đều ra 62.5; chữ đang gõ giữ nguyên', () => {
    render(<Harness initial={null} />);
    const input = screen.getByLabelText('Số') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '62.5' } });
    expect(screen.getByTestId('state').textContent).toBe('62.5');
    expect(input.value).toBe('62.5');
    fireEvent.change(input, { target: { value: '62,5' } });
    expect(screen.getByTestId('state').textContent).toBe('62.5');
    expect(input.value).toBe('62,5');
  });

  it('onChange nhận số đã parse, không bị gọi lại khi cha đồng bộ', () => {
    const onChange = vi.fn();
    render(<NumberInput aria-label="Số" value={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Số'), { target: { value: '12,5' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(12.5);
  });
});
