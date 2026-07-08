import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 19: The Oral History — the Archaeology's interview engine
// pointed at someone else. Covers the primary (voice-free) path: type
// the subject's name and relationship, answer one prompt by hand, skip
// the rest, then confirm the stone lands on /heritage grouped under
// that subject's name.

const SUBJECT_NAME = 'Playwright Grandma Ruth';
const RELATIONSHIP = 'grandmother';
const ANSWER_TEXT = 'Playwright oral history test — she remembered the day she was baptized in the river.';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes('Playwright oral history test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('an oral history interview sets a stone grouped under its subject on the Heritage Room', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/heritage'));
  await expect(page.getByRole('heading', { name: 'The Heritage Room' })).toBeVisible();

  await page.getByRole('button', { name: '+ New Interview' }).click();
  await page.getByPlaceholder('Their name').fill(SUBJECT_NAME);
  await page.getByPlaceholder(/Their relationship to you/).fill(RELATIONSHIP);
  await page.getByRole('button', { name: 'Begin the Interview →' }).click();

  // First prompt: answer by hand, no recording.
  await expect(page.getByText('1 of 7')).toBeVisible();
  await page.getByPlaceholder(/What do they remember about it/).fill(ANSWER_TEXT);
  await page.getByRole('button', { name: 'Set This Stone ✚' }).click();

  // Skip the remaining five prompts to reach completion.
  await expect(page.getByText('2 of 7')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Skip this one' }).click();
  }
  await expect(page.getByText(/stone.* set for/)).toBeVisible();

  await page.getByRole('button', { name: 'Back to the Heritage Room' }).click();
  await expect(page.getByRole('heading', { name: SUBJECT_NAME })).toBeVisible();
  const subjectSection = page.locator('section', { has: page.getByRole('heading', { name: SUBJECT_NAME }) });
  await expect(subjectSection.getByText(RELATIONSHIP, { exact: true })).toBeVisible();
  await expect(subjectSection.getByText(ANSWER_TEXT)).toBeVisible();

  await cleanupPriorRuns(request);
});
