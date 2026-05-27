import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const repoRoot = path.resolve(process.argv[2] || '/tmp/bibleistika');
const outputPath = path.resolve(
  process.argv[3] || path.join(root, 'public/study-library/augmentation/bibleistika-comparison.json'),
);

const crossUtilsPath = path.join(repoRoot, 'src/utils/crossReferensesUtils.ts');
const strongsUtilsPath = path.join(repoRoot, 'src/utils/strongsConcordanceUtils.ts');
const crossScriptPath = path.join(repoRoot, 'scripts/load-cross-references.php');
const strongsScriptPath = path.join(repoRoot, 'scripts/load-strongs-concordances.php');
const kjvstudyManifestPath = path.join(root, 'public/study-library/kjvstudy-manifest.json');

const [crossUtils, strongsUtils, crossScript, strongsScript, kjvstudyManifestRaw] = await Promise.all([
  readFile(crossUtilsPath, 'utf8'),
  readFile(strongsUtilsPath, 'utf8'),
  readFile(crossScriptPath, 'utf8'),
  readFile(strongsScriptPath, 'utf8'),
  readFile(kjvstudyManifestPath, 'utf8'),
]);

const kjvstudyManifest = JSON.parse(kjvstudyManifestRaw);

const report = {
  id: 'bibleistika-comparison',
  label: 'bibleistika Comparison and Augmentation Report',
  sourceRepo: 'https://github.com/vuesence/bibleistika',
  generatedAt: new Date().toISOString(),
  kjvstudyBaseline: {
    crossReferenceAnchors: kjvstudyManifest.crossReferences.referenceCount,
    strongsTokens: kjvstudyManifest.strongs.tokenCount,
    strongsWordStudies: kjvstudyManifest.strongs.wordStudyCount,
    verseCommentaryEntries: kjvstudyManifest.verseCommentary.entryCount,
  },
  bibleistikaSignals: {
    hasEncodedCrossReferenceClient: crossUtils.includes('split("`")') && crossUtils.includes('split("₋")'),
    hasEncodedStrongsClient: strongsUtils.includes('split("¡")'),
    hasCrossReferenceScraper: crossScript.includes('bible-teka.com/vs/'),
    hasStrongsScraper: strongsScript.includes('strong.php?'),
    inferredStrongsCoverage: extractInferredCoverage(strongsScript),
  },
  augmentationDecision: {
    status: 'deferred_as_primary_source',
    summary: 'Chronicle uses kjvstudy.org as the structured primary import and keeps bibleistika as a secondary audit/scraper reference.',
    reasons: [
      'bibleistika stores cross references and Strongs data in encoded runtime formats rather than committed normalized datasets.',
      'bibleistika generation depends on scraper scripts that fetch from bible-teka.com.',
      'kjvstudy.org already provides clean local JSON for cross references, verse commentary, and interlinear Strong’s tokens.',
    ],
    keepForFuture: [
      'compare encoded cross-reference breadth against kjvstudy if committed bibleistika exports become available',
      'use as a fallback extractor for missing Strong’s entries if a locally cached export is created later',
      'borrow compact encoding ideas if Chronicle needs an ultra-small mobile cache layer',
    ],
  },
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, outputPath)}`);

function extractInferredCoverage(scriptText) {
  const rangeMatch = scriptText.match(/\$max\s*=\s*\$type\s*===\s*"h"\s*\?\s*(\d+)\s*:\s*(\d+)/);
  return {
    hebrewMax: rangeMatch ? Number.parseInt(rangeMatch[1], 10) : null,
    greekMax: rangeMatch ? Number.parseInt(rangeMatch[2], 10) : null,
  };
}
