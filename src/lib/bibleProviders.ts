import type { Chapter } from './scripture';
import { getChapter } from './scripture';
import {
  fetchLocalBibleChapter,
  type LocalBibleProviderId,
  isLocalBibleProvider,
} from './localBibles';

export type BibleProviderId = 'offline' | LocalBibleProviderId;

export interface BibleProviderResult {
  chapter?: Chapter;
  provider: BibleProviderId;
  sourceLabel: string;
  attribution: string;
  externalUrl?: string;
  warning?: string;
}

const DEFAULT_PROVIDER = import.meta.env.VITE_BIBLE_PROVIDER || 'offline';

function normalizeBookForUrl(book: string) {
  return book === 'Psalms' ? 'Psalm' : book;
}

export function getConfiguredBibleProvider(): BibleProviderId {
  return DEFAULT_PROVIDER;
}

export async function fetchBibleChapter(
  book: string,
  chapter: number,
  provider: BibleProviderId = getConfiguredBibleProvider(),
): Promise<BibleProviderResult> {
  if (isLocalBibleProvider(provider)) {
    const result = await fetchLocalBibleChapter(provider, book, chapter);
    return {
      ...result,
      provider,
    };
  }

  return fetchOfflineChapter(book, chapter);
}

export function getExternalBibleLinks(book: string, chapter: number) {
  const displayBook = normalizeBookForUrl(book);
  const query = encodeURIComponent(`${displayBook} ${chapter}`);
  const bibleHubBook = displayBook.toLowerCase().replace(/\s+/g, '_');

  return [
    {
      id: 'biblehub',
      label: 'BibleHub',
      url: `https://biblehub.com/${bibleHubBook}/${chapter}.htm`,
    },
    {
      id: 'biblecom',
      label: 'Bible.com',
      url: `https://www.bible.com/search/bible?q=${query}`,
    },
  ];
}

async function fetchOfflineChapter(book: string, chapter: number): Promise<BibleProviderResult> {
  const cached = getChapter(book, chapter);
  return {
    chapter: cached,
    provider: 'offline',
    sourceLabel: 'Chronicle reading cache',
    attribution: cached
      ? 'Chronicle local reading cache for fast fallback when the full local library is unavailable.'
      : 'Chapter not available in the Chronicle reading cache.',
    warning: cached ? undefined : 'This chapter is not in the Chronicle reading cache.',
  };
}
