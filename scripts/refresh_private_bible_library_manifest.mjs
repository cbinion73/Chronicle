import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const libraryRoot = path.join(root, 'public', 'bibles', 'library');
const legacyRoot = path.join(root, 'public', 'bibles', 'helloao');

const existingManifest = await readJsonSafe(path.join(libraryRoot, 'manifest.json'));
const translationDirs = await readdir(libraryRoot, { withFileTypes: true });

const translations = [];
for (const entry of translationDirs) {
  if (!entry.isDirectory()) continue;
  const manifestPath = path.join(libraryRoot, entry.name, 'manifest.json');
  const manifest = await readJsonSafe(manifestPath);
  if (!manifest) continue;
  translations.push({
    providerId: manifest.providerId,
    id: manifest.id,
    label: manifest.label,
    basePath: `/bibles/library/${manifest.id}`,
    sourceLabel: manifest.sourceLabel,
  });
}

const legacyManifest = await readJsonSafe(path.join(legacyRoot, 'manifest.json'));
for (const entry of legacyManifest?.translations || []) {
  if (translations.some((translation) => translation.providerId === entry.providerId)) continue;
  translations.push({
    providerId: entry.providerId,
    id: entry.id,
    label: entry.label,
    basePath: entry.basePath || `/bibles/helloao/${entry.id}`,
    sourceLabel: entry.sourceLabel,
  });
}

translations.sort((a, b) => a.label.localeCompare(b.label));

const nextManifest = {
  installedAt: new Date().toISOString(),
  translations,
};

await writeFile(path.join(libraryRoot, 'manifest.json'), `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, path.join(libraryRoot, 'manifest.json'))} with ${translations.length} translation(s).`);

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}
