import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const appDir = resolve(projectRoot, '.desktop-app');
const electronDir = resolve(projectRoot, 'electron');
const nodeModulesDir = resolve(projectRoot, 'node_modules');
const packageJsonPath = resolve(projectRoot, 'package.json');

const rootPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
cpSync(electronDir, join(appDir, 'electron'), { recursive: true, force: true });

const desktopPackage = {
  name: rootPackage.name,
  version: rootPackage.version,
  description: rootPackage.description,
  author: rootPackage.author,
  productName: rootPackage.build?.productName || 'Chronicle',
  type: 'module',
  main: 'electron/main.mjs',
  dependencies: rootPackage.dependencies || {},
};

writeFileSync(join(appDir, 'package.json'), `${JSON.stringify(desktopPackage, null, 2)}\n`, 'utf8');

if (existsSync(nodeModulesDir)) {
  symlinkSync(nodeModulesDir, join(appDir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
}
