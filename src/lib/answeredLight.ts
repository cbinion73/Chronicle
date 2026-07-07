// The Answered Light — connecting years of "asked" to "answered." Per the
// rebuild vision, this is meant to be one of the most spiritually
// significant screens in the product: the documented memory of God's past
// faithfulness, which Scripture itself commands the practice of keeping
// (Deuteronomy 8:2, Psalm 77:11). Pure derivation here; the page renders it.

import type { PrayerItem } from '../types';

export interface AnsweredLightEntry {
  id: string;
  text: string;
  category: PrayerItem['category'];
  dateAdded: string;
  dateAnswered: string;
  answerSummary?: string;
  answerPassage?: string;
  timesPrayed: number;
  daysCarried: number;
}

export function deriveAnsweredLight(prayerItems: PrayerItem[]): AnsweredLightEntry[] {
  return prayerItems
    .filter((item): item is PrayerItem & { dateAnswered: string } => Boolean(item.answered && item.dateAnswered))
    .map((item) => ({
      id: item.id,
      text: item.text,
      category: item.category,
      dateAdded: item.dateAdded,
      dateAnswered: item.dateAnswered,
      answerSummary: item.answerSummary,
      answerPassage: item.answerPassage,
      timesPrayed: item.timesPrayed || 0,
      daysCarried: Math.max(0, Math.round(
        (new Date(`${item.dateAnswered}T12:00:00`).getTime() - new Date(`${item.dateAdded}T12:00:00`).getTime()) / 86400000,
      )),
    }))
    .sort((a, b) => (a.dateAnswered < b.dateAnswered ? 1 : -1));
}

export function formatCarried(days: number): string {
  if (days <= 0) return 'answered the same day';
  if (days === 1) return 'carried for 1 day';
  if (days < 30) return `carried for ${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `carried for ${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.round((days % 365) / 30);
  const yearPart = `${years} year${years === 1 ? '' : 's'}`;
  return remainingMonths > 0
    ? `carried for ${yearPart}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
    : `carried for ${yearPart}`;
}

export function groupByYear(entries: AnsweredLightEntry[]): Array<{ year: string; entries: AnsweredLightEntry[] }> {
  const groups = new Map<string, AnsweredLightEntry[]>();
  for (const entry of entries) {
    const year = entry.dateAnswered.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(entry);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([year, yearEntries]) => ({ year, entries: yearEntries }));
}
