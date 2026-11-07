import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from '../../src/components/ui';

describe('Field', () => {
  it('có lỗi: dòng role="alert", aria-invalid và aria-describedby trỏ đúng id', () => {
    let a11ySeen: { invalid: boolean; describedBy?: string } | null = null;
    render(
      <Field label="Cân nặng" error="Cần nhập một số hợp lệ">
        {(id, a11y) => {
          a11ySeen = a11y;
          return <input id={id} />;
        }}
      </Field>,
    );
    const input = screen.getByLabelText('Cân nặng');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Cần nhập một số hợp lệ');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(alert.id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(a11ySeen).toEqual({ invalid: true, describedBy: alert.id });
  });

  it('không lỗi: không có alert, không aria-invalid, hiện gợi ý', () => {
    render(
      <Field label="Chiều cao" hint="cm">
        {(id) => <input id={id} />}
      </Field>,
    );
    const input = screen.getByLabelText('Chiều cao');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(screen.getByText('cm')).toBeTruthy();
  });
});
