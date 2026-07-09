import { useNavigate } from 'react-router-dom';
import { callOfTheDay } from '../data/callsToWorship';
import chapelStyles from '../styles/chapelRegister.module.css';
import CandleFlame from '../components/ui/CandleFlame';

// Chapel mode (VISION.md, M11: "the more sacred the moment, the less
// technology in the room"). One verse, one candle. No chrome — no
// sidebar, no topbar, no AI companion, nothing to tap but the way out.
// Rendered as a sibling route outside AppShell (see App.tsx) specifically
// so it can be truly full-bleed. No AI anywhere in this room, by design.
//
// Wrapped in chapelRegister here (rather than inheriting it from an
// ancestor, since this route renders outside AppShell entirely) so the
// room stays Chapel's near-black/gold palette regardless of whatever
// light/dark theme is set in Settings — the one room that is never a
// toggle.

export default function Chapel() {
  const navigate = useNavigate();
  const call = callOfTheDay();

  return (
    <div
      className={chapelStyles.chapelRegister}
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <CandleFlame size="lg" withBody />
        </div>
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
