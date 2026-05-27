import { gunzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseColonReference,
  toChapterKey,
  toReferenceKey,
  toReferenceLabel,
} from './lib/reference-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const repoRoot = path.resolve(process.argv[2] || '/tmp/kjvstudy.org');
const outputRoot = path.resolve(process.argv[3] || path.join(root, 'public/study-library'));

const dataRoot = path.join(repoRoot, 'kjvstudy_org/data');
const crossRefsRoot = path.join(dataRoot, 'cross_references');
const verseCommentaryRoot = path.join(dataRoot, 'verse_commentary');
const interlinearPath = path.join(dataRoot, 'interlinear.json.gz');
const wordStudiesPath = path.join(dataRoot, 'word_studies.json');

await mkdir(outputRoot, { recursive: true });

const crossRefsOutput = path.join(outputRoot, 'cross-references/kjvstudy');
const strongsOutput = path.join(outputRoot, 'strongs/kjvstudy');
const commentaryOutput = path.join(outputRoot, 'commentaries/kjvstudy');

await mkdir(crossRefsOutput, { recursive: true });
await mkdir(path.join(strongsOutput, 'chapters'), { recursive: true });
await mkdir(commentaryOutput, { recursive: true });

const crossRefSummary = await importCrossReferences();
const strongsSummary = await importStrongs();
const commentarySummary = await importVerseCommentary();

const manifest = {
  id: 'kjvstudy',
  label: 'kjvstudy.org Local Study Data',
  sourceRepo: 'https://github.com/kennethreitz/kjvstudy.org',
  generatedAt: new Date().toISOString(),
  crossReferences: crossRefSummary,
  strongs: strongsSummary,
  verseCommentary: commentarySummary,
};

await writeFile(path.join(outputRoot, 'kjvstudy-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(
  `Imported kjvstudy.org: ${crossRefSummary.referenceCount} cross-reference anchors, `
    + `${strongsSummary.tokenCount} Strong's tokens, ${commentarySummary.entryCount} verse commentary entries.`,
);

async function importCrossReferences() {
  const files = (await listJsonFiles(crossRefsRoot)).sort();
  const manifest = {
    id: 'kjvstudy-cross-references',
    label: 'kjvstudy.org Cross References',
    sourceRepo: 'https://github.com/kennethreitz/kjvstudy.org',
    sourcePath: '/study-library/cross-references/kjvstudy',
    bookCount: 0,
    referenceCount: 0,
    edgeCount: 0,
    books: [],
  };

  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(crossRefsRoot, file), 'utf8'));
    const entries = {};
    let canonicalBookId = null;
    for (const [rawReference, refs] of Object.entries(raw)) {
      const sourceReference = parseColonReference(rawReference);
      if (!sourceReference) continue;
      canonicalBookId = canonicalBookId || sourceReference.bookId;
      const sourceKey = toReferenceKey(sourceReference);
      const sourceLabel = toReferenceLabel(sourceReference);
      const normalizedRefs = [];
      for (const ref of refs) {
        const targetReference = parseLooseCrossReference(ref.ref);
        if (!targetReference) continue;
        normalizedRefs.push({
          targetKey: toReferenceKey(targetReference),
          targetLabel: toReferenceLabel(targetReference),
          note: ref.note || '',
        });
      }
      if (normalizedRefs.length === 0) continue;
      entries[sourceKey] = {
        sourceLabel,
        references: normalizedRefs,
      };
      manifest.referenceCount += 1;
      manifest.edgeCount += normalizedRefs.length;
    }

    const bookId = canonicalBookId || file.replace(/\.json$/i, '');
    await writeFile(
      path.join(crossRefsOutput, file),
      `${JSON.stringify({ bookId, referenceCount: Object.keys(entries).length, entries })}\n`,
      'utf8',
    );
    manifest.books.push({
      bookId,
      path: `/study-library/cross-references/kjvstudy/${file}`,
      referenceCount: Object.keys(entries).length,
    });
  }

  manifest.bookCount = manifest.books.length;
  await writeFile(path.join(crossRefsOutput, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

async function importStrongs() {
  const wordStudies = JSON.parse(await readFile(wordStudiesPath, 'utf8'));
  await writeFile(path.join(strongsOutput, 'word-studies.json'), `${JSON.stringify(wordStudies)}\n`, 'utf8');

  const interlinear = JSON.parse(gunzipSync(await readFile(interlinearPath)).toString('utf8'));
  const chapterBuckets = new Map();
  let verseCount = 0;
  let tokenCount = 0;

  for (const [rawReference, tokens] of Object.entries(interlinear)) {
    const reference = parseColonReference(rawReference);
    if (!reference) continue;
    const chapterKey = toChapterKey(reference);
    const verseKey = toReferenceKey(reference);
    if (!chapterBuckets.has(chapterKey)) {
      chapterBuckets.set(chapterKey, {
        bookId: reference.bookId,
        chapter: reference.chapter,
        chapterKey,
        verses: {},
      });
    }

    chapterBuckets.get(chapterKey).verses[verseKey] = tokens.map((token) => ({
      position: token.position,
      surface: token.original,
      transliteration: token.transliteration || '',
      strongs: token.strongs || '',
      gloss: token.english || '',
      morphology: token.parsing || '',
      definition: token.definition || '',
    }));
    verseCount += 1;
    tokenCount += tokens.length;
  }

  const books = new Map();
  for (const [chapterKey, payload] of Array.from(chapterBuckets.entries()).sort()) {
    const chapterFile = `${chapterKey}.json`;
    await writeFile(path.join(strongsOutput, 'chapters', chapterFile), `${JSON.stringify(payload)}\n`, 'utf8');
    if (!books.has(payload.bookId)) books.set(payload.bookId, []);
    books.get(payload.bookId).push({
      chapterKey,
      path: `/study-library/strongs/kjvstudy/chapters/${chapterFile}`,
      verseCount: Object.keys(payload.verses).length,
    });
  }

  const manifest = {
    id: 'kjvstudy-strongs',
    label: 'kjvstudy.org Strong\'s and Interlinear Data',
    sourceRepo: 'https://github.com/kennethreitz/kjvstudy.org',
    sourcePath: '/study-library/strongs/kjvstudy',
    wordStudyPath: '/study-library/strongs/kjvstudy/word-studies.json',
    chapterCount: chapterBuckets.size,
    verseCount,
    tokenCount,
    wordStudyCount: Object.keys(wordStudies).length,
    books: Array.from(books.entries()).map(([bookId, chapters]) => ({
      bookId,
      chapterCount: chapters.length,
      chapters,
    })),
  };
  await writeFile(path.join(strongsOutput, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

async function importVerseCommentary() {
  const files = (await listJsonFiles(verseCommentaryRoot)).sort();
  const manifest = {
    id: 'kjvstudy-verse-commentary',
    label: 'kjvstudy.org Verse Commentary',
    sourceRepo: 'https://github.com/kennethreitz/kjvstudy.org',
    sourcePath: '/study-library/commentaries/kjvstudy',
    bookCount: 0,
    entryCount: 0,
    books: [],
  };

  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(verseCommentaryRoot, file), 'utf8'));
    const bookName = raw.book || file.replace(/\.json$/i, '');
    const entries = {};
    let canonicalBookId = null;

    for (const [chapterText, verses] of Object.entries(raw.commentary || {})) {
      for (const [verseText, content] of Object.entries(verses || {})) {
        const reference = parseColonReference(`${bookName}:${chapterText}:${verseText}`);
        if (!reference) continue;
        canonicalBookId = canonicalBookId || reference.bookId;
        const key = toReferenceKey(reference);
        entries[key] = {
          referenceLabel: toReferenceLabel(reference),
          analysis: content.analysis || '',
          historical: content.historical || '',
          questions: content.questions || [],
        };
        manifest.entryCount += 1;
      }
    }

    const bookId = canonicalBookId || file.replace(/\.json$/i, '');
    await writeFile(
      path.join(commentaryOutput, file),
      `${JSON.stringify({ bookId, entryCount: Object.keys(entries).length, entries })}\n`,
      'utf8',
    );
    manifest.books.push({
      bookId,
      path: `/study-library/commentaries/kjvstudy/${file}`,
      entryCount: Object.keys(entries).length,
    });
  }

  manifest.bookCount = manifest.books.length;
  await writeFile(path.join(commentaryOutput, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function parseLooseCrossReference(rawReference) {
  const trimmed = rawReference.trim();
  const colonParsed = parseColonReference(trimmed.replace(/\s+/g, ''));
  if (colonParsed) return colonParsed;

  const match = trimmed.match(/^(?<book>.+?)\s+(?<chapter>\d+):(?<verses>\d+(?:-\d+)?)$/);
  if (!match?.groups) return null;
  return parseColonReference(`${match.groups.book}:${match.groups.chapter}:${match.groups.verses}`);
}

async function listJsonFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name);
}
