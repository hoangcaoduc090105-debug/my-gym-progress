import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '../../src/db/db';
import * as repo from '../../src/db/repo';
import { FeedbackProvider } from '../../src/components/feedback';
import { Onboarding } from '../../src/features/onboarding/Onboarding';
import { resetDb } from '../integration/helpers';

vi.setConfig({ testTimeout: 20_000 });

async function renderOnboarding() {
  await resetDb();
  render(
    <FeedbackProvider>
      <MemoryRouter initialEntries={['/chao-mung']}>
        <Routes>
          <Route path="/chao-mung" element={<Onboarding />} />
          <Route path="/" element={<h1>Hôm nay</h1>} />
        </Routes>
      </MemoryRouter>
    </FeedbackProvider>,
  );
  await screen.findByRole('heading', { name: 'My Gym Progress' });
}

describe('Onboarding — cân nặng theo kg/lb (v1.9)', () => {
  it('mặc định kg: nhãn "(kg)", lưu đúng kg, đơn vị Cài đặt vẫn kg', async () => {
    await renderOnboarding();
    fireEvent.change(screen.getByLabelText('Chiều cao (cm) *'), { target: { value: '174' } });
    fireEvent.change(screen.getByLabelText('Cân nặng hiện tại (kg)'), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    await screen.findByRole('heading', { name: 'Hôm nay' });
    await waitFor(async () => expect((await db.bodyMetrics.toArray())[0]?.weightKg).toBe(65));
    expect((await repo.getSettings()).weightUnit).toBe('kg');
  });

  it('chọn lb: nhãn đổi "(lb)", 150 lb lưu 68,04 kg, gợi ý protein tính từ kg, Cài đặt chuyển sang lb', async () => {
    await renderOnboarding();
    fireEvent.change(screen.getByLabelText('Chiều cao (cm) *'), { target: { value: '174' } });
    fireEvent.click(screen.getByRole('tab', { name: 'lb' }));
    const w = screen.getByLabelText('Cân nặng hiện tại (lb)') as HTMLInputElement;
    fireEvent.change(w, { target: { value: '150' } });
    // 68,04 kg × 1,6 ≈ 109 → làm tròn 5 g = 110; × 2,0 ≈ 136 → 135
    expect((screen.getByLabelText('Tối thiểu (g)') as HTMLInputElement).value).toBe('110');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    await screen.findByRole('heading', { name: 'Hôm nay' });
    await waitFor(async () => expect((await db.bodyMetrics.toArray())[0]?.weightKg).toBe(68.04));
    expect((await repo.getSettings()).weightUnit).toBe('lb');
  });
});
