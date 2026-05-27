import type { FormationRhythm } from '../types';

export function getTodayKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function getWeekKey(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isRhythmCompletedInCurrentPeriod(rhythm: FormationRhythm, date = new Date()) {
  const key = rhythm.cadence === 'daily' ? getTodayKey(date) : getWeekKey(date);
  return rhythm.completions.includes(key);
}

export function getRhythmCompletionKey(rhythm: FormationRhythm, date = new Date()) {
  return rhythm.cadence === 'daily' ? getTodayKey(date) : getWeekKey(date);
}

export function deriveRhythmStats(rhythms: FormationRhythm[], date = new Date()) {
  const completedNow = rhythms.filter((rhythm) => isRhythmCompletedInCurrentPeriod(rhythm, date)).length;
  const daily = rhythms.filter((rhythm) => rhythm.cadence === 'daily');
  const weekly = rhythms.filter((rhythm) => rhythm.cadence === 'weekly');
  const longestHistory = rhythms
    .slice()
    .sort((left, right) => right.completions.length - left.completions.length)[0];

  return {
    total: rhythms.length,
    completedNow,
    remainingNow: Math.max(0, rhythms.length - completedNow),
    dailyCompleted: daily.filter((rhythm) => isRhythmCompletedInCurrentPeriod(rhythm, date)).length,
    weeklyCompleted: weekly.filter((rhythm) => isRhythmCompletedInCurrentPeriod(rhythm, date)).length,
    strongestRhythm: longestHistory,
  };
}
