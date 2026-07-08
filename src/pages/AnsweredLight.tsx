import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { deriveAnsweredLight, formatCarried, groupByYear } from '../lib/answeredLight';
import Card, { EmptyCard } from '../components/ui/Card';
import Badge, { TimelineDot } from '../components/ui/Badge';

// The Answered Light — the documented memory of God's past faithfulness.
// Per the rebuild vision this is meant to be one of the most spiritually
// significant screens in the product, and the one for the dry season: few
// things restore faith like seeing years of "asked" connected to "answered"
// in your own words. Scripture commands the practice (Deut. 8:2, Ps. 77:11).

const CAT_COLORS: Record<string, string> = {
  people: 'var(--accent-blue)',
  needs: 'var(--accent-amber)',
  praise: 'var(--accent-primary)',
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
          <EmptyCard>
            Nothing is marked answered yet. When you mark a request answered in the Prayer Room, it will take its place here — a light left on for the next dry season.
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => navigate('/archaeology')}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--accent-amber)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                🗿 Excavate Your Past
              </button>
            </div>
          </EmptyCard>
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
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 14, letterSpacing: '0.02em' }}>
                  {group.year}
                </div>
                <div style={{ borderLeft: '2px solid var(--border)', marginLeft: 6, paddingLeft: 20, display: 'grid', gap: 18 }}>
                  {group.entries.map((entry) => (
                    <div key={entry.id} style={{ position: 'relative' }}>
                      <TimelineDot color={CAT_COLORS[entry.category]} />
                      <Card padding="14px 16px">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <Badge color={CAT_COLORS[entry.category]}>{CAT_LABELS[entry.category]}</Badge>
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
                          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.65, margin: 0, borderLeft: '3px solid var(--accent-primary)', paddingLeft: 10 }}>
                            "{entry.answerSummary}"
                          </p>
                        ) : null}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {entry.answerPassage ? (
                            <button
                              onClick={() => openPassage(entry.answerPassage!)}
                              style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {entry.answerPassage}
                            </button>
                          ) : null}
                          <button
                            onClick={() => navigate('/thread', { state: { filterDate: entry.dateAnswered } })}
                            style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            ↓ View in Record
                          </button>
                        </div>
                      </Card>
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
