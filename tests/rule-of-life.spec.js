import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 12: The Rule of Life — the Live pillar's flagship. Deliberately
// not a habit tracker: authored commitments in the user's own words, and a
// seasonal examen ceremony ("who are you becoming?") rather than a streak.

const RULE_TEXT = 'Playwright rule of life test commitment';
const EXAMEN_MARKER = 'Playwright seasonal examen response marker';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes(RULE_TEXT) || entry.body?.includes(EXAMEN_MARKER)) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('a written commitment appears under its category on the Rule page', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/rule'));
  await expect(page.getByRole('heading', { name: 'My Rule of Life' })).toBeVisible();

  const scriptureCard = page.getByText('📖 Scripture').locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await scriptureCard.getByRole('button', { name: '+ Add' }).click();
  await scriptureCard.getByPlaceholder(/Write a commitment for scripture/).fill(RULE_TEXT);
  await scriptureCard.getByRole('button', { name: 'Save' }).click();

  await expect(scriptureCard.getByText(RULE_TEXT)).toBeVisible();

  await cleanupPriorRuns(request);
});

test('the seasonal examen reviews the Rule and asks who you are becoming', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const createRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-rule-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'rule',
        title: RULE_TEXT.slice(0, 60),
        body: RULE_TEXT,
        sourceContext: { page: 'rule', rule: { category: 'prayer' } },
      },
    },
  });
  expect(createRes.ok()).toBeTruthy();

  await page.goto(appUrl('/rule'));
  await expect(page.getByText(RULE_TEXT)).toBeVisible();

  await page.getByRole('button', { name: 'Keep the Seasonal Examen' }).click();
  await expect(page.getByText('The Seasonal Examen', { exact: true })).toBeVisible();
  await expect(page.getByText(RULE_TEXT).last()).toBeVisible();

  await page.getByRole('button', { name: 'Sit with it →' }).click();
  await expect(page.getByText('Who are you becoming?')).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByPlaceholder(/Not what happened/).fill(EXAMEN_MARKER);
  await page.getByRole('button', { name: 'Keep the Examen ✚' }).click();

  await expect(page.getByText('The Seasonal Examen', { exact: true })).not.toBeVisible();

  await cleanupPriorRuns(request);
});
