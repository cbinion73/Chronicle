import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Cleans its own leftover data first — see REDESIGN.md Milestone 5 for why
// this matters: real DB rows (not localStorage) accumulate across repeated
// local runs and produce ambiguous-locator failures otherwise.
async function cleanupPriorRuns(request) {
  const res = await request.get(appUrl('/api/data/prayer-items'));
  if (res.ok()) {
    const { items } = await res.json();
    for (const item of items || []) {
      if (item.text === 'Playwright answered-light test request') {
        await request.delete(appUrl(`/api/data/prayer-items/${item.id}`));
      }
    }
  }
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title?.includes('Playwright answered-light test request')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('marking a request answered surfaces it on the Answered Light with its arc and passage', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/prayer'));
  await page.getByRole('button', { name: '+ Add Request' }).click();
  await page.getByPlaceholder('What would you like to bring before God?').fill('Playwright answered-light test request');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const card = page.getByText('Playwright answered-light test request').locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]').first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Mark Answered' }).click();
  await page.getByPlaceholder('Write the answer, provision, clarity, or change Chronicle should remember.').fill('Chronicle recorded the answer for this test.');
  await page.getByPlaceholder('Philippians 4:19').fill('Philippians 4:19');
  await page.getByRole('button', { name: 'Save Answer' }).click();

  await page.getByRole('button', { name: 'Open the Answered Light →' }).click();
  await expect(page).toHaveURL(/\/prayer\/answered-light/);
  await expect(page.getByText('The Answered Light')).toBeVisible();
  const lightCard = page.getByText('Playwright answered-light test request', { exact: true })
    .locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(lightCard).toBeVisible();
  await expect(lightCard.getByText('answered the same day')).toBeVisible();
  await expect(lightCard.getByText('Chronicle recorded the answer for this test.')).toBeVisible();

  await lightCard.getByRole('button', { name: 'Philippians 4:19' }).click();
  await expect(page).toHaveURL(/\/bible/);

  await cleanupPriorRuns(request);
});
