import { useEffect, useRef, useState } from 'react';
import type { PrayerItem } from '../../types';

// The answered-prayer ceremony (VISION.md: "ceremony over CRUD"). Marking a
// prayer answered is one of the handful of sacred moments in this product —
// it should not pass through the same modal used to fix a typo. The request
// visibly moves into the light, a beat of stillness is kept, and the
// answer is written as the closing act. Editing an already-answered
// prayer's record (not the transition itself) skips straight to writing —
// the ceremony belongs to the moment of answering, not to later edits.

const STILLNESS_SECONDS = 8;

interface Props {
  item: PrayerItem;
  onCancel: () => void;
  onSave: (summary: string, passage: string) => void;
}

export default function AnsweredPrayerCeremony({ item, onCancel, onSave }: Props) {
  const [stage, setStage] = useState<'moving' | 'stillness' | 'writing'>(item.answered ? 'writing' : 'moving');
  const [stillnessLeft, setStillnessLeft] = useState(STILLNESS_SECONDS);
  const [summary, setSummary] = useState(item.answerSummary || '');
  const [passage, setPassage] = useState(item.answerPassage || '');
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
    display: 'grid', gap: 16, textAlign: 'center',
  };

  if (stage === 'moving') {
    return (
      <div style={overlay}>
        <div style={panel}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>
            Answered Prayer
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.7, margin: '8px 0' }}>
            "{item.text}"
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0 }}>
            This request is about to move into the light.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Not yet
            </button>
            <button onClick={() => setStage('stillness')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Let it move into the light →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'stillness') {
    return (
      <div style={overlay}>
        <div style={panel}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {stillnessLeft}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden', maxWidth: 220, margin: '0 auto' }}>
            <div style={{ width: `${((STILLNESS_SECONDS - stillnessLeft) / STILLNESS_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: 0, fontStyle: 'italic' }}>
            Sit with what God has done.
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
      <div style={{ ...panel, textAlign: 'left' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {item.answered ? 'Edit the Answer' : 'Answered Prayer'}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.text}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>What happened?</div>
          <textarea
            autoFocus
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write the answer, provision, clarity, or change Chronicle should remember."
            style={{ width: '100%', minHeight: 110, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Supporting passage (optional)</div>
          <input
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder="Philippians 4:19"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(summary, passage)}
            disabled={!summary.trim()}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: summary.trim() ? 'pointer' : 'default', opacity: summary.trim() ? 1 : 0.55 }}
          >
            {item.answered ? 'Save Changes' : 'Seal It in the Light ✚'}
          </button>
        </div>
      </div>
    </div>
  );
}
