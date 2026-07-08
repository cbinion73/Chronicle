import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 17: The Question Lab — open questions held with dignity;
// resolution is a ceremony and a stone.

const QUESTION_TEXT = 'Playwright question lab test — what is God asking of me?';
const RESOLUTION_TEXT = 'Playwright question lab test resolution — clarity came.';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes('Playwright question lab test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('a question can be asked, held open, then resolved into a stone', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/questions'));
  await expect(page.getByRole('heading', { name: 'The Question Lab' })).toBeVisible();

  await page.getByRole('button', { name: '+ Ask a Question' }).click();
  await page.getByPlaceholder(/What are you carrying/).fill(QUESTION_TEXT);
  await page.getByRole('button', { name: 'Ask It' }).click();

  const openCard = page.getByText(QUESTION_TEXT, { exact: true }).locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(openCard).toBeVisible();
  await expect(openCard.getByText('asked today')).toBeVisible();

  await openCard.getByRole('button', { name: 'This Is Resolving →' }).click();
  await expect(page.getByText('This Question Is Resolving')).toBeVisible();
  await expect(page.getByText(QUESTION_TEXT, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Sit with it →' }).click();
  await expect(page.getByText('What changed?').first()).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByPlaceholder(/Write what you now know/).fill(RESOLUTION_TEXT);
  await page.getByRole('button', { name: 'Set the Stone ✚' }).click();

  await expect(page.getByText('Resolved — the Stones')).toBeVisible();
  await expect(page.getByText(RESOLUTION_TEXT)).toBeVisible();
  await expect(page.getByText('This Is Resolving →')).not.toBeVisible();

  await cleanupPriorRuns(request);
});
