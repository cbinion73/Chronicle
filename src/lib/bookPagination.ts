// The Book, Typeset (ROADMAP M20) — turns the Legacy narrative from one
// undifferentiated blob into a real book: years as parts (reusing
// deriveLegacyChapters' year grouping), chapters broken at growth
// markers within each year, and genuine pagination (a fixed character
// budget per page) so "Page X of Y" is a derived fact, not decoration.

import type { ChronicleEntry } from '../types';
import { getGrowthMarkerKind } from '../data/growthMarkers';

const CHARS_PER_PAGE = 1600;

export interface BookChapter {
  id: string;
  year: string;
  title: string;
  entries: ChronicleEntry[];
}

export interface BookPart {
  year: string;
  roman: string;
  status: 'active' | 'done';
  chapters: BookChapter[];
}

export interface BookPage {
  pageNumber: number;
  year: string;
  chapterId: string;
  chapterTitle: string;
  text: string;
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function entryLine(entry: ChronicleEntry): string {
  const label = entry.title?.trim() || entry.body.slice(0, 60);
  return `${label}\n${entry.body}`;
}

export function deriveBookParts(entries: ChronicleEntry[]): BookPart[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const byYear = new Map<string, ChronicleEntry[]>();
  for (const entry of sorted) {
    const year = String(parseDate(entry.date).getFullYear());
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(entry);
  }

  const years = Array.from(byYear.keys()).sort();
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  return years.map((year, yearIndex) => {
    const yearEntries = byYear.get(year)!;
    const chapters: BookChapter[] = [];
    let current: ChronicleEntry[] = [];
    let currentTitle = 'The Beginning';
    let chapterIndex = 0;

    const flush = () => {
      if (current.length === 0) return;
      chapters.push({ id: `${year}-${chapterIndex}`, year, title: currentTitle, entries: current });
      chapterIndex += 1;
      current = [];
    };

    for (const entry of yearEntries) {
      if (entry.type === 'growth') {
        flush();
        currentTitle = getGrowthMarkerKind(entry.sourceContext?.growthMarker?.kind).label;
      }
      current.push(entry);
    }
    flush();

    // A year with no chapters (shouldn't happen given it only exists
    // because it has entries) falls back to one chapter titled after the part.
    if (chapters.length === 0) {
      chapters.push({ id: `${year}-0`, year, title: `The ${year} Season`, entries: yearEntries });
    }

    return {
      year,
      roman: roman[yearIndex] || String(yearIndex + 1),
      status: yearIndex === years.length - 1 ? 'active' : 'done',
      chapters,
    };
  });
}

export function paginateBook(parts: BookPart[]): BookPage[] {
  const pages: BookPage[] = [];

  for (const part of parts) {
    for (const chapter of part.chapters) {
      const chapterText = chapter.entries.map(entryLine).join('\n\n');
      let remaining = chapterText;
      let firstPageOfChapter = true;

      if (remaining.length === 0) {
        pages.push({ pageNumber: 0, year: part.year, chapterId: chapter.id, chapterTitle: chapter.title, text: '' });
        continue;
      }

      while (remaining.length > 0) {
        let slice: string;
        if (remaining.length <= CHARS_PER_PAGE) {
          slice = remaining;
          remaining = '';
        } else {
          const breakPoint = remaining.lastIndexOf('\n\n', CHARS_PER_PAGE);
          const cut = breakPoint > CHARS_PER_PAGE * 0.4 ? breakPoint : CHARS_PER_PAGE;
          slice = remaining.slice(0, cut);
          remaining = remaining.slice(cut).replace(/^\n+/, '');
        }
        pages.push({
          pageNumber: 0,
          year: part.year,
          chapterId: chapter.id,
          chapterTitle: firstPageOfChapter ? chapter.title : `${chapter.title} (continued)`,
          text: slice,
        });
        firstPageOfChapter = false;
      }
    }
  }

  return pages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
}

export function deriveBookPages(entries: ChronicleEntry[]): BookPage[] {
  return paginateBook(deriveBookParts(entries));
}
