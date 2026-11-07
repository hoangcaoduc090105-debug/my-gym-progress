import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FeedbackProvider } from '../components/feedback';
import { Spinner } from '../components/ui';
import { db } from '../db/db';
import { ensureSeed } from '../db/seed';
import { loadSchemas } from '../db/repo';
import { errorMessage } from '../db/errors';
import { requestAndRecordPersistence, retryPersistenceOnFirstInteraction, setPersistRecorder } from '../lib/storage';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { Layout } from './Layout';
import { useSettings } from './useAppData';
import { RestTimerProvider } from '../features/workout/RestTimer';
import { Dashboard } from '../features/dashboard/Dashboard';
import { WorkoutHome } from '../features/workout/WorkoutHome';

// Trang có biểu đồ (Recharts) tải lười để mở app nhanh hơn.
const BodyPage = lazy(() => import('../features/body/BodyPage'));
// Trang ít dùng khi đang tập + dữ liệu lớn (thực phẩm, món ăn, hướng dẫn) => chunk riêng.
const NutritionPage = lazy(() => import('../features/nutrition/NutritionPage').then((m) => ({ default: m.NutritionPage })));
const Library = lazy(() => import('../features/library/Library').then((m) => ({ default: m.Library })));
const ExerciseDetail = lazy(() => import('../features/library/ExerciseDetail').then((m) => ({ default: m.ExerciseDetail })));
const ExerciseForm = lazy(() => import('../features/library/ExerciseForm').then((m) => ({ default: m.ExerciseForm })));
const GuidePage = lazy(() => import('../features/guide/GuidePage').then((m) => ({ default: m.GuidePage })));
const Onboarding = lazy(() => import('../features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })));
const ProgramEditor = lazy(() => import('../features/workout/ProgramEditor').then((m) => ({ default: m.ProgramEditor })));
const MorePage = lazy(() => import('../features/more/MorePage').then((m) => ({ default: m.MorePage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
// Trang ghi buổi tập (kèm thay bài, lịch sử, đĩa tạ…) => chunk riêng; được precache nên vẫn mở offline.
const SessionLogger = lazy(() => import('../features/workout/SessionLogger').then((m) => ({ default: m.SessionLogger })));
const SessionDetail = lazy(() => import('../features/workout/SessionDetail').then((m) => ({ default: m.SessionDetail })));
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
              <Route path="them" element={<MorePage />} />
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
      .then(() => {
        setReady(true);
        // Bước nền: tạo ảnh thu nhỏ còn thiếu (ảnh cũ/ảnh nhập) — không chặn giao diện.
        setTimeout(() => void import('../db/migrations').then((m) => m.ensureThumbnails()).catch(() => undefined), 1500);
        // Tải sẵn schema kiểm tra dữ liệu để lần ghi đầu tiên không phải chờ.
        void loadSchemas();
      })
      .catch((e: unknown) => setFatal(errorMessage(e)));
    setPersistRecorder(async (v) => {
      await db.meta.put({ key: 'persisted', value: v });
    });
    void requestAndRecordPersistence();
    const stopRetry = retryPersistenceOnFirstInteraction();
    return stopRetry;
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
