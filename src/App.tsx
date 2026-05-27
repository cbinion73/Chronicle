import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAppStore } from './store';
import AppShell from './components/layout/AppShell';

const Today = lazy(() => import('./pages/Today'));
const Bible = lazy(() => import('./pages/Bible'));
const Study = lazy(() => import('./pages/Study'));
const Discipleship = lazy(() => import('./pages/Discipleship'));
const Prayer = lazy(() => import('./pages/Prayer'));
const Chronicle = lazy(() => import('./pages/Chronicle'));
const Themes = lazy(() => import('./pages/Themes'));
const Plans = lazy(() => import('./pages/Plans'));
const Legacy = lazy(() => import('./pages/Legacy'));
const Insights = lazy(() => import('./pages/Insights'));
const Settings = lazy(() => import('./pages/Settings'));

function RouteLoading() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-sub)',
        background: 'var(--bg)',
        fontSize: 14,
      }}
    >
      Loading Chronicle…
    </div>
  );
}

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Today />} />
            <Route path="bible" element={<Bible />} />
            <Route path="study" element={<Study />} />
            <Route path="discipleship" element={<Discipleship />} />
            <Route path="prayer" element={<Prayer />} />
            <Route path="chronicle" element={<Chronicle />} />
            <Route path="themes" element={<Themes />} />
            <Route path="plans" element={<Plans />} />
            <Route path="legacy" element={<Legacy />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
