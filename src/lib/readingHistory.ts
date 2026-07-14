import type { ChronicleEntry } from '../types';
import { CANONICAL_BOOKS } from '../data/dailyScripturePlans';

export interface ChapterReadingCompletion {
  book: string;
  chapter: number;
  year: number;
  completedAt: string;
  planId?: string;
  planDay?: number;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const chapterCountByBook = new Map<string, number>(CANONICAL_BOOKS);

function isCanonicalChapter(book: string, chapter: number) {
  const count = chapterCountByBook.get(book);
  return Boolean(count && Number.isInteger(chapter) && chapter >= 1 && chapter <= count);
}

export function chapterKey(book: string, chapter: number) {
  return `${book}:${chapter}`;
}

export function nextCanonicalChapter(book: string, chapter: number): { book: string; chapter: number } | null {
  if (!isCanonicalChapter(book, chapter)) return null;
  const bookIndex = CANONICAL_BOOKS.findIndex(([candidate]) => candidate === book);
  const chapterCount = CANONICAL_BOOKS[bookIndex][1];
  if (chapter < chapterCount) return { book, chapter: chapter + 1 };
  const nextBook = CANONICAL_BOOKS[bookIndex + 1];
  return nextBook ? { book: nextBook[0], chapter: 1 } : null;
}

export function readingCompletionEntryId(year: number, book: string, chapter: number) {
  return `bible-reading-${year}-${slug(book)}-${chapter}`;
}

export function readingCompletionFromEntry(entry: ChronicleEntry): ChapterReadingCompletion | null {
  const value = entry.sourceContext?.readingCompletion;
  if (!value || !isCanonicalChapter(value.book, value.chapter) || !Number.isInteger(value.year) || value.year < 1) return null;
  if (typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt))) return null;
  if (Number(entry.date.slice(0, 4)) !== value.year || Number(value.completedAt.slice(0, 4)) !== value.year) return null;
  if (value.planDay !== undefined && (!Number.isInteger(value.planDay) || value.planDay < 1 || value.planDay > 365)) return null;
  return value;
}

export function createReadingCompletionEntry(
  book: string,
  chapter: number,
  date: string,
  plan?: { id: string; day: number },
  occurrenceId?: string,
): ChronicleEntry {
  const year = Number(date.slice(0, 4));
  const baseId = readingCompletionEntryId(year, book, chapter);
  return {
    id: occurrenceId ? `${baseId}-${slug(occurrenceId)}` : baseId,
    date,
    type: 'study',
    title: `Read ${book} ${chapter}`,
    body: `Completed ${book} ${chapter} in the NKJV.`,
    passage: `${book} ${chapter}`,
    themes: ['Bible Reading'],
    autoCapture: true,
    sourceContext: {
      page: 'reading-log',
      passage: `${book} ${chapter}`,
      translation: 'NKJV',
      readingCompletion: {
        book,
        chapter,
        year,
        planId: plan?.id,
        planDay: plan?.day,
        completedAt: `${date}T12:00:00`,
      },
    },
  };
}

export function completedChapterKeys(entries: ChronicleEntry[], year: number) {
  return new Set(entries.flatMap((entry) => {
    const completion = readingCompletionFromEntry(entry);
    return completion?.year === year ? [chapterKey(completion.book, completion.chapter)] : [];
  }));
}

export function completionEntriesForChapter(entries: ChronicleEntry[], year: number, book: string, chapter: number) {
  return entries.filter((entry) => {
    const completion = readingCompletionFromEntry(entry);
    return completion?.year === year && completion.book === book && completion.chapter === chapter;
  });
}

export function allTimeChapterCounts(entries: ChronicleEntry[]) {
  const counts = new Map<string, { book: string; chapter: number; count: number; lastReadAt: string }>();
  for (const entry of entries) {
    const completion = readingCompletionFromEntry(entry);
    if (!completion) continue;
    const key = chapterKey(completion.book, completion.chapter);
    const existing = counts.get(key);
    counts.set(key, {
      book: completion.book,
      chapter: completion.chapter,
      count: (existing?.count || 0) + 1,
      lastReadAt: existing && existing.lastReadAt > completion.completedAt ? existing.lastReadAt : completion.completedAt,
    });
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || right.lastReadAt.localeCompare(left.lastReadAt) || left.book.localeCompare(right.book) || left.chapter - right.chapter);
}
