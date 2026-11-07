import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
