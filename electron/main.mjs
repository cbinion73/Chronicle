import { app, BrowserWindow, shell } from 'electron';
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const preloadPath = join(__dirname, 'preload.mjs');
const DESKTOP_PORT = Number.parseInt(process.env.CHRONICLE_DESKTOP_PORT || '43174', 10);
const DEV_URL = process.env.CHRONICLE_DESKTOP_DEV_URL || '';
const STARTUP_LOG_PATH = join(process.env.HOME || tmpdir(), 'Library', 'Logs', 'ChronicleDesktop', 'main.log');

let mainWindow = null;
let serviceProcess = null;
let isQuitting = false;

function debugLog(message) {
  try {
    mkdirSync(dirname(STARTUP_LOG_PATH), { recursive: true });
    appendFileSync(STARTUP_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`);
  } catch {}
}

debugLog('module loaded');

process.on('uncaughtException', (error) => {
  debugLog(`uncaughtException: ${error?.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
  debugLog(`unhandledRejection: ${reason?.stack || reason}`);
});

function parseDotEnv(contents) {
  return contents
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return values;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return values;
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
      return values;
    }, {});
}

function mergeEnvFile(target, path) {
  if (!existsSync(path)) return;
  Object.assign(target, parseDotEnv(readFileSync(path, 'utf8')));
}

function getRuntimeSourceRoot() {
  return app.isPackaged
    ? join(process.resourcesPath, 'chronicle-runtime')
    : app.getAppPath();
}

function syncDirectory(sourceDir, targetDir, { preserveExisting = false } = {}) {
  if (!existsSync(sourceDir)) return;
  if (!preserveExisting) {
    mkdirSync(targetDir, { recursive: true });
    cpSync(sourceDir, targetDir, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const sourceStats = statSync(sourcePath);
    if (sourceStats.isDirectory()) {
      syncDirectory(sourcePath, targetPath, { preserveExisting: true });
      continue;
    }
    if (!existsSync(targetPath)) {
      syncFile(sourcePath, targetPath);
    }
  }
}

function syncFile(sourcePath, targetPath, { preserveExisting = false } = {}) {
  if (!existsSync(sourcePath)) return;
  mkdirSync(dirname(targetPath), { recursive: true });
  if (preserveExisting && existsSync(targetPath)) return;
  cpSync(sourcePath, targetPath, { force: true });
}

function ensureNodeModulesLink(serviceRoot, runtimeRoot) {
  debugLog(`ensuring node_modules link from ${serviceRoot} to ${runtimeRoot}`);
  const linkPath = join(serviceRoot, 'node_modules');
  const targetPath = join(runtimeRoot, 'node_modules');
  if (!existsSync(targetPath)) {
    throw new Error(`Chronicle desktop runtime is missing node_modules at ${targetPath}`);
  }

  try {
    const current = lstatSync(linkPath);
    if (current.isSymbolicLink()) {
      rmSync(linkPath, { recursive: true, force: true });
    } else {
      rmSync(linkPath, { recursive: true, force: true });
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  symlinkSync(targetPath, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

function migrateLegacyDataIfNeeded(targetDataRoot) {
  const candidates = [
    process.env.CHRONICLE_MIGRATE_DATA_ROOT || '',
    join(app.getPath('home'), 'Library', 'Application Support', 'ChronicleService', 'app', 'data'),
    join(app.getPath('home'), 'Library', 'Application Support', 'ChronicleService', 'service', 'data'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    debugLog(`migrating legacy data from ${candidate}`);
    syncDirectory(candidate, targetDataRoot, { preserveExisting: true });
    return candidate;
  }

  return null;
}

function ensureServiceRoot() {
  debugLog('ensureServiceRoot start');
  const appRoot = app.getAppPath();
  const runtimeRoot = getRuntimeSourceRoot();
  const serviceRoot = join(app.getPath('userData'), 'service');
  mkdirSync(serviceRoot, { recursive: true });

  const runtimeDirs = ['dist', 'public', 'scripts', 'src'];
  for (const dirName of runtimeDirs) {
    syncDirectory(join(runtimeRoot, dirName), join(serviceRoot, dirName));
  }

  const sourceDataRoot = join(runtimeRoot, 'data');
  const serviceDataRoot = join(serviceRoot, 'data');
  if (existsSync(sourceDataRoot)) {
    syncDirectory(sourceDataRoot, serviceDataRoot, { preserveExisting: true });
  } else {
    mkdirSync(serviceDataRoot, { recursive: true });
    migrateLegacyDataIfNeeded(serviceDataRoot);
  }

  for (const fileName of ['vite.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    syncFile(join(runtimeRoot, fileName), join(serviceRoot, fileName));
  }

  syncFile(join(appRoot, '.env.local'), join(serviceRoot, '.env.local'), { preserveExisting: true });
  syncFile(join(app.getPath('userData'), 'chronicle.env'), join(serviceRoot, '.env.local'), { preserveExisting: true });
  ensureNodeModulesLink(serviceRoot, runtimeRoot);
  debugLog(`ensureServiceRoot ready at ${serviceRoot}`);

  return serviceRoot;
}

function waitForUrl(url, timeoutMs = 30000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode || 500) < 500) {
          resolvePromise();
          return;
        }
        if (Date.now() >= deadline) {
          rejectPromise(new Error(`Chronicle desktop server did not become ready at ${url}`));
          return;
        }
        setTimeout(attempt, 400);
      });
      request.on('error', () => {
        if (Date.now() >= deadline) {
          rejectPromise(new Error(`Chronicle desktop server did not become ready at ${url}`));
          return;
        }
        setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

function createServiceEnv(serviceRoot) {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    CHRONICLE_DESKTOP_APP: '1',
  };
  mergeEnvFile(env, join(serviceRoot, '.env.local'));
  return env;
}

async function startEmbeddedService() {
  debugLog('startEmbeddedService start');
  const serviceRoot = ensureServiceRoot();
  const appRoot = app.getAppPath();
  const viteBin = join(appRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const serviceUrl = `http://127.0.0.1:${DESKTOP_PORT}`;
  const logPath = join(app.getPath('userData'), 'chronicle-desktop-service.log');

  serviceProcess = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(DESKTOP_PORT), '--strictPort'],
    {
      cwd: serviceRoot,
      env: createServiceEnv(serviceRoot),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  serviceProcess.stdout.on('data', (chunk) => {
    appendFileSync(logPath, chunk.toString());
  });
  serviceProcess.stderr.on('data', (chunk) => {
    appendFileSync(logPath, chunk.toString());
  });

  serviceProcess.on('exit', (code) => {
    if (!isQuitting) {
      appendFileSync(logPath, `\n[chronicle-desktop] service exited with code ${code ?? 'unknown'}\n`);
    }
  });

  await waitForUrl(serviceUrl, 45000);
  debugLog(`embedded service ready at ${serviceUrl}`);
  return serviceUrl;
}

async function createMainWindow() {
  debugLog('createMainWindow start');
  const startUrl = DEV_URL || await startEmbeddedService();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#f4efe7',
    title: 'Chronicle',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (DEV_URL && url.startsWith(DEV_URL)) return;
    if (!DEV_URL && url.startsWith(`http://127.0.0.1:${DESKTOP_PORT}`)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  await mainWindow.loadURL(startUrl);
  debugLog(`window loaded ${startUrl}`);
}

async function shutdownService() {
  if (!serviceProcess || serviceProcess.killed) return;
  const next = serviceProcess;
  serviceProcess = null;
  next.kill('SIGTERM');
}

app.on('before-quit', () => {
  isQuitting = true;
  void shutdownService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

async function main() {
  debugLog(`main start; app.isPackaged=${app.isPackaged}; app.isReady=${app.isReady()}`);
  await app.whenReady();
  debugLog('app ready');
  await createMainWindow();
}

void main().catch((error) => {
  debugLog(`startup failure: ${error?.stack || error}`);
  app.exit(1);
});
