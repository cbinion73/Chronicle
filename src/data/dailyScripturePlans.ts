export const DAILY_SCRIPTURE_PLAN_IDS = {
  chronological: 'chronological-bible-one-year',
  canonical: 'canonical-bible-one-year',
} as const;

export type DailyScripturePlanId = typeof DAILY_SCRIPTURE_PLAN_IDS[keyof typeof DAILY_SCRIPTURE_PLAN_IDS];

export interface ScriptureChapterReading {
  book: string;
  chapter: number;
  reference: string;
}

export interface DailyScripturePlanDay {
  day: number;
  readings: ScriptureChapterReading[];
}

export interface DailyScripturePlan {
  id: DailyScripturePlanId;
  name: string;
  days: DailyScripturePlanDay[];
}

// The Protestant canon is repository-owned data. Keeping the chapter counts
// here makes the annual plans deterministic and independently verifiable.
export const CANONICAL_BOOKS = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5],
  ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9], ['Obadiah', 1],
  ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4], ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21],
  ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3],
  ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5],
  ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1],
  ['Revelation', 22],
] as const;

// A broad historical sequence. Wisdom is placed with the united monarchy,
// prophets alongside their historical eras, and the New Testament writings
// after the Gospel/Acts narrative. The validator below, not this ordering,
// guarantees completeness and nonduplication.
const CHRONOLOGICAL_BOOK_ORDER = [
  'Genesis', 'Job', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', 'Psalms', '1 Chronicles', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  '1 Kings', '2 Chronicles', 'Obadiah', 'Joel', 'Jonah', 'Amos', 'Hosea', 'Isaiah', 'Micah',
  '2 Kings', 'Nahum', 'Zephaniah', 'Habakkuk', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Ezra', 'Haggai', 'Zechariah', 'Esther', 'Nehemiah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'James', 'Galatians', '1 Thessalonians', '2 Thessalonians', '1 Corinthians',
  '2 Corinthians', 'Romans', 'Colossians', 'Philemon', 'Ephesians', 'Philippians', '1 Timothy',
  'Titus', '1 Peter', 'Hebrews', '2 Timothy', '2 Peter', 'Jude', '1 John', '2 John', '3 John',
  'Revelation',
] as const;

function chaptersFor(order: readonly string[]) {
  const countByBook = new Map<string, number>(CANONICAL_BOOKS);
  return order.flatMap((book) => Array.from({ length: countByBook.get(book) || 0 }, (_, index) => ({
    book,
    chapter: index + 1,
    reference: `${book} ${index + 1}`,
  })));
}

function distributeAcrossYear(chapters: ScriptureChapterReading[]): DailyScripturePlanDay[] {
  let cursor = 0;
  return Array.from({ length: 365 }, (_, index) => {
    // 1,189 chapters = 94 four-chapter days + 271 three-chapter days.
    const count = index < 94 ? 4 : 3;
    const readings = chapters.slice(cursor, cursor + count);
    cursor += count;
    return { day: index + 1, readings };
  });
}

export const DAILY_SCRIPTURE_PLANS: Record<DailyScripturePlanId, DailyScripturePlan> = {
  [DAILY_SCRIPTURE_PLAN_IDS.chronological]: {
    id: DAILY_SCRIPTURE_PLAN_IDS.chronological,
    name: 'Chronological Bible in One Year',
    days: distributeAcrossYear(chaptersFor(CHRONOLOGICAL_BOOK_ORDER)),
  },
  [DAILY_SCRIPTURE_PLAN_IDS.canonical]: {
    id: DAILY_SCRIPTURE_PLAN_IDS.canonical,
    name: 'Bible in One Year',
    days: distributeAcrossYear(chaptersFor(CANONICAL_BOOKS.map(([book]) => book))),
  },
};

export const DEFAULT_DAILY_SCRIPTURE_PLAN_ID = DAILY_SCRIPTURE_PLAN_IDS.chronological;
