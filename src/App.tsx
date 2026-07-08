import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAppStore } from './store';
import { currentRegister } from './lib/hours';
import AppShell from './components/layout/AppShell';

const Office = lazy(() => import('./pages/Office'));
const Bible = lazy(() => import('./pages/Bible'));
const Study = lazy(() => import('./pages/Study'));
const Discipleship = lazy(() => import('./pages/Discipleship'));
const Prayer = lazy(() => import('./pages/Prayer'));
const AnsweredLight = lazy(() => import('./pages/AnsweredLight'));
const SealedPrayers = lazy(() => import('./pages/SealedPrayers'));
const Rule = lazy(() => import('./pages/Rule'));
const QuestionLab = lazy(() => import('./pages/QuestionLab'));
const Lament = lazy(() => import('./pages/Lament'));
const Archaeology = lazy(() => import('./pages/Archaeology'));
const Thread = lazy(() => import('./pages/Thread'));
const TeachingOutline = lazy(() => import('./pages/TeachingOutline'));
const Themes = lazy(() => import('./pages/Themes'));
const Plans = lazy(() => import('./pages/Plans'));
const Memory = lazy(() => import('./pages/Memory'));
const Explore = lazy(() => import('./pages/Explore'));
const Settings = lazy(() => import('./pages/Settings'));
const Chapel = lazy(() => import('./pages/Chapel'));

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
  const initializeFromDatabase = useAppStore(s => s.initializeFromDatabase);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // The Hours: keep the register attribute current as the day turns.
  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-register', currentRegister());
    apply();
    const timer = window.setInterval(apply, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeFromDatabase();
  }, [initializeFromDatabase]);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Chapel mode renders outside AppShell entirely — no sidebar,
              no topbar, no AI companion. The more sacred the moment, the
              less chrome in the room. */}
          <Route path="chapel" element={<Chapel />} />
          <Route path="/" element={<AppShell />}>
            <Route index element={<Office />} />
            <Route path="bible" element={<Bible />} />
            <Route path="study" element={<Study />} />
            <Route path="discipleship" element={<Discipleship />} />
            <Route path="prayer" element={<Prayer />} />
            <Route path="prayer/answered-light" element={<AnsweredLight />} />
            <Route path="prayer/sealed" element={<SealedPrayers />} />
            <Route path="prayer/lament" element={<Lament />} />
            <Route path="rule" element={<Rule />} />
            <Route path="questions" element={<QuestionLab />} />
            <Route path="archaeology" element={<Archaeology />} />
            <Route path="thread" element={<Thread />} />
            <Route path="thread/teach/:entryId" element={<TeachingOutline />} />
            <Route path="thread/:view" element={<Thread />} />
            <Route path="themes" element={<Themes />} />
            <Route path="plans" element={<Plans />} />
            <Route path="memory" element={<Memory />} />
            <Route path="explore" element={<Explore />} />
            <Route path="explore/:view" element={<Explore />} />
            <Route path="settings" element={<Settings />} />
            {/* v1 routes redirect permanently into the Thread room */}
            <Route path="chronicle" element={<Navigate to="/thread" replace />} />
            <Route path="legacy" element={<Navigate to="/thread/story" replace />} />
            <Route path="insights" element={<Navigate to="/thread/patterns" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
