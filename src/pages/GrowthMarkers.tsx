import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { getGrowthMarkerKind } from '../data/growthMarkers';
import GrowthMarkerCeremony from '../components/ui/GrowthMarkerCeremony';
import Card, { EmptyCard } from '../components/ui/Card';
import Badge, { TimelineDot } from '../components/ui/Badge';

// The Growth spine — a visible skeleton for long-arc spiritual formation.
// Unlike the Record view's undifferentiated log, this surfaces only the
// entries a person has deliberately marked as a milestone (baptism, a
// calling clarified, a season of doubt resolved), in order, as a spine
// down the middle of the Thread.

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function GrowthMarkers() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry, setBibleView } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);

  const markers = useMemo(
    () => chronicleEntries.filter((entry) => entry.type === 'growth').sort((a, b) => (a.date < b.date ? 1 : -1)),
    [chronicleEntries],
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
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              The Growth Spine
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
              The milestones you've deliberately marked — baptism, a calling clarified, a season of doubt resolved — laid out in order as the skeleton of a life walked with God.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-rose)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Add a Growth Marker
          </button>
        </div>

        {markers.length === 0 ? (
          <EmptyCard>
            No growth markers yet. When you mark a baptism, a calling clarified, or a season resolved, it will take its place here as the spine of your story.
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
          <div style={{ borderLeft: '2px solid var(--accent-rose)', marginLeft: 6, paddingLeft: 20, display: 'grid', gap: 18 }}>
            {markers.map((entry) => {
              const kind = getGrowthMarkerKind(entry.sourceContext?.growthMarker?.kind);
              return (
                <div key={entry.id} style={{ position: 'relative' }}>
                  <TimelineDot color="var(--accent-rose)" />
                  <Card padding="14px 16px">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <Badge color="var(--accent-rose)">{kind.icon} {kind.label}</Badge>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(entry.date)}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, marginBottom: 6 }}>
                      {entry.title}
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>
                      {entry.body}
                    </p>
                    {entry.passage ? (
                      <button
                        onClick={() => openPassage(entry.passage!)}
                        style={{ marginTop: 8, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-rose)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {entry.passage}
                      </button>
                    ) : null}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addOpen ? (
        <GrowthMarkerCeremony
          onCancel={() => setAddOpen(false)}
          onComplete={({ kind, title, body, passage }) => {
            addChronicleEntry({
              id: Math.random().toString(36).slice(2),
              date: new Date().toISOString().split('T')[0],
              type: 'growth',
              title,
              body,
              passage: passage || undefined,
              sourceContext: { page: 'chronicle', growthMarker: { kind } },
            });
            setAddOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
