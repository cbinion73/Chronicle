import s from './CandleFlame.module.css';

// A lit candle, rendered rather than described — Chapel's "light is
// meaning" rule (direction-chapel.html) made into an actual object for
// the room's few genuinely meditative moments (Remembrance, a kept
// lament, an active minute of silence). Two independently-timed
// animations (a slow body sway, a faster inner flicker) keep the loop
// from reading as mechanically perfect; prefers-reduced-motion holds it
// still. Not a candle icon standing in for the glow — the physical
// object src/lib/candleGlow.ts's box-shadow language has been
// implying all along.
interface CandleFlameProps {
  size?: 'sm' | 'md' | 'lg';
  withBody?: boolean;
}

const SIZES: Record<NonNullable<CandleFlameProps['size']>, { w: number; bodyH: number }> = {
  sm: { w: 20, bodyH: 18 },
  md: { w: 30, bodyH: 28 },
  lg: { w: 40, bodyH: 40 },
};

export default function CandleFlame({ size = 'md', withBody = false }: CandleFlameProps) {
  const { w, bodyH } = SIZES[size];
  return (
    <div
      className={s.candle}
      style={{ '--candle-w': `${w}px`, '--candle-body-h': `${bodyH}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={s.aura} />
      <div className={s.flameWrap}>
        <div className={s.flameCore}>
          <div className={s.flameShape} />
        </div>
        <div className={s.wick} />
      </div>
      {withBody && (
        <>
          <div className={s.pool} />
          <div className={s.body} />
        </>
      )}
    </div>
  );
}
