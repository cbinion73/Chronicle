import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

await run('python3', ['scripts/import_commentaries_database.py'], root);
await run('node', ['scripts/import-kjvstudy-data.mjs'], root);
await run('node', ['scripts/compare-bibleistika.mjs'], root);

const [commentaryManifest, crossRefManifest, strongsManifest, kjvstudyManifest, bibleistikaReport] = await Promise.all([
  readJson('public/study-library/commentaries/commentaries-database/manifest.json'),
  readJson('public/study-library/cross-references/kjvstudy/manifest.json'),
  readJson('public/study-library/strongs/kjvstudy/manifest.json'),
  readJson('public/study-library/kjvstudy-manifest.json'),
  readJson('public/study-library/augmentation/bibleistika-comparison.json'),
]);

const manifest = {
  generatedAt: new Date().toISOString(),
  datasets: [
    commentaryManifest,
    crossRefManifest,
    strongsManifest,
    kjvstudyManifest.verseCommentary,
    bibleistikaReport,
  ],
};

await mkdir(path.join(root, 'data/study'), { recursive: true });
await writeFile(path.join(root, 'public/study-library/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, 'data/study/import-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('Study library import complete.');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}
