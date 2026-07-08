import { useNavigate, useLocation } from 'react-router-dom';

// The one navigation surface for reaching a room's sub-pages, now that
// the Sidebar only lists the five main rooms (The Daily Office / The
// Word / The Prayer Room / The Thread / Settings). Same tab-bar shape
// The Thread's own altitude switcher already used (M21) — extended here
// to every room instead of being Thread-only. Matches on path prefix so
// a sub-route (e.g. /prayer/lament) still highlights its own tab, not
// the room's landing tab.
export interface SectionTab {
  label: string;
  path: string;
}

interface SectionTabsProps {
  tabs: SectionTab[];
}

export default function SectionTabs({ tabs }: SectionTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function isTabActive(tab: SectionTab, index: number) {
    if (tab.path === '/') return location.pathname === '/';
    // The landing tab (index 0) must match exactly, or it would stay
    // "active" while a sibling sub-page whose path starts with the same
    // prefix is actually showing (e.g. /prayer landing vs /prayer/lament).
    if (index === 0) return location.pathname === tab.path;
    return location.pathname.startsWith(tab.path);
  }

  return (
    <nav aria-label="Section" style={{ padding: '10px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', flexWrap: 'wrap' }}>
        {tabs.map((tab, index) => {
          const active = isTabActive(tab, index);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              style={{
                padding: '7px 16px', border: 'none', fontSize: 12, fontWeight: active ? 700 : 500,
                background: active ? 'var(--accent-primary)' : 'transparent',
                color: active ? 'white' : 'var(--text-sub)', cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
