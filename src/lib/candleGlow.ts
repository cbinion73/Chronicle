import type { CSSProperties } from 'react';

// The candle-glow treatment — DESIGN.md's Chapel rule made literal:
// "the default register is darkness, because in this room light is
// meaning" (direction-chapel.html). Reserved for the one thing on a
// Chapel page that is actually lit: an answered prayer, a resolved
// question, a kept lament, a remembrance, a verse held in the mind
// right now. Built to direction-chapel.html's .remembrance spec — a
// soft radial wash plus a three-layer box-shadow glow, not a flat
// highlight — and shared so every Chapel page lights its candle the
// same way.
export function candleGlowStyle(extra?: CSSProperties): CSSProperties {
  return {
    border: '1px solid rgba(232,180,79,0.45)',
    borderRadius: 3,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(232,180,79,0.13) 0%, rgba(232,180,79,0.03) 60%, transparent 100%)',
    boxShadow: '0 0 40px rgba(232,180,79,0.18), 0 0 90px rgba(232,180,79,0.10), inset 0 0 30px rgba(232,180,79,0.06)',
    ...extra,
  };
}

// A smaller-radius variant for list rows / inline cards, where the full
// 40-90px throw of the primary glow would overpower neighboring rows.
export function candleGlowRowStyle(extra?: CSSProperties): CSSProperties {
  return {
    border: '1px solid rgba(232,180,79,0.4)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(232,180,79,0.10) 0%, rgba(232,180,79,0.02) 65%, transparent 100%)',
    boxShadow: '0 0 18px rgba(232,180,79,0.16), 0 0 40px rgba(232,180,79,0.08)',
    ...extra,
  };
}

export const CANDLE_FLAME_TEXT_STYLE: CSSProperties = {
  color: '#f5d489',
  textShadow: '0 0 14px rgba(245,212,137,0.9), 0 0 34px rgba(232,180,79,0.6)',
};
