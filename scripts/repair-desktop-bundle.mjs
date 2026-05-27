import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const bundleRoot = resolve(projectRoot, 'dist-desktop', 'mac-arm64', 'Chronicle.app', 'Contents', 'Resources');
const asarPath = resolve(bundleRoot, 'app.asar');
const packagePath = resolve(projectRoot, '.desktop-app', 'package.json');
const asarBin = resolve(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'asar.cmd' : 'asar');

if (!existsSync(asarPath)) {
  throw new Error(`Chronicle desktop bundle was not found at ${asarPath}`);
}

if (!existsSync(packagePath)) {
  throw new Error(`Prepared desktop package manifest was not found at ${packagePath}`);
}

const asarListing = execFileSync(asarBin, ['list', asarPath], { encoding: 'utf8' });
if (asarListing.split('\n').includes('/package.json')) {
  console.log('[repair-desktop-bundle] app.asar already contains package.json');
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), 'chronicle-desktop-asar-'));
try {
  execFileSync(asarBin, ['extract', asarPath, tempDir], { stdio: 'inherit' });
  mkdirSync(tempDir, { recursive: true });
  cpSync(packagePath, join(tempDir, 'package.json'));
  rmSync(asarPath, { force: true });
  execFileSync(asarBin, ['pack', tempDir, asarPath], { stdio: 'inherit' });
  console.log('[repair-desktop-bundle] Injected package.json into app.asar');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
