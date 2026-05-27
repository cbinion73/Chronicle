import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'public/bibles/helloao');
const libraryRoot = path.join(root, 'public/bibles/library');

const translations = [
  {
    id: 'eng_asv',
    providerId: 'offline_asv',
    label: 'ASV Offline',
    sourceLabel: 'Offline ASV (HelloAOLab)',
  },
  {
    id: 'eng_kjv',
    providerId: 'offline_kjv',
    label: 'KJV Offline',
    sourceLabel: 'Offline KJV (HelloAOLab)',
  },
];

await mkdir(outputRoot, { recursive: true });
await mkdir(libraryRoot, { recursive: true });

const installed = [];

for (const translation of translations) {
  const translationRoot = path.join(outputRoot, translation.id);
  const chapterRoot = path.join(translationRoot, 'chapters');
  await mkdir(chapterRoot, { recursive: true });

  const booksPayload = await fetchJson(`https://bible.helloao.org/api/${translation.id}/books.json`);
  const books = booksPayload.books || [];
  let chapterCount = 0;

  for (const book of books) {
    for (let chapter = book.firstChapterNumber; chapter <= book.lastChapterNumber; chapter += 1) {
      const chapterPayload = await fetchJson(`https://bible.helloao.org/api/${translation.id}/${book.id}/${chapter}.json`);
      await writeFile(
        path.join(chapterRoot, `${book.id}.${chapter}.json`),
        `${JSON.stringify(chapterPayload)}\n`,
        'utf8',
      );
      chapterCount += 1;
    }
  }

  const manifest = {
    id: translation.id,
    providerId: translation.providerId,
    label: translation.label,
    sourceLabel: translation.sourceLabel,
    translation: booksPayload.translation,
    books: books.map((book) => ({
      id: book.id,
      name: book.name,
      commonName: book.commonName,
      title: book.title,
      order: book.order,
      firstChapterNumber: book.firstChapterNumber,
      lastChapterNumber: book.lastChapterNumber,
      numberOfChapters: book.numberOfChapters,
      totalNumberOfVerses: book.totalNumberOfVerses,
      isApocryphal: book.isApocryphal || false,
    })),
    installedAt: new Date().toISOString(),
    chapterCount,
    attribution: `${booksPayload.translation?.englishName || booksPayload.translation?.name || translation.label}. Source data provided by HelloAOLab Free Use Bible API. See translation license: ${booksPayload.translation?.licenseUrl || 'unknown'}.`,
  };

  await writeFile(path.join(translationRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  installed.push({
    providerId: translation.providerId,
    id: translation.id,
    label: translation.label,
    basePath: `/bibles/helloao/${translation.id}`,
    sourceLabel: translation.sourceLabel,
    books: books.length,
    chapters: chapterCount,
  });
  console.log(`Installed ${translation.label}: ${books.length} books, ${chapterCount} chapters`);
}

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ installedAt: new Date().toISOString(), translations: installed }, null, 2)}\n`,
  'utf8',
);

await writeFile(
  path.join(libraryRoot, 'manifest.json'),
  `${JSON.stringify({ installedAt: new Date().toISOString(), translations: installed }, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${path.relative(root, path.join(outputRoot, 'manifest.json'))}`);
console.log(`Wrote ${path.relative(root, path.join(libraryRoot, 'manifest.json'))}`);

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
