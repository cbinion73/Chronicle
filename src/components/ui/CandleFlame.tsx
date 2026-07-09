import { useId } from 'react';
import s from './CandleFlame.module.css';

// A lit candle, rendered rather than described — Chapel's "light is
// meaning" rule (direction-chapel.html) made into an actual object for
// the room's few genuinely meditative moments (Remembrance, a kept
// lament, an active minute of silence, entering Chapel itself). Color
// grading and motion follow a brief written for a photoreal/motion-
// graphics render (2200K warm gradient: blue base, white-hot center,
// golden body, faint amber tip; independent low-amplitude sway/flicker/
// halo/ember layers) translated as closely as CSS/SVG can reach —
// there is no 3D render pipeline in this codebase, so this is the
// living, in-app version of that spec rather than the literal PNG/
// video deliverables it also asked for.
//
// `phase` drives the two one-shot lifecycle animations a full "prayer
// session" wants (see Chapel.tsx): 'igniting' grows the flame from
// nothing over ~2.6s, 'extinguishing' narrows/leans/fades it plus a
// rising smoke wisp over ~2.3s. Every other usage just passes the
// default 'burning', which is the original always-lit steady state.
//
// `flameOnly` drops the CSS wax body/pool/wick/aura entirely, leaving
// just the animated flame + wick-ember glow — for compositing over
// PhotoCandle's real photographed candle instead of this component's
// own hand-drawn one. `widthPx` overrides the size presets with an
// exact pixel width, needed there to line the flame up with a real
// wick at whatever size the photo is rendered.
interface CandleFlameProps {
  size?: 'sm' | 'md' | 'lg';
  widthPx?: number;
  withBody?: boolean;
  flameOnly?: boolean;
  phase?: 'burning' | 'igniting' | 'extinguishing';
}

const SIZES: Record<NonNullable<CandleFlameProps['size']>, { w: number; bodyH: number }> = {
  sm: { w: 20, bodyH: 18 },
  md: { w: 30, bodyH: 28 },
  lg: { w: 40, bodyH: 40 },
};

export default function CandleFlame({ size = 'md', widthPx, withBody = false, flameOnly = false, phase = 'burning' }: CandleFlameProps) {
  const id = useId().replace(/:/g, '');
  const w = widthPx ?? SIZES[size].w;
  const bodyH = SIZES[size].bodyH;
  const phaseClass = phase === 'igniting' ? s.igniting : phase === 'extinguishing' ? s.extinguishing : '';
  const outerGradientId = `${id}-outerGradient`;
  const outerGlowId = `${id}-outerGlow`;
  const coreGradientId = `${id}-coreGradient`;
  const coreGlowId = `${id}-coreGlow`;
  const baseGradientId = `${id}-baseGradient`;
  const flamePath = 'M36 5C48 11 57 28 57 49C57 63 52 79 56 96C60 115 50 139 36 173C23 141 12 116 16 96C20 79 15 63 15 49C15 28 24 11 36 5Z';
  const corePath = 'M36 28C44 35 48 50 47 68C46 84 41 103 36 134C31 103 26 84 25 68C24 50 28 35 36 28Z';
  return (
    <div
      className={[s.candle, flameOnly ? s.photoComposite : '', phaseClass].filter(Boolean).join(' ')}
      style={{ '--candle-w': `${w}px`, '--candle-body-h': `${bodyH}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      {!flameOnly && <div className={s.aura} />}
      <div className={s.flameWrap}>
        <div className={s.flameCore}>
          <svg className={s.flameSvg} viewBox="0 0 72 180" aria-hidden="true">
            <defs>
              <linearGradient id={outerGradientId} x1="36" y1="8" x2="36" y2="173" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(246, 176, 88, 0.72)" />
                <stop offset="16%" stopColor="rgba(255, 204, 120, 0.92)" />
                <stop offset="42%" stopColor="#fff8eb" />
                <stop offset="68%" stopColor="#f4bb58" />
                <stop offset="84%" stopColor="rgba(225, 146, 63, 0.9)" />
                <stop offset="100%" stopColor="rgba(88, 130, 224, 0.72)" />
              </linearGradient>
              <radialGradient id={outerGlowId} cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="rgba(255, 244, 212, 0.92)" />
                <stop offset="45%" stopColor="rgba(249, 201, 112, 0.42)" />
                <stop offset="100%" stopColor="rgba(249, 201, 112, 0)" />
              </radialGradient>
              <linearGradient id={coreGradientId} x1="36" y1="28" x2="36" y2="136" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 247, 224, 0.75)" />
                <stop offset="28%" stopColor="#fffdf8" />
                <stop offset="65%" stopColor="rgba(255, 237, 186, 0.95)" />
                <stop offset="100%" stopColor="rgba(135, 185, 255, 0.42)" />
              </linearGradient>
              <radialGradient id={coreGlowId} cx="50%" cy="45%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                <stop offset="70%" stopColor="rgba(255, 239, 194, 0.22)" />
                <stop offset="100%" stopColor="rgba(255, 239, 194, 0)" />
              </radialGradient>
              <radialGradient id={baseGradientId} cx="50%" cy="55%" r="60%">
                <stop offset="0%" stopColor="rgba(180, 216, 255, 0.95)" />
                <stop offset="50%" stopColor="rgba(104, 148, 233, 0.86)" />
                <stop offset="100%" stopColor="rgba(104, 148, 233, 0)" />
              </radialGradient>
            </defs>
            <ellipse className={s.outerGlowShape} cx="36" cy="86" rx="27" ry="64" fill={`url(#${outerGlowId})`} />
            <path className={s.flameBody} d={flamePath} fill={`url(#${outerGradientId})`} />
            <ellipse className={s.innerGlowShape} cx="36" cy="78" rx="15" ry="40" fill={`url(#${coreGlowId})`} />
            <path className={s.flameInner} d={corePath} fill={`url(#${coreGradientId})`} />
            <ellipse className={s.flameBase} cx="36" cy="151" rx="9" ry="12" fill={`url(#${baseGradientId})`} />
          </svg>
        </div>
        <div className={s.wickGlow} />
        {!flameOnly && <div className={s.wick} />}
      </div>
      {phase === 'extinguishing' && <div className={s.smoke} />}
      {withBody && !flameOnly && (
        <>
          <div className={s.pool} />
          <div className={s.poolShimmer} />
          <div className={s.body} />
        </>
      )}
    </div>
  );
}
