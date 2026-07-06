import { useEffect, useState } from 'react';
import { BAPTIST_ROSARY } from '../data/baptistRosary';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';

const BEAD_GLYPH: Record<string, string> = {
  crucifix: '✚',
  large: '●',
  small: '○',
};

export default function BaptistRosary({ onClose }: { onClose: () => void }) {
  const [position, setPosition] = useState(0);
  const addChronicleEntry = useAppStore((state) => state.addChronicleEntry);
  const addToast = useToastStore((state) => state.addToast);
  const bead = BAPTIST_ROSARY[position];
  const total = BAPTIST_ROSARY.length;
  const isFirst = position === 0;
  const isLast = position === total - 1;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPosition((p) => Math.min(p + 1, total - 1));
      if (e.key === 'ArrowLeft') setPosition((p) => Math.max(p - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, total]);

  const finish = () => {
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'prayer',
      title: 'Prayed the Baptist Beads',
      body: `Completed the full Baptist Rosary sequence — all ${total} beads, from the opening Crucifix to the Final Crucifix.`,
      autoCapture: true,
      sourceContext: { page: 'prayer' },
    });
    addToast('Baptist Beads prayer saved to Chronicle', 'success', '🙏');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)', height: 'min(640px, 88vh)', display: 'flex', flexDirection: 'column',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 18,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Pray the Baptist Beads
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <span style={{ fontSize: 14 }}>{BEAD_GLYPH[bead.beadType]}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden' }}>
              <div style={{ width: `${(position / (total - 1)) * 100}%`, height: '100%', background: 'var(--accent-green)', transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Bead {bead.index} of {total}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {bead.positionLabel ? (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {bead.section} · {bead.positionLabel}
            </div>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {bead.section}
            </div>
          )}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.3 }}>
            {bead.title}
          </h2>
          {bead.instruction ? (
            <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 16 }}>
              {bead.instruction}
            </p>
          ) : null}

          <div style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.65, margin: 0 }}>
              "{bead.scriptureText}"
            </p>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', marginTop: 8 }}>{bead.scriptureRef}</div>
          </div>

          {bead.prayerText ? (
            <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Prayer
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                {bead.prayerText}
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => setPosition((p) => Math.max(p - 1, 0))}
            disabled={isFirst}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          <div style={{ flex: 1 }} />
          {isLast ? (
            <button
              onClick={finish}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Finish ✓
            </button>
          ) : (
            <button
              onClick={() => setPosition((p) => Math.min(p + 1, total - 1))}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
