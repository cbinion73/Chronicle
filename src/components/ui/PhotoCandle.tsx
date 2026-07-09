import candleHero from '../../assets/candle-hero.png';
import CandleFlame from './CandleFlame';

// The real candle: a photographed hero image (supplied directly, not
// rendered) with the animated CandleFlame composited on top, anchored
// to the actual wick. The image's own wick tip sits at (49.95%, 29.56%)
// of its frame — measured by scanning the source photo for the wick's
// near-black pixels — so the flame's base lines up with it exactly
// regardless of how large PhotoCandle is rendered.
const WICK_X_PCT = 49.95;
const WICK_TOP_Y_PCT = 29.56;
const IMAGE_ASPECT = 960 / 640; // height / width, from the source photo

interface PhotoCandleProps {
  width?: number;
  phase?: 'burning' | 'igniting' | 'extinguishing';
}

export default function PhotoCandle({ width = 220, phase = 'burning' }: PhotoCandleProps) {
  const height = Math.round(width * IMAGE_ASPECT);
  // Against the real photo, the flame needs to read as a tiny hot
  // teardrop at the wick rather than a freestanding icon. The wax
  // cylinder is roughly 47% of the frame width; keeping the flame near
  // one-tenth of that diameter matches the supplied photo reference.
  const flameWidthPx = Math.max(11, Math.round(width * 0.47 * 0.115));

  return (
    <div style={{ position: 'relative', width, height }}>
      <img
        src={candleHero}
        alt="A lit prayer candle"
        style={{
          width: '100%', height: '100%', objectFit: 'contain', display: 'block',
          // The source photo's own vignette is a slightly lighter near-
          // black than Chapel's --bg, so its square frame edge shows as
          // a visible rectangle against the room. Fading the image to
          // transparent at its edges lets the room's actual background
          // show through instead, so only the candle's glow reads.
          WebkitMaskImage: 'radial-gradient(ellipse 62% 60% at 50% 42%, black 50%, transparent 90%)',
          maskImage: 'radial-gradient(ellipse 62% 60% at 50% 42%, black 50%, transparent 90%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${WICK_X_PCT}%`,
          top: `${WICK_TOP_Y_PCT}%`,
          transform: 'translate(-50%, -88%)',
        }}
      >
        <CandleFlame widthPx={flameWidthPx} flameOnly phase={phase} />
      </div>
    </div>
  );
}
