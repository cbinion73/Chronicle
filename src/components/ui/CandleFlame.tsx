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
  const w = widthPx ?? SIZES[size].w;
  const bodyH = SIZES[size].bodyH;
  const phaseClass = phase === 'igniting' ? s.igniting : phase === 'extinguishing' ? s.extinguishing : '';
  return (
    <div
      className={[s.candle, phaseClass].filter(Boolean).join(' ')}
      style={{ '--candle-w': `${w}px`, '--candle-body-h': `${bodyH}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      {!flameOnly && <div className={s.aura} />}
      <div className={s.flameWrap}>
        <div className={s.flameCore}>
          <div className={s.flameShape} />
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
