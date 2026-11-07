import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from '../../src/components/ui';

function H() {
  const [v, setV] = useState<'a' | 'b' | 'c'>('a');
  return <Tabs value={v} onChange={setV} tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }]} />;
}

it('Tabs: ←/→ chuyển tab, focus đi theo, chỉ tab đang chọn có tabIndex 0', () => {
  render(<H />);
  const [a, b, c] = screen.getAllByRole('tab');
  expect(a).toHaveAttribute('aria-selected', 'true');
  expect(b).toHaveAttribute('tabindex', '-1');
  fireEvent.keyDown(a!, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'B' }));
  fireEvent.keyDown(b!, { key: 'ArrowLeft' });
  fireEvent.keyDown(a!, { key: 'ArrowLeft' });
  expect(c).toHaveAttribute('aria-selected', 'true');
});
