import { useNavigate } from 'react-router-dom';
import { callOfTheDay } from '../data/callsToWorship';

// Chapel mode (VISION.md, M11: "the more sacred the moment, the less
// technology in the room"). One verse. No chrome — no sidebar, no topbar,
// no AI companion, nothing to tap but the way out. Rendered as a sibling
// route outside AppShell (see App.tsx) specifically so it can be truly
// full-bleed. No AI anywhere in this room, by design.

export default function Chapel() {
  const navigate = useNavigate();
  const call = callOfTheDay();

  return (
    <div
      onClick={() => navigate(-1)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') navigate(-1);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        cursor: 'pointer',
      }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(20px, 4vw, 30px)',
          fontStyle: 'italic',
          color: 'var(--text)',
          lineHeight: 1.8,
          margin: 0,
        }}>
          "{call.text}"
        </p>
        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {call.ref}
        </div>
      </div>
    </div>
  );
}
