import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const requiredSourceFields = [
  'id',
  'name',
  'source_type',
  'license_category',
  'attribution',
  'storage_rights',
  'modification_rights',
  'commercial_use',
  'notes',
];

const requiredThemeFields = ['id', 'name', 'category', 'color', 'description'];

async function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assertUnique(items, field, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[field])) {
      throw new Error(`${label} has duplicate ${field}: ${item[field]}`);
    }
    seen.add(item[field]);
  }
}

function assertFields(items, fields, label) {
  for (const item of items) {
    for (const field of fields) {
      if (!(field in item) || item[field] === '') {
        throw new Error(`${label} ${item.id ?? '(unknown)'} missing ${field}`);
      }
    }
  }
}

const sources = await readJson('data/seed/sources.json');
const themes = await readJson('data/seed/themes.json');
const schema = await readFile(path.join(root, 'data/schema.sql'), 'utf8');
const bibleManifest = await readJson('public/bibles/library/manifest.json');

assertFields(sources, requiredSourceFields, 'source');
assertUnique(sources, 'id', 'sources');

assertFields(themes, requiredThemeFields, 'theme');
assertUnique(themes, 'id', 'themes');

if (themes.length !== 12) {
  throw new Error(`expected 12 MVP themes, found ${themes.length}`);
}

for (const table of ['sources', 'verses', 'themes', 'theme_tags', 'graph_edges', 'chronicle_entries']) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    throw new Error(`schema missing table: ${table}`);
  }
}

if (typeof bibleManifest.schemaVersion !== 'number' || bibleManifest.schemaVersion < 1) {
  throw new Error('bible library manifest missing schemaVersion');
}

if (!Array.isArray(bibleManifest.translations) || bibleManifest.translations.length === 0) {
  throw new Error('bible library manifest missing translations');
}

console.log(`Validated ${sources.length} sources, ${themes.length} themes, and initial SQLite schema.`);
