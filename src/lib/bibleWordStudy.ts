interface StudyLibraryManifestEntry {
  bookId: string;
  path: string;
}

interface StrongsChapterPayload {
  verses: Record<string, Array<{
    position: number;
    surface: string;
    transliteration: string;
    strongs: string;
    gloss: string;
    morphology: string;
    definition: string;
  }>>;
}

export interface WordStudyToken {
  position: number;
  surface: string;
  transliteration: string;
  strongs: string;
  gloss: string;
  morphology: string;
  definition: string;
}

const manifestCache = new Map<string, Promise<Record<string, string>>>();
const jsonCache = new Map<string, Promise<unknown>>();

const bookIdByName: Record<string, string> = {
  Genesis: 'GEN',
  Exodus: 'EXO',
  Leviticus: 'LEV',
  Numbers: 'NUM',
  Deuteronomy: 'DEU',
  Joshua: 'JOS',
  Judges: 'JDG',
  Ruth: 'RUT',
  '1 Samuel': '1SA',
  '2 Samuel': '2SA',
  '1 Kings': '1KI',
  '2 Kings': '2KI',
  '1 Chronicles': '1CH',
  '2 Chronicles': '2CH',
  Ezra: 'EZR',
  Nehemiah: 'NEH',
  Esther: 'EST',
  Job: 'JOB',
  Psalms: 'PSA',
  Proverbs: 'PRO',
  Ecclesiastes: 'ECC',
  'Song of Solomon': 'SNG',
  Isaiah: 'ISA',
  Jeremiah: 'JER',
  Lamentations: 'LAM',
  Ezekiel: 'EZK',
  Daniel: 'DAN',
  Hosea: 'HOS',
  Joel: 'JOL',
  Amos: 'AMO',
  Obadiah: 'OBA',
  Jonah: 'JON',
  Micah: 'MIC',
  Nahum: 'NAM',
  Habakkuk: 'HAB',
  Zephaniah: 'ZEP',
  Haggai: 'HAG',
  Zechariah: 'ZEC',
  Malachi: 'MAL',
  Matthew: 'MAT',
  Mark: 'MRK',
  Luke: 'LUK',
  John: 'JHN',
  Acts: 'ACT',
  Romans: 'ROM',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  Galatians: 'GAL',
  Ephesians: 'EPH',
  Philippians: 'PHP',
  Colossians: 'COL',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  Titus: 'TIT',
  Philemon: 'PHM',
  Hebrews: 'HEB',
  James: 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JN',
  '2 John': '2JN',
  '3 John': '3JN',
  Jude: 'JUD',
  Revelation: 'REV',
};

const NEW_TESTAMENT = new Set([
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
]);

export function supportsGreekWordStudy(book: string) {
  const bookId = bookIdByName[book];
  return Boolean(bookId && NEW_TESTAMENT.has(bookId));
}

export async function getChapterWordStudy(book: string, chapter: number) {
  const bookId = bookIdByName[book];
  if (!bookId || !NEW_TESTAMENT.has(bookId)) return new Map<number, WordStudyToken[]>();

  const payload = await loadJson<StrongsChapterPayload>(`/study-library/strongs/kjvstudy/chapters/${bookId}.${chapter}.json`).catch(() => null);
  if (!payload?.verses) return new Map<number, WordStudyToken[]>();

  const result = new Map<number, WordStudyToken[]>();
  const prefix = `${bookId}.${chapter}.`;
  for (const [key, tokens] of Object.entries(payload.verses)) {
    if (!key.startsWith(prefix)) continue;
    const verse = Number.parseInt(key.slice(prefix.length), 10);
    if (Number.isNaN(verse)) continue;
    result.set(verse, tokens
      .filter((token) => token.gloss || token.surface)
      .filter(isMeaningfulToken)
      .sort((left, right) => rankToken(right) - rankToken(left) || left.position - right.position));
  }
  return result;
}

export async function getStrongsGlossEntry(strongsId: string) {
  const manifest = await getManifestMap('/study-library/strongs/kjvstudy/manifest.json').catch(() => null);
  if (!manifest) return null;
  const filePath = manifest[strongsId];
  if (!filePath) return null;
  return loadJson<unknown>(filePath).catch(() => null);
}

async function getManifestMap(manifestPath: string) {
  if (!manifestCache.has(manifestPath)) {
    manifestCache.set(manifestPath, (async () => {
      const manifest = await loadJson<{ entries: StudyLibraryManifestEntry[]; books: StudyLibraryManifestEntry[] }>(manifestPath);
      const entries = manifest.entries || manifest.books || [];
      return Object.fromEntries(entries.map((entry) => [entry.bookId, entry.path]));
    })());
  }
  return manifestCache.get(manifestPath)!;
}

async function loadJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    jsonCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load ${url}`);
      return response.json() as Promise<T>;
    }));
  }
  return jsonCache.get(url)! as Promise<T>;
}

function isMeaningfulToken(token: WordStudyToken) {
  const gloss = (token.gloss || '').trim().toLowerCase();
  const surface = (token.surface || '').trim();
  if (!gloss && !surface) return false;
  if (['the', 'and', 'of', 'to', 'in', 'him', 'he', 'she', 'it', 'was', 'is', 'a', 'an', 'his', 'her', 'their', 'that', 'this', 'which', 'who', 'unto', 'for', 'with', 'from'].includes(gloss)) return false;
  if (['G3588', 'G2532', 'G1161', 'G3754', 'G2443', 'G1722', 'G4314', 'G846', 'G3778', 'G1519'].includes(token.strongs)) return false;
  return Boolean(gloss.length >= 3 || surface.length >= 3);
}

function rankToken(token: WordStudyToken) {
  const gloss = (token.gloss || '').trim();
  const definition = (token.definition || '').trim();
  let score = 0;
  if (gloss) score += 5;
  if (definition) score += 3;
  if ((token.surface || '').length > 3) score += 2;
  if ((token.strongs || '').startsWith('G')) score += 1;
  return score;
}
