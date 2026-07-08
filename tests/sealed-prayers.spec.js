import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 14: Sealed Prayers — "seen, not touchable" until a future date
// or event. The body must never render (Sealed Prayers page, the Record
// view, or an export) until deliberately opened.

const EVENT_TITLE = 'Playwright sealed prayer event test';
const EVENT_BODY = 'This is the secret sealed content for the event test.';
const DATE_TITLE = 'Playwright sealed prayer date test';
const DATE_BODY = 'This is the secret sealed content for the date test.';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title === EVENT_TITLE || entry.title === DATE_TITLE) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('a prayer sealed to an event stays locked everywhere until deliberately opened', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/prayer/sealed'));
  await expect(page.getByRole('heading', { name: 'Sealed Prayers' })).toBeVisible();

  await page.getByRole('button', { name: 'Seal a Prayer' }).click();
  await page.getByPlaceholder(/A label \(optional/).fill(EVENT_TITLE);
  await page.getByPlaceholder(/What do you want to say/).fill(EVENT_BODY);
  await page.getByRole('button', { name: 'Continue →' }).click();

  await page.getByRole('button', { name: 'When something happens' }).click();
  await page.getByPlaceholder(/when she gets married/).fill('when this test passes');
  await page.getByRole('button', { name: 'Seal It 🔒' }).click();
  await expect(page.getByText('Sealing it…')).toBeVisible();

  const card = page.getByText(EVENT_TITLE, { exact: true }).locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(card).toBeVisible({ timeout: 5000 });
  await expect(card.getByText('Opens when: when this test passes')).toBeVisible();
  // No "Open This Prayer" button — nothing marks this as unlockable yet.
  await expect(card.getByRole('button', { name: 'Open This Prayer' })).not.toBeVisible();
  await expect(page.getByText(EVENT_BODY)).not.toBeVisible();

  // Nor does it leak into the Record view.
  await page.goto(appUrl('/thread'));
  await expect(page.getByText(EVENT_TITLE, { exact: true })).toBeVisible();
  await expect(page.getByText(EVENT_BODY)).not.toBeVisible();
  await expect(page.getByText(/🔒 Sealed — opens when: when this test passes/)).toBeVisible();

  await cleanupPriorRuns(request);
});

test('a prayer sealed to a past date can be deliberately opened', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const createRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-sealed-date-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'sealed',
        title: DATE_TITLE,
        body: DATE_BODY,
        sourceContext: { page: 'prayer', sealed: { unsealAt: yesterdayStr, sealedAt: yesterdayStr, opened: false } },
      },
    },
  });
  expect(createRes.ok()).toBeTruthy();

  await page.goto(appUrl('/prayer/sealed'));
  const card = page.getByText(DATE_TITLE, { exact: true }).locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(card).toBeVisible();
  await expect(page.getByText(DATE_BODY)).not.toBeVisible();

  await card.getByRole('button', { name: 'Open This Prayer' }).click();
  await expect(card.getByText(DATE_BODY)).toBeVisible();

  await cleanupPriorRuns(request);
});
