import { useEffect, useRef, useState } from 'react';
import { daysOpen, formatOpenDuration } from '../../lib/questionLab';

// The resolution ceremony (ROADMAP M17: "when one resolves after eleven
// years, that is a ceremony, and it is a stone"). Review how long the
// question has been carried, a short stillness beat, then write what
// changed. No AI anywhere in this ceremony.

const STILLNESS_SECONDS = 8;

interface Props {
  questionText: string;
  dateAdded: string;
  onCancel: () => void;
  onComplete: (resolution: string) => void;
}

export default function QuestionResolutionCeremony({ questionText, dateAdded, onCancel, onComplete }: Props) {
  const [stage, setStage] = useState<'reviewing' | 'stillness' | 'writing'>('reviewing');
  const [stillnessLeft, setStillnessLeft] = useState(STILLNESS_SECONDS);
  const [resolution, setResolution] = useState('');
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
    width: 'min(520px, 100%)', background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', padding: '32px 28px',
    display: 'grid', gap: 16,
  };

  if (stage === 'reviewing') {
    return (
      <div style={overlay}>
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-copper)' }}>
            This Question Is Resolving
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.7, margin: '8px 0' }}>
            "{questionText}"
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0 }}>
            {formatOpenDuration(daysOpen(dateAdded))} — carried this long, and now something has changed.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Not yet
            </button>
            <button onClick={() => setStage('stillness')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-copper)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
            <div style={{ width: `${((STILLNESS_SECONDS - stillnessLeft) / STILLNESS_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-copper)', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0, fontStyle: 'italic' }}>
            What changed?
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-copper)' }}>
            What Changed?
          </div>
        </div>
        <textarea
          autoFocus
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          placeholder="Write what you now know, or how the question itself has changed. This becomes the stone."
          style={{ minHeight: 150, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.7, background: 'var(--card-inner)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onComplete(resolution)}
            disabled={!resolution.trim()}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-copper)', color: 'white', fontSize: 12, fontWeight: 700, cursor: resolution.trim() ? 'pointer' : 'default', opacity: resolution.trim() ? 1 : 0.55 }}
          >
            Set the Stone ✚
          </button>
        </div>
      </div>
    </div>
  );
}
