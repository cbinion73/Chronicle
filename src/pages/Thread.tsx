import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { deriveThreadEvents, summarizeThread } from '../lib/thread';
import Chronicle from './Chronicle';
import Legacy from './Legacy';
import Insights from './Insights';
import GrowthMarkers from './GrowthMarkers';
import AnsweredLight from './AnsweredLight';
import stoneStyles from '../styles/stoneCourtRegister.module.css';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

// The Thread — one room, five altitudes of the same lifelong spine
// (ROADMAP M21, "The Thread Made Literal"). Record, Answered Light,
// Growth Spine, and Story are the four canonical altitudes named in
// the roadmap — the same underlying chronicleEntries/prayerItems data,
// zoomed to a different level of aggregation. Patterns is formation
// analysis, not itself an altitude of the spine.
//   Record   the raw chronological log, every entry — ground level
//   Light    answered prayers, grouped by year        (formerly /prayer/answered-light only)
//   Growth   the marked milestones, a visible skeleton
//   Story    the narrated, typeset book               (formerly the Legacy page)
//   Patterns formation analysis                        (formerly the Insights page)
// Growth and Light stones carry a "↓ View in Record" link that jumps
// straight down to that day's ground-level entries (Chronicle.tsx's
// filterDate route state) — the literal zoom-in interaction that ties
// the altitudes into one navigable line rather than four unrelated pages.

const VIEWS = [
  { id: 'record', label: 'Record', path: '/thread' },
  { id: 'light', label: 'Answered Light', path: '/thread/light' },
  { id: 'growth', label: 'Growth', path: '/thread/growth' },
  { id: 'story', label: 'Story', path: '/thread/story' },
  { id: 'patterns', label: 'Patterns', path: '/thread/patterns' },
  { id: 'heritage', label: 'Heritage Room', path: '/heritage' },
] as const;

type ViewId = typeof VIEWS[number]['id'];
const VIEW_IDS = VIEWS.map((tab) => tab.id);

export default function Thread() {
  const navigate = useNavigate();
  const params = useParams<{ view?: string }>();
  const { chronicleEntries, prayerItems } = useAppStore();
  const { isIOSPhone } = useResponsiveLayout();

  const view: ViewId = (VIEW_IDS as readonly string[]).includes(params.view || '') ? (params.view as ViewId) : 'record';

  const summary = useMemo(
    () => summarizeThread(deriveThreadEvents(chronicleEntries, prayerItems)),
    [chronicleEntries, prayerItems],
  );

  const since = summary.firstDate
    ? new Date(`${summary.firstDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className={view !== 'story' ? stoneStyles.stoneCourtRegister : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Room header: the unified spine, then the three views of it */}
      {!isIOSPhone && <div style={{ padding: '10px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {VIEWS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={view === tab.id ? 'page' : undefined}
              style={{
                padding: '7px 16px', border: 'none', fontSize: 12, fontWeight: view === tab.id ? 700 : 500,
                background: view === tab.id ? 'var(--accent-primary)' : 'transparent',
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
      </div>}

      {view === 'record' && <Chronicle />}
      {view === 'light' && <AnsweredLight />}
      {view === 'story' && <Legacy />}
      {view === 'growth' && <GrowthMarkers />}
      {view === 'patterns' && <Insights />}
    </div>
  );
}
