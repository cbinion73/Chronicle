import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { deriveAnsweredLight, formatCarried, groupByYear } from '../lib/answeredLight';

// The Answered Light — the documented memory of God's past faithfulness.
// Per the rebuild vision this is meant to be one of the most spiritually
// significant screens in the product, and the one for the dry season: few
// things restore faith like seeing years of "asked" connected to "answered"
// in your own words. Scripture commands the practice (Deut. 8:2, Ps. 77:11).

const CAT_COLORS: Record<string, string> = {
  people: 'var(--accent-blue)',
  needs: 'var(--accent-amber)',
  praise: 'var(--accent-green)',
  world: 'var(--accent-purple)',
};

const CAT_LABELS: Record<string, string> = {
  people: 'People', needs: 'Needs', praise: 'Praise', world: 'World',
};

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AnsweredLight() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { prayerItems, setBibleView } = useAppStore();

  const entries = useMemo(() => deriveAnsweredLight(prayerItems), [prayerItems]);
  const groups = useMemo(() => groupByYear(entries), [entries]);

  const longestCarried = useMemo(
    () => entries.reduce((max, entry) => Math.max(max, entry.daysCarried), 0),
    [entries],
  );
  const totalTouches = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.timesPrayed, 0),
    [entries],
  );

  const openPassage = (reference: string) => {
    const target = getBibleNavigationTarget(reference);
    if (target) {
      setBibleView({ book: target.book, chapter: target.chapter, overlayOn: false, showThemePanel: false });
    }
    navigate('/bible');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <button
              onClick={() => navigate('/prayer')}
              style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}
            >
              ← Back to the Prayer Room
            </button>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              The Answered Light
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 480, lineHeight: 1.6 }}>
              Every request you carried, connected to how God answered. Kept as Scripture commands — so the memory of His faithfulness doesn't fade.
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13, background: 'var(--card-bg)', border: '1px dashed var(--border)', borderRadius: 14 }}>
            Nothing is marked answered yet. When you mark a request answered in the Prayer Room, it will take its place here — a light left on for the next dry season.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isPhone ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
              {[
                { n: entries.length, l: 'Answered' },
                { n: formatCarried(longestCarried).replace('carried for ', ''), l: 'Longest carried' },
                { n: totalTouches, l: 'Prayer touches' },
              ].map((stat) => (
                <div key={stat.l} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{stat.n}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{stat.l}</div>
                </div>
              ))}
            </div>

            {groups.map((group) => (
              <div key={group.year} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 14, letterSpacing: '0.02em' }}>
                  {group.year}
                </div>
                <div style={{ borderLeft: '2px solid var(--border)', marginLeft: 6, paddingLeft: 20, display: 'grid', gap: 18 }}>
                  {group.entries.map((entry) => (
                    <div key={entry.id} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: -26, top: 4, width: 10, height: 10, borderRadius: 999,
                        background: CAT_COLORS[entry.category], border: '2px solid var(--bg)',
                      }} />
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${CAT_COLORS[entry.category]}18`, color: CAT_COLORS[entry.category], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {CAT_LABELS[entry.category]}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Asked {formatDate(entry.dateAdded)} → Answered {formatDate(entry.dateAnswered)}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, marginBottom: 6 }}>
                          {entry.text}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: entry.answerSummary ? 8 : 0 }}>
                          {formatCarried(entry.daysCarried)}
                          {entry.timesPrayed > 0 ? ` · carried ${entry.timesPrayed} time${entry.timesPrayed === 1 ? '' : 's'}` : ''}
                        </div>
                        {entry.answerSummary ? (
                          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.65, margin: 0, borderLeft: '3px solid var(--accent-green)', paddingLeft: 10 }}>
                            "{entry.answerSummary}"
                          </p>
                        ) : null}
                        {entry.answerPassage ? (
                          <button
                            onClick={() => openPassage(entry.answerPassage!)}
                            style={{ marginTop: 8, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-green)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {entry.answerPassage}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
