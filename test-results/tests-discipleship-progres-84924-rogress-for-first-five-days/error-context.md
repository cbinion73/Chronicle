# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/discipleship-progress.spec.js >> discipleship workbook progress for first five days
- Location: tests/discipleship-progress.spec.js:46:1

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | import fs from 'node:fs';
  3  | import { expect } from '@playwright/test';
  4  | import { appUrl } from './testUrls';
  5  | 
  6  | async function seedStructuredDiscipleshipBook(page, request) {
  7  |   const libraryResponse = await request.get(appUrl('/api/study-imports/library'));
  8  |   expect(libraryResponse.ok()).toBeTruthy();
  9  |   const libraryPayload = await libraryResponse.json();
  10 |   const structuredRecord = libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan && /experiencing god/i.test(record.title))
  11 |     || libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan);
> 12 |   expect(structuredRecord).toBeTruthy();
     |                            ^ Error: expect(received).toBeTruthy()
  13 | 
  14 |   await page.addInitScript((record) => {
  15 |     const key = 'chronicle-app-state';
  16 |     const persisted = window.localStorage.getItem(key);
  17 |     const parsed = persisted ? JSON.parse(persisted) : { state: {}, version: 6 };
  18 |     const existingBooks = Array.isArray(parsed.state?.ownedBooks) ? parsed.state.ownedBooks.filter((book) => book.id !== record.id) : [];
  19 |     const nextBook = {
  20 |       id: record.id,
  21 |       title: record.title,
  22 |       sourcePath: record.storedPath,
  23 |       textPath: record.ocrTextPath || undefined,
  24 |       assets: record.assets,
  25 |       classification: record.classification || 'general-book',
  26 |       workflow: record.workflow === 'preserve-daily' ? 'preserve-daily' : 'ai-daily-study',
  27 |       status: 'ready',
  28 |       summary: record.summary || record.generatedPlan?.summary,
  29 |       importedAt: String(record.uploadedAt || '').split('T')[0],
  30 |       generatedPlan: record.generatedPlan,
  31 |       studyState: { currentDay: 1, bookmarks: [], entriesByDay: {} },
  32 |     };
  33 |     const next = {
  34 |       ...parsed,
  35 |       state: {
  36 |         ...parsed.state,
  37 |         ownedBooks: [nextBook, ...existingBooks],
  38 |         activeOwnedBookId: record.id,
  39 |       },
  40 |       version: typeof parsed.version === 'number' ? parsed.version : 6,
  41 |     };
  42 |     window.localStorage.setItem(key, JSON.stringify(next));
  43 |   }, structuredRecord);
  44 | }
  45 | 
  46 | test('discipleship workbook progress for first five days', async ({ page, request }) => {
  47 |   const rows = [];
  48 |   await seedStructuredDiscipleshipBook(page, request);
  49 | 
  50 |   await page.goto(appUrl('/discipleship'));
  51 |   await expect(page.getByRole('button', { name: /Workbook|Study/ }).first()).toBeVisible();
  52 |   await page.waitForTimeout(2500);
  53 |   await page.getByRole('button', { name: 'Workbook', exact: true }).click();
  54 | 
  55 |   const daySelect = page.locator('select').nth(1);
  56 |   for (const day of ['1', '2', '3', '4', '5']) {
  57 |     await daySelect.selectOption(day);
  58 |     await page.waitForTimeout(800);
  59 |     await page.getByRole('main').getByRole('button', { name: 'Study', exact: true }).click();
  60 |     await expect(page.getByText('Day Structure', { exact: true })).toBeVisible();
  61 |     await test.step(`day ${day} shows workbook QA`, async () => {
  62 |       await page.getByText('Workbook QA', { exact: true }).waitFor({ timeout: 10000 });
  63 |       await expect(page.getByRole('button', { name: /Refresh QA|Refreshing QA…/ })).toBeVisible();
  64 |       await expect(page.getByRole('button', { name: /Run Workbook QA|Running QA…/ })).toBeVisible();
  65 |     });
  66 |     await page.getByRole('button', { name: 'Workbook', exact: true }).click();
  67 |     await page.waitForTimeout(500);
  68 |     const header = await page.locator('main').getByText(new RegExp(`Day ${day} ·`)).first().textContent();
  69 |     const pages = await page.locator('text=/^Page \\d+/').allTextContents();
  70 |     const hotspots = await page.locator('button[aria-label^="Open "]').count();
  71 |     if (day === '4') {
  72 |       await expect(page.getByText('Page 24 · upper portion', { exact: true })).toBeVisible();
  73 |     }
  74 |     rows.push({ day: Number(day), header, pages, hotspots });
  75 |     await page.screenshot({ path: `/tmp/discipleship-day-${day}.png`, fullPage: true });
  76 |   }
  77 | 
  78 |   fs.writeFileSync('/tmp/discipleship-progress.json', JSON.stringify(rows, null, 2));
  79 | });
  80 | 
```