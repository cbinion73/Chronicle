import candleHeroShot from '../../assets/candle-hero-shot.png';

interface PhotoCandleProps {
  width?: number;
  phase?: 'burning' | 'igniting' | 'extinguishing';
}

export default function PhotoCandle({ width = 220, phase = 'burning' }: PhotoCandleProps) {
  const opacity = phase === 'igniting' ? 0.92 : phase === 'extinguishing' ? 0.4 : 1;
  const scale = phase === 'igniting' ? 0.97 : phase === 'extinguishing' ? 0.94 : 1;
  const blur = phase === 'extinguishing' ? '0.8px' : '0px';

  return (
    <div
      style={{
        width,
        aspectRatio: '1 / 1',
        display: 'block',
        opacity,
        transform: `scale(${scale})`,
        filter: `blur(${blur})`,
        transition: phase === 'burning'
          ? 'opacity 1.2s ease, transform 1.2s ease, filter 1.2s ease'
          : 'opacity 2.3s ease, transform 2.3s ease, filter 2.3s ease',
      }}
      aria-hidden="true"
    >
      <img
        src={candleHeroShot}
        alt="A lit prayer candle"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          WebkitMaskImage: 'radial-gradient(circle at 50% 48%, black 26%, rgba(0, 0, 0, 0.94) 44%, rgba(0, 0, 0, 0.72) 56%, transparent 78%)',
          maskImage: 'radial-gradient(circle at 50% 48%, black 26%, rgba(0, 0, 0, 0.94) 44%, rgba(0, 0, 0, 0.72) 56%, transparent 78%)',
        }}
      />
    </div>
  );
}
