import { fetchBibleChapter, getConfiguredBibleProvider, type BibleProviderId } from './bibleProviders';

export interface ParsedScriptureReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface BibleNavigationTarget {
  book: string;
  chapter: number;
}

const BOOK_ALIASES: Record<string, string> = {
  Psalm: 'Psalms',
  Psalms: 'Psalms',
  Song: 'Song of Solomon',
  'Song of Songs': 'Song of Solomon',
  'Song of Solomon': 'Song of Solomon',
}

export function normalizeBookName(book: string) {
  return BOOK_ALIASES[book.trim()] || book.trim();
}

export function parseScriptureReference(reference: string): ParsedScriptureReference | null {
  const normalized = reference
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const match = normalized.match(
    /^(?<book>(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(?<chapter>\d+)(?::(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?)?$/,
  );
  if (!match?.groups) return null;

  return {
    book: normalizeBookName(match.groups.book),
    chapter: Number.parseInt(match.groups.chapter, 10),
    verseStart: match.groups.verseStart ? Number.parseInt(match.groups.verseStart, 10) : undefined,
    verseEnd: match.groups.verseEnd ? Number.parseInt(match.groups.verseEnd, 10) : undefined,
  };
}

export function formatPassageLabel(reference: ParsedScriptureReference) {
  const displayBook = reference.book === 'Psalms' ? 'Psalm' : reference.book;
  if (!reference.verseStart) return `${displayBook} ${reference.chapter}`;
  if (!reference.verseEnd || reference.verseEnd === reference.verseStart) {
    return `${displayBook} ${reference.chapter}:${reference.verseStart}`;
  }
  return `${displayBook} ${reference.chapter}:${reference.verseStart}-${reference.verseEnd}`;
}

export function getBibleNavigationTarget(referenceText: string): BibleNavigationTarget | null {
  const parsed = parseScriptureReference(referenceText);
  if (!parsed) return null;
  return {
    book: parsed.book,
    chapter: parsed.chapter,
  };
}

export async function loadPassagePreview(
  referenceText: string,
  provider: BibleProviderId = getConfiguredBibleProvider(),
) {
  const parsed = parseScriptureReference(referenceText);
  if (!parsed) return null;

  const result = await fetchBibleChapter(parsed.book, parsed.chapter, provider);
  if (!result.chapter) return null;

  const verses = result.chapter.verses.filter((verse) => {
    if (!parsed.verseStart) return verse.number <= 4;
    const rangeEnd = parsed.verseEnd || parsed.verseStart;
    return verse.number >= parsed.verseStart && verse.number <= rangeEnd;
  });

  return {
    reference: formatPassageLabel(parsed),
    book: parsed.book,
    chapter: parsed.chapter,
    verses: verses.slice(0, parsed.verseStart ? verses.length : 4),
    sourceLabel: result.sourceLabel,
    provider,
  };
}
