import type { ReactNode } from 'react';

// The pill/badge shell, extracted from three near-identical hand-rolled
// copies (Milestones 6/7/9). Part of the Quiet Pass (VISION.md, M11).

interface BadgeProps {
  children: ReactNode;
  color: string;
}

export default function Badge({ children, color }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        background: `${color}18`,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}

interface TimelineDotProps {
  color: string;
}

export function TimelineDot({ color }: TimelineDotProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: -26,
        top: 4,
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color,
        border: '2px solid var(--bg)',
      }}
    />
  );
}
