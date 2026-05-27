export const APP_URL = process.env.CHRONICLE_BASE_URL || 'http://127.0.0.1:5174';

export function appUrl(path = '') {
  if (!path) return APP_URL;
  return `${APP_URL}${path}`;
}
