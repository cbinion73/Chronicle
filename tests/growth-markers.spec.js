import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Cleans its own leftover data first — see REDESIGN.md Milestone 5/6 for why
// this matters: real DB rows (not localStorage) accumulate across repeated
// local runs and produce ambiguous-locator failures otherwise.
async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title?.includes('Playwright growth marker test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('marking a growth moment surfaces it on the Growth spine with its kind and passage', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/thread/growth'));
  await expect(page.getByText('The Growth Spine')).toBeVisible();

  await page.getByRole('button', { name: '+ Add a Growth Marker' }).click();
  await page.getByRole('button', { name: 'Calling Clarified' }).click();
  await page.getByPlaceholder("Title (optional — we'll generate one from your entry)").fill('Playwright growth marker test');
  await page.getByPlaceholder('Write here... what did God show you? What are you carrying? What are you grateful for?')
    .fill('Chronicle recorded this test marker for Playwright.');
  await page.getByPlaceholder('Passage (e.g. Psalm 23:1, optional)').fill('Jeremiah 29:11');
  await page.getByRole('button', { name: 'Save to Chronicle', exact: true }).first().click();

  const markerCard = page.getByText('Playwright growth marker test', { exact: true })
    .locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(markerCard).toBeVisible();
  await expect(markerCard.getByText('🧭 Calling Clarified')).toBeVisible();
  await expect(markerCard.getByText('Chronicle recorded this test marker for Playwright.')).toBeVisible();

  await markerCard.getByRole('button', { name: 'Jeremiah 29:11' }).click();
  await expect(page).toHaveURL(/\/bible/);

  await cleanupPriorRuns(request);
});
