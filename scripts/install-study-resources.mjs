import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data/resources/study-resources.json');
const installManifestPath = path.join(root, 'data/vendor/install-manifest.json');

const resources = JSON.parse(await readFile(manifestPath, 'utf8'));
const installs = [];

for (const resource of resources) {
  if (!resource.archive) {
    const installDir = path.join(root, resource.installDir);
    await mkdir(installDir, { recursive: true });
    await writeFile(
      path.join(installDir, 'README.md'),
      `# ${resource.name}\n\n${resource.notes}\n\nSource: ${resource.url}\n`,
      'utf8',
    );
    installs.push({ id: resource.id, kind: resource.kind, status: 'registered', url: resource.url });
    continue;
  }

  const archivePath = path.join(root, resource.archive);
  const installDir = path.join(root, resource.installDir);
  await mkdir(path.dirname(archivePath), { recursive: true });
  await mkdir(installDir, { recursive: true });

  await download(resource.url, archivePath);
  const archiveStats = await stat(archivePath);
  const sha256 = await hashFile(archivePath);

  if (resource.extract) {
    await mkdir(installDir, { recursive: true });
    await unzip(archivePath, installDir, resource.include || []);
  }

  installs.push({
    id: resource.id,
    kind: resource.kind,
    status: 'installed',
    archive: resource.archive,
    installDir: resource.installDir,
    bytes: archiveStats.size,
    sha256,
    url: resource.url,
  });
  console.log(`Installed ${resource.id} (${formatBytes(archiveStats.size)})`);
}

await writeFile(
  installManifestPath,
  `${JSON.stringify({ installedAt: new Date().toISOString(), resources: installs }, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${path.relative(root, installManifestPath)}`);

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await new Promise((resolve, reject) => {
    const file = createWriteStream(destination);
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          file.write(Buffer.from(chunk));
        },
        close() {
          file.end(resolve);
        },
        abort(error) {
          file.destroy(error);
          reject(error);
        },
      }),
    ).catch((error) => {
      file.destroy(error);
      reject(error);
    });
  });
}

async function hashFile(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

async function unzip(archivePath, destination, includePatterns) {
  await new Promise((resolve, reject) => {
    const args = ['-oq', archivePath, ...includePatterns, '-d', destination];
    const child = spawn('unzip', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`unzip exited with code ${code}`));
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
