import candleHeroShot from '../../assets/candle-hero-shot.png';
import s from './PhotoCandle.module.css';

interface PhotoCandleProps {
  width?: number;
  phase?: 'burning' | 'igniting' | 'extinguishing';
}

export default function PhotoCandle({ width = 220, phase = 'burning' }: PhotoCandleProps) {
  const phaseClass = phase === 'igniting' ? s.igniting : phase === 'extinguishing' ? s.extinguishing : '';

  return (
    <div
      className={[s.frame, phaseClass].filter(Boolean).join(' ')}
      style={{ '--photo-candle-w': `${width}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={s.halo} />
      <div className={s.heroShell}>
        <img className={s.heroBody} src={candleHeroShot} alt="A lit prayer candle" />
        <div className={s.flamePatch} />
        <div className={s.flameLayer}>
          <img className={s.flameImage} src={candleHeroShot} alt="" />
        </div>
      </div>
    </div>
  );
}
