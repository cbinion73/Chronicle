// The Scripture Memory Engine — spaced repetition for memorized verses.
//
// An SM-2-family algorithm (the same family behind Anki/SuperMemo): each
// review grades recall on a 0-5 quality scale, and the next interval grows
// geometrically for verses that are held, or resets for verses that are lost.
// This is deliberately the highest formation-value-per-engineering-hour
// feature in the whole rebuild — it needs no AI, just an honest schedule.

import type { MemoryVerse } from '../types';

export type RecallQuality = 'struggled' | 'good' | 'easy';

const QUALITY_SCORE: Record<RecallQuality, number> = {
  struggled: 2,
  good: 4,
  easy: 5,
};

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function reviewVerse(verse: MemoryVerse, quality: RecallQuality, today: string): MemoryVerse {
  const q = QUALITY_SCORE[quality];
  const lapsed = q < 3;

  const repetitions = lapsed ? 0 : verse.repetitions + 1;
  let intervalDays: number;
  if (lapsed) {
    intervalDays = 1;
  } else if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(verse.intervalDays * verse.easeFactor);
  }

  const easeFactor = Math.max(
    1.3,
    verse.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  return {
    ...verse,
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    dueDate: addDays(today, intervalDays),
    lastReviewedAt: today,
    totalReviews: verse.totalReviews + 1,
    totalLapses: verse.totalLapses + (lapsed ? 1 : 0),
  };
}

export function isDue(verse: MemoryVerse, today: string): boolean {
  return verse.dueDate <= today;
}

export function dueVerses(verses: MemoryVerse[], today: string): MemoryVerse[] {
  return verses.filter((verse) => isDue(verse, today)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

export function createMemoryVerse(input: { reference: string; text: string; translation: string }, today: string): MemoryVerse {
  return {
    id: Math.random().toString(36).slice(2),
    reference: input.reference,
    text: input.text,
    translation: input.translation,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: today,
    totalReviews: 0,
    totalLapses: 0,
    addedAt: today,
  };
}

// First-letter recall prompt: turns "For God so loved the world" into
// "F G s l t w" so a reviewer can self-test before revealing the full text.
export function firstLetterPrompt(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      const match = word.match(/^[A-Za-z]/);
      return match ? `${match[0]}${word.replace(/^[A-Za-z]+/, '').match(/[^A-Za-z]*$/)?.[0] || ''}` : word;
    })
    .join(' ');
}
