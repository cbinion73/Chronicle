import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

function primaryNavItem(page, label) {
  return page.getByRole('navigation').first().getByText(label, { exact: true });
}

test('search, quick navigation, and manual Chronicle entry flow stay usable', async ({ page }) => {
  await page.goto(appUrl('/'));
  await expect(page.getByText('The Daily Office').first()).toBeVisible();

  await page.getByRole('button', { name: /Search/i }).first().click();
  await expect(page.getByPlaceholder('Search Scripture, themes, Chronicle entries...')).toBeVisible();
  await expect(page.getByText('Quick Links')).toBeVisible();
  await page.getByText('My Chronicle', { exact: true }).click();
  await expect(page).toHaveURL(/\/thread/);
  await expect(page.getByText('Formation Story')).toBeVisible();

  await page.locator('button[title="New Chronicle entry (⌘N)"]').click();
  await expect(page.getByText('New Chronicle Entry')).toBeVisible();
  await page.getByPlaceholder(/Title \(optional/i).fill('Battery note');
  await page.getByPlaceholder(/Write here/i).fill('Battery test note saved through the global quick-capture flow.');
  await page.getByPlaceholder(/Passage \(e\.g\./i).fill('Psalm 23:1');
  await page.getByRole('button', { name: 'Save to Chronicle' }).last().click();

  await expect(page.getByText('Battery note').first()).toBeVisible();
  await expect(page.getByText('Battery test note saved through the global quick-capture flow.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Psalm 23:1' }).first()).toBeVisible();
});

test('core page shells and key headings render across the full product surface', async ({ page }) => {
  const pages = [
    { label: 'The Daily Office', path: '/', assert: async () => expect(page.getByText('Call to Worship').first()).toBeVisible() },
    { label: 'Read', path: '/bible', assert: async () => expect(page.getByRole('button', { name: /Theme Overlay|Open Themes/ }).first()).toBeVisible() },
    { label: 'Daily Study', path: '/study', assert: async () => expect(page.getByText(/Day \d+ ·/).first()).toBeVisible() },
    { label: 'Discipleship', path: '/discipleship', assert: async () => expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible() },
    { label: 'The Prayer Room', path: '/prayer', assert: async () => expect(page.getByText('Pray Now', { exact: false }).last()).toBeVisible() },
    { label: 'The Thread', path: '/thread', assert: async () => expect(page.getByText('Formation Story').first()).toBeVisible() },
    { label: 'The Thread', path: '/thread/patterns', assert: async () => expect(page.getByText('Formation Summary').first()).toBeVisible() },
    { label: 'Themes', path: '/themes', assert: async () => expect(page.getByPlaceholder('Find a theme...')).toBeVisible() },
    { label: 'Reading Plans', path: '/plans', assert: async () => expect(page.getByText('Active Plan').first()).toBeVisible() },
    { label: 'Settings', path: '/settings', assert: async () => expect(page.getByText('Profile', { exact: true }).last()).toBeVisible() },
  ];

  for (const entry of pages) {
    await page.goto(appUrl(entry.path));
    await expect(primaryNavItem(page, entry.label)).toBeVisible();
    await entry.assert();
  }

  // v1 routes must permanently redirect into the Thread room — nothing a user
  // bookmarked before the rebuild is allowed to break.
  await page.goto(appUrl('/chronicle'));
  await expect(page).toHaveURL(/\/thread$/);
  await page.goto(appUrl('/legacy'));
  await expect(page).toHaveURL(/\/thread\/story$/);
  await page.goto(appUrl('/insights'));
  await expect(page).toHaveURL(/\/thread\/patterns$/);
});

test('operational endpoints stay coherent enough for end-to-end testing', async ({ request }) => {
  const [syncRes, studyLibraryRes, workbookAuditRes, voiceStatusRes] = await Promise.all([
    request.get(appUrl('/api/chronicle-sync/status')),
    request.get(appUrl('/api/study-imports/library')),
    request.get(appUrl('/api/study-imports/workbook-audit')),
    request.get(appUrl('/api/voice/status')),
  ]);

  expect(syncRes.ok()).toBeTruthy();
  const syncPayload = await syncRes.json();
  expect(syncPayload.summary?.snapshotCount || 0).toBeGreaterThanOrEqual(0);

  expect(studyLibraryRes.ok()).toBeTruthy();
  const studyLibraryPayload = await studyLibraryRes.json();
  expect(Array.isArray(studyLibraryPayload.records)).toBeTruthy();
  expect(studyLibraryPayload.manifest?.schemaVersion || 0).toBeGreaterThan(0);

  expect(workbookAuditRes.ok()).toBeTruthy();
  const workbookAuditPayload = await workbookAuditRes.json();
  expect(Array.isArray(workbookAuditPayload.audits)).toBeTruthy();

  expect(voiceStatusRes.ok()).toBeTruthy();
  const voiceStatusPayload = await voiceStatusRes.json();
  expect(voiceStatusPayload.ok).toBeTruthy();
  expect(voiceStatusPayload.providers).toBeTruthy();
});
