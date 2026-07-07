import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { deriveTeachingOutline, exportTeachingOutline, hasTeachingMaterial } from '../lib/teachingLoft';

// The Teaching Loft — a saved Study Council convening rendered as a
// shareable outline for a small group or family devotional. Closes the
// "Teach" pillar: Know, Understand, Live, Teach, Pass On.

export default function TeachingOutline() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries } = useAppStore();

  const entry = useMemo(() => chronicleEntries.find((e) => e.id === entryId), [chronicleEntries, entryId]);
  const outline = useMemo(() => (entry && hasTeachingMaterial(entry) ? deriveTeachingOutline(entry) : null), [entry]);

  if (!entry || !outline) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
          <button
            onClick={() => navigate('/thread')}
            style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 16 }}
          >
            ← Back to the Thread
          </button>
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13, background: 'var(--card-bg)', border: '1px dashed var(--border)', borderRadius: 14 }}>
            No Study Council convening was found for this entry. Teaching outlines can only be built from a saved Study Council session.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <button
              onClick={() => navigate('/thread')}
              style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}
            >
              ← Back to the Thread
            </button>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {outline.title}
            </h1>
            {outline.passage && (
              <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 700, marginTop: 4 }}>{outline.passage}</div>
            )}
            {outline.question && (
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 8, fontStyle: 'italic' }}>"{outline.question}"</p>
            )}
          </div>
          <button
            onClick={() => exportTeachingOutline(outline)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ⬇ Export as Markdown
          </button>
        </div>

        {outline.bigIdea && (
          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-purple)', marginBottom: 8 }}>Big Idea</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>{outline.bigIdea}</p>
          </section>
        )}

        {outline.keyInsights.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Key Insights</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {outline.keyInsights.map((insight, i) => (
                <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    {insight.tag} · {insight.seat}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{insight.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {outline.disputedNotes.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 10 }}>Where Scholars Disagree</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {outline.disputedNotes.map((note, i) => (
                <div key={i} style={{ background: 'var(--accent-amber-light)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{note.seat}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{note.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {outline.discussionPrompts.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Discussion &amp; Application</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {outline.discussionPrompts.map((prompt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{prompt}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ background: 'var(--accent-purple-light)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-purple)', marginBottom: 6 }}>Closing Prayer</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.65, margin: 0 }}>{outline.closingPrayer}</p>
        </section>
      </div>
    </div>
  );
}
