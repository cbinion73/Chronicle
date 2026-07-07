// The Thread — Chronicle's unified read model.
//
// Phase 1 of the rebuild: one derived timeline over the existing stores
// (chronicle entries + prayer lifecycle events) so every surface can read
// a single spine without a physical table migration. When the domain model
// stabilizes, this shape becomes the schema (Milestone 2).

import type { ChronicleEntry, PrayerItem } from '../types';

export type ThreadEventKind =
  | 'entry'            // a chronicle entry of any type
  | 'prayer-added'     // a request began being carried
  | 'prayer-answered'; // a request was marked answered

export type ThreadEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: ThreadEventKind;
  /** The entry type for kind==='entry' (insight/prayer/study/note/reflection). */
  entryType?: ChronicleEntry['type'];
  title: string;
  body?: string;
  passage?: string;
  sourceId: string;
};

export function deriveThreadEvents(
  entries: ChronicleEntry[],
  prayers: PrayerItem[],
): ThreadEvent[] {
  const events: ThreadEvent[] = [];

  for (const entry of entries) {
    events.push({
      id: `entry:${entry.id}`,
      date: entry.date,
      kind: 'entry',
      entryType: entry.type,
      title: entry.title,
      body: entry.body,
      passage: entry.passage,
      sourceId: entry.id,
    });
  }

  for (const prayer of prayers) {
    events.push({
      id: `prayer-added:${prayer.id}`,
      date: prayer.dateAdded,
      kind: 'prayer-added',
      title: prayer.text,
      sourceId: prayer.id,
    });
    if (prayer.answered && prayer.dateAnswered) {
      events.push({
        id: `prayer-answered:${prayer.id}`,
        date: prayer.dateAnswered,
        kind: 'prayer-answered',
        title: prayer.text,
        body: prayer.answerSummary,
        passage: prayer.answerPassage,
        sourceId: prayer.id,
      });
    }
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function summarizeThread(events: ThreadEvent[]) {
  const dates = new Set(events.map((event) => event.date));
  const firstDate = events.length ? events[events.length - 1].date : null;
  const answered = events.filter((event) => event.kind === 'prayer-answered').length;
  return {
    totalEvents: events.length,
    activeDays: dates.size,
    firstDate,
    answeredPrayers: answered,
  };
}
