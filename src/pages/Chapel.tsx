import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { randomCall } from '../data/callsToWorship';
import chapelStyles from '../styles/chapelRegister.module.css';
import PhotoCandle from '../components/ui/PhotoCandle';

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
//
// A full "prayer session lifecycle" (light on entry, extinguish on
// exit) rather than an instant cut: the room opens on darkness, the
// candle grows into flame, only then does the verse fade in; leaving
// narrows and extinguishes the flame with a rising wisp of smoke
// before the screen goes back to whatever page was behind it.
//
// While burning, the verse itself drifts — a slow crossfade to a
// different verse from Chapel's contemplative pool every CYCLE_MS,
// the way attention itself moves during silent prayer rather than
// fixing on one line the whole sitting.

const IGNITE_MS = 2600;
const EXTINGUISH_MS = 2300;
const CYCLE_MS = 26000;
const CYCLE_FADE_MS = 1200;

export default function Chapel() {
  const navigate = useNavigate();
  const [call, setCall] = useState(() => randomCall());
  const [phase, setPhase] = useState<'igniting' | 'burning' | 'extinguishing'>('igniting');
  const [cycling, setCycling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setPhase('burning'), IGNITE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Once the candle is lit, drift to a new verse every CYCLE_MS: fade
  // the current one out, swap it while invisible, fade the next one in.
  useEffect(() => {
    if (phase !== 'burning') return;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setCycling(true);
      fadeTimeout = setTimeout(() => {
        setCall((current) => randomCall(current.ref));
        setCycling(false);
      }, CYCLE_FADE_MS);
    }, CYCLE_MS);
    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [phase]);

  const leave = () => {
    if (phase === 'extinguishing') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('extinguishing');
    timerRef.current = setTimeout(() => navigate(-1), EXTINGUISH_MS);
  };

  const verseVisible = phase === 'burning' && !cycling;

  return (
    <div
      className={chapelStyles.chapelRegister}
      onClick={leave}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') leave();
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
          <PhotoCandle width={300} phase={phase} />
        </div>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(20px, 4vw, 30px)',
          fontStyle: 'italic',
          color: 'var(--text)',
          lineHeight: 1.8,
          margin: 0,
          opacity: verseVisible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}>
          "{call.text}"
        </p>
        <div style={{
          marginTop: 20, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em',
          opacity: verseVisible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}>
          {call.ref}
        </div>
      </div>
    </div>
  );
}
