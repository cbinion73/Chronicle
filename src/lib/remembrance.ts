import type { ChronicleEntry, PrayerItem } from '../types';
import { getGrowthMarkerKind } from '../data/growthMarkers';

// Remembrance (VISION.md, Ring 2): "the church gave us Advent and Easter;
// your thread generates a second calendar." On-this-day resurfacing and
// personal feast days, derived purely from data the thread already holds
// — no new fields, no new tables. Unprompted: most days this returns
// nothing, and the Office shows nothing extra.

export interface Remembrance {
  id: string;
  kind: 'growth' | 'answered-prayer' | 'entry';
  title: string;
  body?: string;
  passage?: string;
  date: string;
  yearsAgo: number;
}

function monthDay(dateStr: string): string {
  return dateStr.slice(5, 10); // 'YYYY-MM-DD' -> 'MM-DD'
}

function yearsAgo(dateStr: string, today: Date): number {
  return today.getUTCFullYear() - Number(dateStr.slice(0, 4));
}

export function formatAnniversary(years: number): string {
  if (years <= 0) return 'today';
  if (years === 1) return '1 year ago today';
  return `${years} years ago today`;
}

export function deriveOnThisDay(
  entries: ChronicleEntry[],
  prayerItems: PrayerItem[],
  today: Date = new Date(),
): Remembrance[] {
  // Dates throughout Chronicle are stored as UTC-normalized YYYY-MM-DD
  // strings (via toISOString()), so "today" must be read the same way —
  // local getters would drift by a day near local-midnight/UTC-midnight.
  const todayMonthDay = `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const memories: Remembrance[] = [];

  for (const entry of entries) {
    const years = yearsAgo(entry.date, today);
    if (years <= 0 || monthDay(entry.date) !== todayMonthDay) continue;
    if (entry.type === 'growth') {
      const kind = getGrowthMarkerKind(entry.sourceContext?.growthMarker?.kind);
      memories.push({
        id: entry.id, kind: 'growth', title: `${kind.icon} ${kind.label} — ${entry.title}`,
        body: entry.body, passage: entry.passage, date: entry.date, yearsAgo: years,
      });
    } else {
      memories.push({
        id: entry.id, kind: 'entry', title: entry.title, body: entry.body,
        passage: entry.passage, date: entry.date, yearsAgo: years,
      });
    }
  }

  for (const item of prayerItems) {
    if (!item.answered || !item.dateAnswered) continue;
    const years = yearsAgo(item.dateAnswered, today);
    if (years <= 0 || monthDay(item.dateAnswered) !== todayMonthDay) continue;
    memories.push({
      id: item.id, kind: 'answered-prayer', title: item.text, body: item.answerSummary,
      passage: item.answerPassage, date: item.dateAnswered, yearsAgo: years,
    });
  }

  return memories.sort((a, b) => b.yearsAgo - a.yearsAgo);
}

// Feast days are the subset worth naming specially — the deliberately
// marked milestones, not every ordinary journal entry that happens to
// share today's date.
export function isFeastDay(memory: Remembrance): boolean {
  return memory.kind === 'growth' || memory.kind === 'answered-prayer';
}
