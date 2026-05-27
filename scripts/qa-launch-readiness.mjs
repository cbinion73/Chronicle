import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const trackerPath = resolve(root, 'docs/bmad/execution-tracker.csv');
const launchDocPath = resolve(root, 'docs/bmad/launch-readiness-pass.md');
const bibleManifestPath = resolve(root, 'public/bibles/library/manifest.json');
const studyManifestPath = resolve(root, 'data/library/manifest.json');
const workbookAuditPath = resolve(root, 'data/library/qa/discipleship-workbook-audit.json');

assert(existsSync(trackerPath), 'Execution tracker CSV is missing.');
assert(existsSync(launchDocPath), 'Launch readiness pass doc is missing.');
assert(existsSync(bibleManifestPath), 'Bible library manifest is missing.');
assert(existsSync(studyManifestPath), 'Study library manifest is missing.');
assert(existsSync(workbookAuditPath), 'Workbook audit report is missing.');

const tracker = readFileSync(trackerPath, 'utf8');
const trackerRows = tracker.split('\n').slice(1).filter(Boolean);
for (const storyId of ['P2.5.1', 'P2.5.2', 'P2.5.3', 'P2.5.4', 'P2.5.5']) {
  const row = trackerRows.find((line) => line.includes(`"${storyId} -`) || line.includes(`"${storyId}`));
  assert(row, `Tracker row for ${storyId} is missing.`);
  assert(row.includes('"done",100'), `Tracker row for ${storyId} is not marked done.`);
}

const bibleManifest = readJson(bibleManifestPath);
const studyManifest = readJson(studyManifestPath);
const workbookAudit = readJson(workbookAuditPath);

assert(Array.isArray(bibleManifest.translations) && bibleManifest.translations.length > 0, 'Bible library manifest has no translations.');
assert(Number(studyManifest.schemaVersion) > 0, 'Study library manifest schema version is missing.');
assert(Array.isArray(workbookAudit.audits), 'Workbook audit entries are missing.');

const summary = {
  trackerValidated: true,
  bibleTranslations: bibleManifest.translations.length,
  studyManifestVersion: studyManifest.schemaVersion,
  workbookAuditEntries: workbookAudit.audits.length,
  workbookWarnings: Array.isArray(workbookAudit.warnings) ? workbookAudit.warnings.length : 0,
};

console.log(`[qa:launch] Launch readiness checks passed. ${JSON.stringify(summary)}`);
