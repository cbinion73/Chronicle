import type { BibleVisit } from '../types';

// Patina (VISION.md, Ring 2): "a physical Bible falls open at the loved
// pages; the corners of Psalm 23 go soft from forty years of handling."
// Pure derivation over a distinct-day visit log — no AI, no judgment,
// just where you've actually lived.

// 20 distinct days of return is treated as full patina. Arbitrary but
// deliberately high: this should read as "worn from years," not from a
// single enthusiastic week.
const FULL_PATINA_VISITS = 20;

export interface PatinaLevel {
  visitCount: number;
  intensity: number; // 0 (never visited) to 1 (fully worn)
}

export function derivePatina(visits: BibleVisit[], book: string, chapter: number): PatinaLevel {
  const visitCount = visits.filter((visit) => visit.book === book && visit.chapter === chapter).length;
  const intensity = Math.min(1, visitCount / FULL_PATINA_VISITS);
  return { visitCount, intensity };
}
