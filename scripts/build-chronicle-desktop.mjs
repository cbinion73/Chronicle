import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const target = process.argv[2] || 'dir';

function run(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let combined = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      combined += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      combined += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolvePromise({ code: code || 0, output: combined });
    });
  });
}

const prepareResult = await run(npmCommand, ['run', 'desktop:prepare']);
if (prepareResult.code !== 0) process.exit(prepareResult.code);

const buildResult = await run(npmCommand, ['run', 'build']);
if (buildResult.code !== 0) process.exit(buildResult.code);

const builderResult = await run(npxCommand, ['electron-builder', '--mac', target]);
if (builderResult.code === 0) process.exit(0);

if (
  existsSync(resolve(projectRoot, 'dist-desktop', 'mac-arm64', 'Chronicle.app'))
  && builderResult.output.includes('"package.json" was not found in this archive')
) {
  const repairResult = await run(process.execPath, [resolve(projectRoot, 'scripts', 'repair-desktop-bundle.mjs')]);
  process.exit(repairResult.code);
}

process.exit(builderResult.code);
import { existsSync } from 'node:fs';
