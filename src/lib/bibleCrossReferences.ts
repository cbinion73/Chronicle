interface StudyLibraryManifestEntry {
  bookId: string;
  path: string;
}

interface CrossReferenceBookPayload {
  entries: Record<string, {
    sourceLabel: string;
    references: Array<{
      targetKey: string;
      targetLabel: string;
      note: string;
    }>;
  }>;
}

export interface ChapterCrossReference {
  sourceVerse: number;
  sourceLabel: string;
  targetKey: string;
  targetLabel: string;
  note: string;
  kind: 'echo' | 'parallel' | 'word' | 'glory' | 'sin' | 'god' | 'prophecy' | 'other';
  weight: number;
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

export async function getChapterCrossReferences(book: string, chapter: number) {
  const bookId = bookIdByName[book];
  if (!bookId) return [] as ChapterCrossReference[];

  const payload = await loadBookManifestJson<CrossReferenceBookPayload>(
    '/study-library/cross-references/kjvstudy/manifest.json',
    bookId,
  ).catch(() => null);
  if (!payload?.entries) return [] as ChapterCrossReference[];

  const prefix = `${bookId}.${chapter}.`;
  const items: ChapterCrossReference[] = [];

  for (const [key, entry] of Object.entries(payload.entries)) {
    if (!key.startsWith(prefix)) continue;
    const verse = Number.parseInt(key.slice(prefix.length), 10);
    if (Number.isNaN(verse)) continue;
    for (const reference of entry.references || []) {
      items.push({
        sourceVerse: verse,
        sourceLabel: entry.sourceLabel,
        targetKey: reference.targetKey,
        targetLabel: reference.targetLabel,
        note: reference.note || 'Cross reference',
        kind: classifyReference(reference.note || '', reference.targetLabel, bookId),
        weight: scoreReference(reference.note || '', reference.targetLabel, bookId),
      });
    }
  }

  return items.sort((left, right) =>
    left.sourceVerse - right.sourceVerse
    || right.weight - left.weight
    || left.targetLabel.localeCompare(right.targetLabel)
  );
}

function classifyReference(note: string, targetLabel: string, currentBookId: string): ChapterCrossReference['kind'] {
  const lowered = `${note} ${targetLabel}`.toLowerCase();
  const targetBookId = targetLabelToBookId(targetLabel);
  const targetIsOt = Boolean(targetBookId && !isNewTestamentBook(targetBookId));
  const currentIsNt = isNewTestamentBook(currentBookId);

  if (lowered.includes('prophecy')) return 'prophecy';
  if (lowered.includes('word')) return 'word';
  if (lowered.includes('glory')) return 'glory';
  if (lowered.includes('sin')) return 'sin';
  if (lowered.includes('references god')) return 'god';
  if (targetIsOt && currentIsNt) return 'echo';
  if (lowered.includes('parallel')) return 'parallel';
  return 'other';
}

function scoreReference(note: string, targetLabel: string, currentBookId: string) {
  const kind = classifyReference(note, targetLabel, currentBookId);
  const base =
    kind === 'echo' ? 100 :
    kind === 'prophecy' ? 95 :
    kind === 'word' ? 90 :
    kind === 'glory' ? 85 :
    kind === 'god' ? 82 :
    kind === 'sin' ? 80 :
    kind === 'parallel' ? 70 : 60;
  const sameBookBonus = targetLabel.startsWith(currentBookIdToName(currentBookId) || '') ? -8 : 0;
  return base + sameBookBonus;
}

function targetLabelToBookId(targetLabel: string) {
  const entries = Object.entries(bookIdByName).sort((left, right) => right[0].length - left[0].length);
  const match = entries.find(([name]) => targetLabel.startsWith(name));
  return match?.[1];
}

function currentBookIdToName(bookId: string) {
  return Object.entries(bookIdByName).find(([, id]) => id === bookId)?.[0];
}

function isNewTestamentBook(bookId: string) {
  return ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'].includes(bookId);
}

async function loadBookManifestJson<T>(manifestPath: string, bookId: string) {
  const manifest = await getManifestMap(manifestPath);
  const filePath = manifest[bookId];
  if (!filePath) return null;
  return loadJson<T>(filePath);
}

async function getManifestMap(manifestPath: string) {
  if (!manifestCache.has(manifestPath)) {
    manifestCache.set(manifestPath, (async () => {
      const manifest = await loadJson<{ books: StudyLibraryManifestEntry[] }>(manifestPath);
      return Object.fromEntries((manifest.books || []).map((entry) => [entry.bookId, entry.path]));
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
