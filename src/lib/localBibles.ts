import type { Chapter, Verse } from './scripture';

export type LocalBibleProviderId = string;

interface LocalBibleManifest {
  id: string;
  providerId: LocalBibleProviderId;
  label: string;
  sourceLabel: string;
  attribution: string;
  translation: {
    id: string;
    shortName: string;
    englishName: string;
    licenseUrl: string;
  };
  books: Array<{
    id: string;
    name: string;
    commonName: string;
    title: string | null;
    order: number;
    firstChapterNumber: number;
    lastChapterNumber: number;
    numberOfChapters: number;
  }>;
}

interface HelloAoChapter {
  translation: {
    shortName: string;
    englishName: string;
    licenseUrl: string;
  };
  book: {
    id: string;
    commonName: string;
    name: string;
  };
  numberOfVerses: number;
  chapter: {
    number: number;
    content: Array<HelloAoContent>;
  };
}

interface LocalBibleLibraryManifest {
  installedAt?: string;
  translations: Array<{
    providerId: LocalBibleProviderId;
    id: string;
    label: string;
    basePath?: string;
    sourceLabel?: string;
  }>;
}

type HelloAoContent =
  | { type: 'heading'; content: Array<string | HelloAoFormattedText> }
  | { type: 'hebrew_subtitle'; content: Array<string | HelloAoFormattedText | unknown> }
  | { type: 'verse'; number: number; content: Array<string | HelloAoFormattedText | HelloAoInlineLineBreak | unknown> }
  | { type: 'line_break' };

interface HelloAoFormattedText {
  text: string;
}

interface HelloAoInlineLineBreak {
  lineBreak: true;
}

const LEGACY_LOCAL_BIBLE_CONFIG: Record<string, { id: string; basePath: string }> = {
  offline_asv: { id: 'eng_asv', basePath: '/bibles/helloao/eng_asv' },
  offline_kjv: { id: 'eng_kjv', basePath: '/bibles/helloao/eng_kjv' },
};

const manifestCache = new Map<LocalBibleProviderId, Promise<LocalBibleManifest>>();
let providerConfigPromise: Promise<Record<LocalBibleProviderId, { id: string; basePath: string; label: string }>> | null = null;

export function isLocalBibleProvider(provider: string): provider is LocalBibleProviderId {
  return provider !== 'offline';
}

export async function getAvailableLocalBibleProviders() {
  const config = await getLocalBibleProviderConfig();
  const preferredOrder = ['offline_nkjv', 'offline_csb', 'offline_amp', 'offline_niv', 'offline_esv', 'offline_nasb', 'offline_asv', 'offline_kjv', 'offline_akjv'];
  return Object.entries(config)
    .map(([providerId, value]) => ({
      providerId: providerId as LocalBibleProviderId,
      id: value.id,
      label: value.label,
      basePath: value.basePath,
    }))
    .sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.providerId);
      const rightIndex = preferredOrder.indexOf(right.providerId);
      if (leftIndex !== -1 || rightIndex !== -1) {
        return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
          - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
      }
      return left.label.localeCompare(right.label);
    });
}

export async function getLocalBibleManifest(provider: LocalBibleProviderId) {
  if (!manifestCache.has(provider)) {
    manifestCache.set(provider, (async () => {
      const config = await getLocalBibleProviderConfig();
      const providerConfig = config[provider];
      if (!providerConfig) throw new Error(`${provider} local Bible is not installed.`);
      const response = await fetch(`${providerConfig.basePath}/manifest.json`);
      if (!response.ok) throw new Error(`${provider} local Bible is not installed.`);
      return response.json() as Promise<LocalBibleManifest>;
    })());
  }
  return manifestCache.get(provider)!;
}

export async function getLocalBibleBooks(provider: LocalBibleProviderId) {
  const manifest = await getLocalBibleManifest(provider);
  return manifest.books.map((book) => book.commonName);
}

export async function getLocalBibleChapters(provider: LocalBibleProviderId, bookName: string) {
  const manifest = await getLocalBibleManifest(provider);
  const book = findBook(manifest, bookName);
  if (!book) return [];
  return Array.from({ length: book.numberOfChapters }, (_, index) => book.firstChapterNumber + index);
}

export async function fetchLocalBibleChapter(provider: LocalBibleProviderId, bookName: string, chapter: number) {
  const manifest = await getLocalBibleManifest(provider);
  const book = findBook(manifest, bookName);
  if (!book) throw new Error(`${bookName} is not available in ${manifest.label}.`);

  const config = await getLocalBibleProviderConfig();
  const response = await fetch(`${config[provider].basePath}/chapters/${book.id}.${chapter}.json`);
  if (!response.ok) throw new Error(`${book.commonName} ${chapter} is not installed for ${manifest.label}.`);

  const payload = await response.json() as HelloAoChapter;
  return {
    chapter: parseHelloAoChapter(payload),
    sourceLabel: manifest.sourceLabel,
    attribution: manifest.attribution,
  };
}

async function getLocalBibleProviderConfig() {
  if (!providerConfigPromise) {
    providerConfigPromise = loadProviderConfig();
  }
  return providerConfigPromise;
}

async function loadProviderConfig(): Promise<Record<LocalBibleProviderId, { id: string; basePath: string; label: string }>> {
  try {
    const response = await fetch('/bibles/library/manifest.json');
    if (response.ok) {
      const payload = await response.json() as LocalBibleLibraryManifest;
      const dynamicConfig = Object.fromEntries(
        (payload.translations || []).map((entry) => [
          entry.providerId,
          {
            id: entry.id,
            basePath: entry.basePath || `/bibles/library/${entry.id}`,
            label: entry.label,
          },
        ]),
      ) as Record<LocalBibleProviderId, { id: string; basePath: string; label: string }>;
      if (Object.keys(dynamicConfig).length > 0) return dynamicConfig;
    }
  } catch {
    // Fall back to legacy manifests.
  }

  try {
    const response = await fetch('/bibles/helloao/manifest.json');
    if (response.ok) {
      const payload = await response.json() as LocalBibleLibraryManifest;
      const legacyConfig = Object.fromEntries(
        (payload.translations || []).map((entry) => [
          entry.providerId,
          {
            id: entry.id,
            basePath: entry.basePath || `/bibles/helloao/${entry.id}`,
            label: entry.label,
          },
        ]),
      ) as Record<LocalBibleProviderId, { id: string; basePath: string; label: string }>;
      if (Object.keys(legacyConfig).length > 0) return legacyConfig;
    }
  } catch {
    // Fall back to static defaults if manifests are missing.
  }

  return Object.fromEntries(
    Object.entries(LEGACY_LOCAL_BIBLE_CONFIG).map(([providerId, value]) => [
      providerId,
      { ...value, label: providerId === 'offline_asv' ? 'ASV Local Library' : 'KJV Local Library' },
    ]),
  ) as Record<LocalBibleProviderId, { id: string; basePath: string; label: string }>;
}

function findBook(manifest: LocalBibleManifest, bookName: string) {
  return manifest.books.find((book) => book.commonName === bookName || book.name === bookName);
}

function parseHelloAoChapter(payload: HelloAoChapter): Chapter {
  const heading = payload.chapter.content.find((item) => item.type === 'heading');
  const subtitle = payload.chapter.content.find((item) => item.type === 'hebrew_subtitle');
  const verses = payload.chapter.content
    .filter((item): item is Extract<HelloAoContent, { type: 'verse' }> => item.type === 'verse')
    .map((item) => ({
      number: item.number,
      text: flattenContent(item.content),
    }))
    .filter((verse): verse is Verse => Boolean(verse.text));

  return {
    book: payload.book.commonName,
    bookAbbrev: payload.book.id,
    chapter: payload.chapter.number,
    heading: heading && 'content' in heading ? flattenContent(heading.content) : undefined,
    subheading: subtitle && 'content' in subtitle ? flattenContent(subtitle.content) : undefined,
    verses,
    translation: payload.translation.shortName,
  };
}

function flattenContent(content: Array<string | HelloAoFormattedText | HelloAoInlineLineBreak | unknown>) {
  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (isFormattedText(item)) return item.text;
      if (isInlineLineBreak(item)) return ' ';
      return '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFormattedText(value: unknown): value is HelloAoFormattedText {
  return Boolean(value && typeof value === 'object' && 'text' in value && typeof value.text === 'string');
}

function isInlineLineBreak(value: unknown): value is HelloAoInlineLineBreak {
  return Boolean(value && typeof value === 'object' && 'lineBreak' in value);
}
