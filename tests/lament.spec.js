import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 17: The Lament Room — a finite, four-station liturgy shaped by
// the classic lament psalm structure. No AI.

const COMPLAINT_TEXT = 'Playwright lament test complaint — this is genuinely hard.';
const PETITION_TEXT = 'Playwright lament test petition — please intervene.';
const TRUST_TEXT = 'Playwright lament test trust — even so, You are faithful.';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes('Playwright lament test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('the Lament Room keeps a complaint, petition, and turn to trust as one prayer', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/prayer/lament'));
  await expect(page.getByText('The Lament Room')).toBeVisible();
  await expect(page.getByText('The Complaint')).toBeVisible();

  await page.getByPlaceholder('Say it honestly, without softening it.').fill(COMPLAINT_TEXT);
  await page.getByPlaceholder('What do you want Him to do?').fill(PETITION_TEXT);
  await page.getByPlaceholder('Even so, You are...').fill(TRUST_TEXT);

  await page.getByRole('button', { name: 'Keep This Lament 🕯️' }).click();
  await expect(page.getByText('It is kept.')).toBeVisible();

  await page.goto(appUrl('/thread'));
  await expect(page.getByText(/^Lament —/).first()).toBeVisible();
  await expect(page.getByText(COMPLAINT_TEXT, { exact: false })).toBeVisible();

  await cleanupPriorRuns(request);
});
