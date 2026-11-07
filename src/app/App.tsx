import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FeedbackProvider } from '../components/feedback';
import { Spinner } from '../components/ui';
import { db } from '../db/db';
import { ensureSeed } from '../db/seed';
import { errorMessage } from '../db/errors';
import { requestPersistence } from '../lib/storage';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { Layout } from './Layout';
import { useSettings } from './useAppData';
import { RestTimerProvider } from '../features/workout/RestTimer';
import { Onboarding } from '../features/onboarding/Onboarding';
import { Dashboard } from '../features/dashboard/Dashboard';
import { WorkoutHome } from '../features/workout/WorkoutHome';
import { SessionLogger } from '../features/workout/SessionLogger';
import { SessionDetail } from '../features/workout/SessionDetail';
import { ProgramEditor } from '../features/workout/ProgramEditor';
import { Library } from '../features/library/Library';
import { ExerciseDetail } from '../features/library/ExerciseDetail';
import { ExerciseForm } from '../features/library/ExerciseForm';
import { NutritionPage } from '../features/nutrition/NutritionPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { GuidePage } from '../features/guide/GuidePage';

// Trang có biểu đồ (Recharts) tải lười để mở app nhanh hơn.
const BodyPage = lazy(() => import('../features/body/BodyPage'));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage'));

function Shell() {
  const settings = useSettings();
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
  if (profile === undefined) return <Spinner />;
  return (
    <RestTimerProvider sound={settings.timerSound} vibrate={settings.timerVibrate}>
      <Suspense fallback={<Spinner />}>
        <Routes>
          {!profile ? (
            <>
              <Route path="/chao-mung" element={<Onboarding />} />
              <Route path="*" element={<Navigate to="/chao-mung" replace />} />
            </>
          ) : (
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="lich-tap" element={<WorkoutHome />} />
              <Route path="lich-tap/giao-an/:id" element={<ProgramEditor />} />
              <Route path="lich-tap/buoi/:id" element={<SessionDetail />} />
              <Route path="tap/:id" element={<SessionLogger />} />
              <Route path="thu-vien" element={<Library />} />
              <Route path="thu-vien/moi" element={<ExerciseForm />} />
              <Route path="thu-vien/:id" element={<ExerciseDetail />} />
              <Route path="thu-vien/:id/sua" element={<ExerciseForm />} />
              <Route path="co-the" element={<BodyPage />} />
              <Route path="dinh-duong" element={<NutritionPage />} />
              <Route path="phan-tich" element={<AnalyticsPage />} />
              <Route path="cai-dat" element={<SettingsPage />} />
              <Route path="huong-dan" element={<GuidePage />} />
              <Route path="chao-mung" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </RestTimerProvider>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  useEffect(() => {
    ensureSeed()
      .then(() => setReady(true))
      .catch((e: unknown) => setFatal(errorMessage(e)));
    void requestPersistence();
  }, []);

  if (fatal) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">Không mở được cơ sở dữ liệu</h1>
        <p className="mt-2 text-sm text-muted">
          Trình duyệt có thể đang ở chế độ ẩn danh hoặc chặn lưu trữ. Hãy mở bằng trình duyệt thường và cho phép lưu trữ trang web.
        </p>
        <pre className="mt-3 rounded-xl bg-surface p-3 text-left text-xs text-danger">{fatal}</pre>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <FeedbackProvider>
        <UpdatePrompt />
        {ready ? (
          <HashRouter>
            <Shell />
          </HashRouter>
        ) : (
          <Spinner />
        )}
      </FeedbackProvider>
    </ErrorBoundary>
  );
}
