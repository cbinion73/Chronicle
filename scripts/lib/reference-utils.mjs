import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksPath = path.join(__dirname, 'canonical-books.json');
const books = JSON.parse(await readFile(booksPath, 'utf8'));

const aliasMap = new Map();
for (const book of books) {
  for (const alias of book.aliases) {
    aliasMap.set(normalizeBookToken(alias), book);
  }
}

export function getCanonicalBooks() {
  return books;
}

export function lookupBook(rawName) {
  const key = normalizeBookToken(rawName);
  return aliasMap.get(key) || null;
}

export function parseColonReference(rawReference) {
  const match = rawReference.trim().match(/^(?<book>.+?):(?<chapter>\d+)(?::(?<verses>\d+(?:-\d+)?))?$/);
  if (!match?.groups) return null;
  return buildReference(match.groups.book, match.groups.chapter, match.groups.verses);
}

export function parseSpaceUnderscoreReference(rawReference) {
  const match = rawReference.trim().match(/^(?<book>.+?)\s+(?<chapter>\d+)(?:_(?<verses>\d+(?:-\d+)?))?$/);
  if (!match?.groups) return null;
  return buildReference(match.groups.book, match.groups.chapter, match.groups.verses);
}

export function toReferenceKey(reference) {
  const base = `${reference.bookId}.${reference.chapter}`;
  if (!reference.verseStart) return base;
  if (reference.verseEnd && reference.verseEnd !== reference.verseStart) {
    return `${base}.${reference.verseStart}-${reference.verseEnd}`;
  }
  return `${base}.${reference.verseStart}`;
}

export function toChapterKey(reference) {
  return `${reference.bookId}.${reference.chapter}`;
}

export function toReferenceLabel(reference) {
  const chapterLabel = `${reference.bookName} ${reference.chapter}`;
  if (!reference.verseStart) return chapterLabel;
  if (reference.verseEnd && reference.verseEnd !== reference.verseStart) {
    return `${chapterLabel}:${reference.verseStart}-${reference.verseEnd}`;
  }
  return `${chapterLabel}:${reference.verseStart}`;
}

export function expandVerseRange(reference) {
  if (!reference.verseStart) return [];
  const end = reference.verseEnd || reference.verseStart;
  const results = [];
  for (let verse = reference.verseStart; verse <= end; verse += 1) {
    const verseReference = { ...reference, verseStart: verse, verseEnd: verse };
    results.push({
      ...verseReference,
      key: toReferenceKey(verseReference),
      label: toReferenceLabel(verseReference),
    });
  }
  return results;
}

export function normalizeBookToken(value) {
  return value
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildReference(bookName, chapterText, versesText) {
  const book = lookupBook(bookName);
  if (!book) return null;
  const chapter = Number.parseInt(chapterText, 10);
  let verseStart = null;
  let verseEnd = null;
  if (versesText) {
    const [startText, endText] = versesText.split('-');
    verseStart = Number.parseInt(startText, 10);
    verseEnd = endText ? Number.parseInt(endText, 10) : verseStart;
  }
  return {
    bookId: book.id,
    bookName: book.name,
    canonical: book.canonical,
    chapter,
    verseStart,
    verseEnd,
  };
}
