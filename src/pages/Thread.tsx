import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { deriveThreadEvents, summarizeThread } from '../lib/thread';
import Chronicle from './Chronicle';
import Legacy from './Legacy';
import Insights from './Insights';

// The Thread — one room, three views of the same lifelong spine.
//   Record   the raw chronological log (formerly the Chronicle page)
//   Story    the narrated memoir       (formerly the Legacy page)
//   Patterns formation analysis        (formerly the Insights page)

const VIEWS = [
  { id: 'record', label: 'Record', path: '/thread' },
  { id: 'story', label: 'Story', path: '/thread/story' },
  { id: 'patterns', label: 'Patterns', path: '/thread/patterns' },
] as const;

type ViewId = typeof VIEWS[number]['id'];

export default function Thread() {
  const navigate = useNavigate();
  const params = useParams<{ view?: string }>();
  const { chronicleEntries, prayerItems } = useAppStore();

  const view: ViewId = params.view === 'story' || params.view === 'patterns' ? params.view : 'record';

  const summary = useMemo(
    () => summarizeThread(deriveThreadEvents(chronicleEntries, prayerItems)),
    [chronicleEntries, prayerItems],
  );

  const since = summary.firstDate
    ? new Date(`${summary.firstDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Room header: the unified spine, then the three views of it */}
      <div style={{ padding: '10px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {VIEWS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={view === tab.id ? 'page' : undefined}
              style={{
                padding: '7px 16px', border: 'none', fontSize: 12, fontWeight: view === tab.id ? 700 : 500,
                background: view === tab.id ? 'var(--accent-green)' : 'transparent',
                color: view === tab.id ? 'white' : 'var(--text-sub)', cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {summary.totalEvents} moments · {summary.activeDays} days walked
          {summary.answeredPrayers > 0 ? ` · ${summary.answeredPrayers} answered prayer${summary.answeredPrayers === 1 ? '' : 's'}` : ''}
          {since ? ` · since ${since}` : ''}
        </div>
      </div>

      {view === 'record' && <Chronicle />}
      {view === 'story' && <Legacy />}
      {view === 'patterns' && <Insights />}
    </div>
  );
}
