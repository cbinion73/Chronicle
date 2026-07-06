// Deliberately NOT 5174: a persistent LaunchAgent (com.chronicle.local-lan) can hold
// that port with an unrelated, out-of-date checkout, and Playwright's
// reuseExistingServer would silently test against it instead of this repo.
export const APP_URL = process.env.CHRONICLE_BASE_URL || 'http://127.0.0.1:5183';

export function appUrl(path = '') {
  if (!path) return APP_URL;
  return `${APP_URL}${path}`;
}
