import type { ReactNode } from 'react';
import { CARD_STYLE } from './cardStyle';

// The card shell, extracted from three near-identical hand-rolled copies
// (Milestones 6/7/9: AnsweredLight, GrowthMarkers, Office). Part of the
// Quiet Pass (VISION.md, M11) — one shared shape instead of three drifting
// ones.

interface CardProps {
  children: ReactNode;
  padding?: string;
  accent?: string;
  style?: React.CSSProperties;
}

export default function Card({ children, padding, accent, style }: CardProps) {
  return (
    <div
      style={{
        ...CARD_STYLE,
        border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}`,
        padding: padding ?? '18px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface EmptyCardProps {
  children: ReactNode;
}

export function EmptyCard({ children }: EmptyCardProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        background: 'var(--card-bg)',
        border: '1px dashed var(--border)',
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  );
}
