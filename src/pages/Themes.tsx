import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { deriveCanonCoverage, deriveMonthlyActivity, deriveThemeSignals, groupThemesByCategory } from '../lib/formationAnalytics';
import { useAIChatStore } from '../store/aiChatStore';

const TIER_COLORS: Record<string, string> = {
  Strong: '#0f4fcf',
  Supporting: '#4f46e5',
  Emerging: '#d97706',
};

export default function Themes() {
  const { chronicleEntries } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const [query, setQuery] = useState('');
  const themeSignals = useMemo(() => deriveThemeSignals(chronicleEntries), [chronicleEntries]);
  const grouped = useMemo(() => groupThemesByCategory(themeSignals), [themeSignals]);
  const [activeTheme, setActiveTheme] = useState(themeSignals[0]?.id || '');
  const selected = themeSignals.find((theme) => theme.id === activeTheme) || themeSignals[0] || null;

  const filteredGroups = grouped
    .map((group) => ({
      ...group,
      themes: group.themes.filter((theme) => theme.label.toLowerCase().includes(query.toLowerCase())),
    }))
    .filter((group) => group.themes.length > 0);

  const canonCoverage = selected ? deriveCanonCoverage(selected.passages.map((passage) => passage.ref)) : [];
  const monthly = selected
    ? selected.timeline.map((item) => ({ label: item.month.slice(5), count: item.count }))
    : deriveMonthlyActivity(chronicleEntries).map((item) => ({ label: item.label, count: item.count }));

  const entryMix = selected
    ? [
        { label: 'Study', count: selected.entryTypes.study + selected.entryTypes.insight, tone: 'Strong' },
        { label: 'Prayer', count: selected.entryTypes.prayer, tone: 'Supporting' },
        { label: 'Reflection', count: selected.entryTypes.reflection + selected.entryTypes.note, tone: 'Emerging' },
      ]
    : [];

  useEffect(() => {
    setSelectedAgentMode('bible_study_agent');
    setPageContext('/themes', {
      page: 'Themes',
      pathname: '/themes',
      title: document.title,
      selection: selected ? `${selected.label} theme` : 'Theme browser',
      summary: selected
        ? `Theme browser focused on ${selected.label}. Chronicle has ${selected.count} related signals and ${selected.passages.length} saved Scripture anchors for it.`
        : `Theme browser with ${themeSignals.length} derived themes.`,
    });
  }, [selected, setPageContext, setSelectedAgentMode, themeSignals.length]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 240, minWidth: 240, borderRight: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)' }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, background: 'var(--card-bg)', color: 'var(--text)', outline: 'none' }}
            placeholder="Find a theme..."
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filteredGroups.map((group) => (
            <div key={group.name}>
              <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {group.name}
              </div>
              {group.themes.map((theme) => {
                const active = selected?.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setActiveTheme(theme.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px 8px 18px',
                      border: 'none',
                      background: active ? 'var(--sidebar-selected-bg)' : 'transparent',
                      color: active ? 'var(--sidebar-selected-text)' : 'var(--text-sub)',
                      fontWeight: active ? 600 : 400,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: theme.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{theme.label}</span>
                    {theme.mine && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '0 4px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', borderRadius: 3 }}>Mine</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{theme.count}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              No saved themes match that search yet.
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
        {selected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                {selected.label[0]}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{selected.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selected.count} Chronicle connections · {selected.passages.length} Scripture anchors
                </div>
              </div>
              {selected.mine && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', borderRadius: 6, border: '1px solid var(--accent-blue)', marginLeft: 'auto' }}>Personal Theme</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, marginBottom: 16 }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Canon Coverage</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1 }}>
                  {canonCoverage.map((bucket) => (
                    <div key={bucket.label} style={{ width: `${bucket.pct}%`, background: bucket.color }} title={`${bucket.label}: ${bucket.pct}%`} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  {canonCoverage.map((bucket) => (
                    <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: bucket.color }} />
                      {bucket.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>How It Shows Up</div>
                {entryMix.map((row) => (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{row.count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: TIER_COLORS[row.tone], borderRadius: 2, width: `${Math.min(100, row.count * 20)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Key Passages in Your Chronicle</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.passages.length > 0 ? selected.passages.map((passage) => (
                  <div key={`${passage.entryId}-${passage.ref}`} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selected.color }}>{passage.ref}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${selected.color}18`, color: selected.color }}>Saved</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{passage.text}</p>
                  </div>
                )) : (
                  <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    Chronicle has not yet captured Scripture references for this theme. The theme exists in your writing, but it needs more passage anchors.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chronicle needs more saved entries before themes can emerge.</div>
        )}
      </div>

      <div style={{ width: 272, minWidth: 272, borderLeft: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Your Chronicle on {selected?.label || 'this theme'}
          </div>
          {selected && chronicleEntries.filter((entry) => `${entry.title} ${entry.body} ${(entry.themes || []).join(' ')}`.toLowerCase().includes(selected.label.toLowerCase())).slice(0, 5).map((entry) => (
            <div key={entry.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{entry.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.date}{entry.passage ? ` · ${entry.passage}` : ''}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Monthly Activity</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 56 }}>
            {monthly.map((month) => {
              const max = Math.max(1, ...monthly.map((item) => item.count));
              return (
                <div key={month.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: month.count === max ? selected?.color || 'var(--accent-blue)' : 'var(--border)', borderRadius: 3, height: `${(month.count / max) * 100}%`, minHeight: month.count > 0 ? 8 : 2 }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Connected Themes</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(selected?.relatedThemes || []).slice(0, 8).map((theme) => (
              <button
                key={theme}
                onClick={() => {
                  const target = themeSignals.find((item) => item.label === theme);
                  if (target) setActiveTheme(target.id);
                }}
                style={{ fontSize: 11, padding: '3px 9px', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-sub)', cursor: 'pointer', background: 'var(--card-inner)' }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
