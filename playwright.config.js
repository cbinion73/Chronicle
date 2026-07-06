import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Deliberately NOT 5174: a persistent LaunchAgent (com.chronicle.local-lan) can hold
// that port with an unrelated, out-of-date checkout, and reuseExistingServer would
// silently point tests at it instead of this working tree.
const baseURL = process.env.CHRONICLE_BASE_URL || 'http://127.0.0.1:5183';

// Playwright's `request` fixture is a plain HTTP client — unlike a real browser it
// never runs src/lib/apiAuth.ts, so it needs the Chronicle API token attached here
// or every /api/* call 401s as soon as CHRONICLE_API_TOKEN is configured.
function readChronicleApiToken() {
  if (process.env.CHRONICLE_API_TOKEN) return process.env.CHRONICLE_API_TOKEN;
  const envLocalPath = new URL('.env.local', import.meta.url);
  if (!existsSync(envLocalPath)) return '';
  const match = readFileSync(envLocalPath, 'utf8').match(/^CHRONICLE_API_TOKEN=(.+)$/m);
  return match ? match[1].trim() : '';
}

const apiToken = readChronicleApiToken();

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  use: {
    baseURL,
    extraHTTPHeaders: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
  },
});
