import { cp, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const webBuild = resolve(projectRoot, 'dist');
const destination = resolve(projectRoot, 'apple', 'ChronicleApp', 'WebApp');
const temporary = `${destination}.tmp-${process.pid}`;
const backup = `${destination}.backup-${process.pid}`;

try {
  const buildStat = await stat(resolve(webBuild, 'index.html'));
  if (!buildStat.isFile()) throw new Error('dist/index.html is not a file');
} catch {
  throw new Error('Chronicle web build is missing. Run `npm run build` first.');
}

const index = await readFile(resolve(webBuild, 'index.html'), 'utf8');
const localReferences = [...index.matchAll(/(?:src|href)="\/(?!\/)([^"?#]+)/g)].map((match) => match[1]);
for (const reference of localReferences) {
  try {
    await stat(resolve(webBuild, reference));
  } catch {
    throw new Error(`Chronicle web build references a missing asset: /${reference}`);
  }
}

await rm(temporary, { recursive: true, force: true });
await rm(backup, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });
await cp(webBuild, temporary, { recursive: true });

let movedExisting = false;
try {
  try {
    await rename(destination, backup);
    movedExisting = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await rename(temporary, destination);
  await rm(backup, { recursive: true, force: true });
} catch (error) {
  await rm(temporary, { recursive: true, force: true });
  if (movedExisting) await rename(backup, destination);
  throw error;
}

console.log(`Prepared Chronicle iPad web bundle at ${destination}`);
