import { useState } from 'react';

// The sealing ceremony (VISION.md, Ring 2: "Sealed prayers... sits
// visibly on the path ahead — seen, not touchable"). Write it, choose how
// it opens, then a closing beat as it's sealed. No AI anywhere in this
// ceremony.

interface Props {
  onCancel: () => void;
  onComplete: (details: { title: string; body: string; unsealAt?: string; eventLabel?: string }) => void;
}

export default function SealedPrayerCeremony({ onCancel, onComplete }: Props) {
  const [stage, setStage] = useState<'writing' | 'choosing' | 'sealing'>('writing');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [unlockMode, setUnlockMode] = useState<'date' | 'event'>('date');
  const [unsealAt, setUnsealAt] = useState('');
  const [eventLabel, setEventLabel] = useState('');

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: 24,
  };
  const panel: React.CSSProperties = {
    width: 'min(520px, 100%)', background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', padding: '32px 28px',
    display: 'grid', gap: 16,
  };

  const canChoose = unlockMode === 'date' ? Boolean(unsealAt) : Boolean(eventLabel.trim());

  const seal = () => {
    setStage('sealing');
    window.setTimeout(() => {
      onComplete({
        title: title.trim() || 'A Sealed Prayer',
        body: body.trim(),
        unsealAt: unlockMode === 'date' ? unsealAt : undefined,
        eventLabel: unlockMode === 'event' ? eventLabel.trim() : undefined,
      });
    }, 1400);
  };

  if (stage === 'writing') {
    return (
      <div style={overlay}>
        <div style={panel}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-slate)' }}>
            Sealing a Prayer
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0 }}>
            Write it for who you'll be, or who they'll be, when it's opened.
          </p>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A label (optional — visible while it's sealed, e.g. 'For Sarah's wedding')"
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontWeight: 500, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
          />
          <textarea
            autoFocus
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What do you want to say — to them, or to yourself, when this is opened?"
            style={{ minHeight: 150, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.7, background: 'var(--card-inner)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => setStage('choosing')}
              disabled={!body.trim()}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-slate)', color: 'white', fontSize: 12, fontWeight: 700, cursor: body.trim() ? 'pointer' : 'default', opacity: body.trim() ? 1 : 0.55 }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'choosing') {
    return (
      <div style={overlay}>
        <div style={panel}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-slate)' }}>
            How Should It Open?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setUnlockMode('date')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${unlockMode === 'date' ? 'var(--accent-slate)' : 'var(--border)'}`, background: unlockMode === 'date' ? 'var(--accent-slate-light)' : 'transparent', color: unlockMode === 'date' ? 'var(--accent-slate)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              On a date
            </button>
            <button
              onClick={() => setUnlockMode('event')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${unlockMode === 'event' ? 'var(--accent-slate)' : 'var(--border)'}`, background: unlockMode === 'event' ? 'var(--accent-slate-light)' : 'transparent', color: unlockMode === 'event' ? 'var(--accent-slate)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              When something happens
            </button>
          </div>
          {unlockMode === 'date' ? (
            <input
              type="date"
              value={unsealAt}
              onChange={(event) => setUnsealAt(event.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
            />
          ) : (
            <input
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
              placeholder="e.g. 'when she gets married' or 'when I finally understand this season'"
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={seal}
              disabled={!canChoose}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-slate)', color: 'white', fontSize: 12, fontWeight: 700, cursor: canChoose ? 'pointer' : 'default', opacity: canChoose ? 1 : 0.55 }}
            >
              Seal It 🔒
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={{ ...panel, textAlign: 'center', animation: 'sealClose 1.4s ease' }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text-sub)', margin: 0 }}>
          Sealing it…
        </p>
      </div>
      <style>{`
        @keyframes sealClose {
          0% { opacity: 0; transform: scale(0.96); }
          30% { opacity: 1; transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
