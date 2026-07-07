import { useEffect, useRef, useState } from 'react';

// The seasonal examen (VISION.md's Rule of Life): the Rule held up against
// the thread, and the quiet question — who are you becoming? — answered in
// writing. Three stages: reviewing the Rule as written, a short stillness
// beat, then the question itself. No AI anywhere in this ceremony.

const STILLNESS_SECONDS = 8;

interface Props {
  ruleItems: Array<{ text: string; category: string }>;
  onCancel: () => void;
  onComplete: (text: string) => void;
}

export default function SeasonalExamenCeremony({ ruleItems, onCancel, onComplete }: Props) {
  const [stage, setStage] = useState<'reviewing' | 'stillness' | 'writing'>('reviewing');
  const [stillnessLeft, setStillnessLeft] = useState(STILLNESS_SECONDS);
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stage !== 'stillness') return;
    timer.current = setInterval(() => {
      setStillnessLeft((left) => {
        if (left <= 1) {
          if (timer.current) clearInterval(timer.current);
          setStage('writing');
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [stage]);

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: 24,
  };
  const panel: React.CSSProperties = {
    width: 'min(560px, 100%)', background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', padding: '32px 28px',
    display: 'grid', gap: 16,
  };

  if (stage === 'reviewing') {
    return (
      <div style={overlay}>
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-forest)' }}>
            The Seasonal Examen
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0 }}>
            Here is the Rule you have written for yourself.
          </p>
          <div style={{ display: 'grid', gap: 8, textAlign: 'left', maxHeight: 260, overflowY: 'auto' }}>
            {ruleItems.map((item, i) => (
              <div key={i} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-forest)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                  {item.category}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{item.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Not yet
            </button>
            <button onClick={() => setStage('stillness')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-forest)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Sit with it →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'stillness') {
    return (
      <div style={overlay}>
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {stillnessLeft}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden', maxWidth: 220, margin: '0 auto' }}>
            <div style={{ width: `${((STILLNESS_SECONDS - stillnessLeft) / STILLNESS_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-forest)', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0, fontStyle: 'italic' }}>
            Who are you becoming?
          </p>
          <button onClick={() => setStage('writing')} style={{ justifySelf: 'center', padding: 0, border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-forest)' }}>
            Who Are You Becoming?
          </div>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Not what happened — who you are becoming. Where has the Rule shaped you this season? Where has it gone unkept, and why?"
          style={{ minHeight: 150, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.7, background: 'var(--card-inner)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onComplete(text)}
            disabled={!text.trim()}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-forest)', color: 'white', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.55 }}
          >
            Keep the Examen ✚
          </button>
        </div>
      </div>
    </div>
  );
}
