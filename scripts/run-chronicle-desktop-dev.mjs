import { spawn } from 'node:child_process';

const DEV_URL = process.env.CHRONICLE_DESKTOP_DEV_URL || 'http://127.0.0.1:5175';
const DEV_PORT = Number.parseInt(new URL(DEV_URL).port || '5175', 10);

function waitForUrl(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {}

      if (Date.now() >= deadline) {
        reject(new Error(`Chronicle dev server did not become ready at ${url}`));
        return;
      }

      setTimeout(attempt, 400);
    };

    void attempt();
  });
}

const viteProcess = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(DEV_PORT), '--strictPort'],
  { stdio: 'inherit', env: process.env },
);

viteProcess.on('exit', (code) => {
  if (code && code !== 0) {
    process.exit(code);
  }
});

try {
  await waitForUrl(DEV_URL);
  const electronProcess = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron', '.'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        CHRONICLE_DESKTOP_DEV_URL: DEV_URL,
      },
    },
  );

  electronProcess.on('exit', (code) => {
    viteProcess.kill('SIGTERM');
    process.exit(code || 0);
  });
} catch (error) {
  viteProcess.kill('SIGTERM');
  console.error(error instanceof Error ? error.message : 'Unable to start Chronicle desktop dev mode.');
  process.exit(1);
}
