import { useState } from 'react';
import { GROWTH_MARKER_KINDS } from '../../data/growthMarkers';

// The stone-setting ceremony (VISION.md: "ceremony over CRUD"). A growth
// marker is a memorial stone (Joshua 4) — it does not pass through the
// same modal used to fix a typo. First the stone is chosen, then it is
// written, then it is set, with a closing beat before it takes its place
// on the spine.

interface Props {
  onCancel: () => void;
  onComplete: (details: { kind: string; title: string; body: string; passage: string }) => void;
}

export default function GrowthMarkerCeremony({ onCancel, onComplete }: Props) {
  const [stage, setStage] = useState<'choosing' | 'writing' | 'setting'>('choosing');
  const [kind, setKind] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [passage, setPassage] = useState('');

  const selectedKind = GROWTH_MARKER_KINDS.find((k) => k.id === kind);

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: 24,
  };
  const panel: React.CSSProperties = {
    width: 'min(520px, 100%)', background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', padding: '32px 28px',
    display: 'grid', gap: 16,
  };

  const setTheStone = () => {
    if (!kind || !body.trim()) return;
    setStage('setting');
    window.setTimeout(() => {
      onComplete({
        kind,
        title: title.trim() || body.trim().slice(0, 60) + (body.length > 60 ? '…' : ''),
        body: body.trim(),
        passage: passage.trim(),
      });
    }, 1400);
  };

  if (stage === 'choosing') {
    return (
      <div style={overlay}>
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-rose)' }}>
            Setting a Stone
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0 }}>
            Which stone are you setting?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {GROWTH_MARKER_KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  border: `1px solid ${kind === k.id ? 'var(--accent-rose)' : 'var(--border)'}`,
                  borderRadius: 20, fontSize: 12, fontWeight: kind === k.id ? 700 : 500,
                  background: kind === k.id ? 'var(--accent-rose-light)' : 'transparent',
                  color: kind === k.id ? 'var(--accent-rose)' : 'var(--text-sub)', cursor: 'pointer',
                }}
              >
                <span>{k.icon}</span>{k.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Not yet
            </button>
            <button
              onClick={() => setStage('writing')}
              disabled={!kind}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-rose)', color: 'white', fontSize: 12, fontWeight: 700, cursor: kind ? 'pointer' : 'default', opacity: kind ? 1 : 0.5 }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'setting') {
    return (
      <div style={overlay}>
        <div style={{ ...panel, textAlign: 'center', animation: 'stoneSet 1.4s ease' }}>
          <div style={{ fontSize: 34 }}>{selectedKind?.icon}</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text-sub)', margin: 0 }}>
            Setting the stone…
          </p>
        </div>
        <style>{`
          @keyframes stoneSet {
            0% { opacity: 0; transform: scale(0.96); }
            30% { opacity: 1; transform: scale(1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>{selectedKind?.icon}</div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-rose)', marginTop: 4 }}>
            {selectedKind?.label}
          </div>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional — we'll generate one from your entry)"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontWeight: 500, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
        />
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened? What is this stone marking?"
          style={{ minHeight: 130, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.7, background: 'var(--card-inner)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
        />
        <input
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          placeholder="Passage (optional)"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={setTheStone}
            disabled={!body.trim()}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-rose)', color: 'white', fontSize: 12, fontWeight: 700, cursor: body.trim() ? 'pointer' : 'default', opacity: body.trim() ? 1 : 0.55 }}
          >
            Set the Stone ✚
          </button>
        </div>
      </div>
    </div>
  );
}
