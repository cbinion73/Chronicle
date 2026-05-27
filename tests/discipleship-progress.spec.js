import { test } from '@playwright/test';
import fs from 'node:fs';
import { expect } from '@playwright/test';
import { appUrl } from './testUrls';

async function seedStructuredDiscipleshipBook(page, request) {
  const libraryResponse = await request.get(appUrl('/api/study-imports/library'));
  expect(libraryResponse.ok()).toBeTruthy();
  const libraryPayload = await libraryResponse.json();
  const structuredRecord = libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan && /experiencing god/i.test(record.title))
    || libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan);
  expect(structuredRecord).toBeTruthy();

  await page.addInitScript((record) => {
    const key = 'chronicle-app-state';
    const persisted = window.localStorage.getItem(key);
    const parsed = persisted ? JSON.parse(persisted) : { state: {}, version: 6 };
    const existingBooks = Array.isArray(parsed.state?.ownedBooks) ? parsed.state.ownedBooks.filter((book) => book.id !== record.id) : [];
    const nextBook = {
      id: record.id,
      title: record.title,
      sourcePath: record.storedPath,
      textPath: record.ocrTextPath || undefined,
      assets: record.assets,
      classification: record.classification || 'general-book',
      workflow: record.workflow === 'preserve-daily' ? 'preserve-daily' : 'ai-daily-study',
      status: 'ready',
      summary: record.summary || record.generatedPlan?.summary,
      importedAt: String(record.uploadedAt || '').split('T')[0],
      generatedPlan: record.generatedPlan,
      studyState: { currentDay: 1, bookmarks: [], entriesByDay: {} },
    };
    const next = {
      ...parsed,
      state: {
        ...parsed.state,
        ownedBooks: [nextBook, ...existingBooks],
        activeOwnedBookId: record.id,
      },
      version: typeof parsed.version === 'number' ? parsed.version : 6,
    };
    window.localStorage.setItem(key, JSON.stringify(next));
  }, structuredRecord);
}

test('discipleship workbook progress for first five days', async ({ page, request }) => {
  const rows = [];
  await seedStructuredDiscipleshipBook(page, request);

  await page.goto(appUrl('/discipleship'));
  await expect(page.getByRole('button', { name: /Workbook|Study/ }).first()).toBeVisible();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Workbook', exact: true }).click();

  const daySelect = page.locator('select').nth(1);
  for (const day of ['1', '2', '3', '4', '5']) {
    await daySelect.selectOption(day);
    await page.waitForTimeout(800);
    await page.getByRole('main').getByRole('button', { name: 'Study', exact: true }).click();
    await expect(page.getByText('Day Structure', { exact: true })).toBeVisible();
    await test.step(`day ${day} shows workbook QA`, async () => {
      await page.getByText('Workbook QA', { exact: true }).waitFor({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /Refresh QA|Refreshing QA…/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Run Workbook QA|Running QA…/ })).toBeVisible();
    });
    await page.getByRole('button', { name: 'Workbook', exact: true }).click();
    await page.waitForTimeout(500);
    const header = await page.locator('main').getByText(new RegExp(`Day ${day} ·`)).first().textContent();
    const pages = await page.locator('text=/^Page \\d+/').allTextContents();
    const hotspots = await page.locator('button[aria-label^="Open "]').count();
    if (day === '4') {
      await expect(page.getByText('Page 24 · upper portion', { exact: true })).toBeVisible();
    }
    rows.push({ day: Number(day), header, pages, hotspots });
    await page.screenshot({ path: `/tmp/discipleship-day-${day}.png`, fullPage: true });
  }

  fs.writeFileSync('/tmp/discipleship-progress.json', JSON.stringify(rows, null, 2));
});
