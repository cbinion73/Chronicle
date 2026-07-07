import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 10: the Ceremonies. Marking a prayer answered and setting a
// growth marker now pass through dedicated ceremonial flows instead of
// plain modals, and deletes offer undo instead of window.confirm. These
// tests drive each flow end-to-end and clean up their own DB rows (see
// REDESIGN.md Milestone 5/6 for why that matters).

const PRAYER_TEXT = 'Playwright ceremony prayer request';
const GROWTH_TITLE = 'Playwright ceremony growth marker';
const DELETE_PRAYER_TEXT = 'Playwright ceremony undo prayer request';

async function cleanupPriorRuns(request) {
  const itemsRes = await request.get(appUrl('/api/data/prayer-items'));
  if (itemsRes.ok()) {
    const { items } = await itemsRes.json();
    for (const item of items || []) {
      if (item.text === PRAYER_TEXT || item.text === DELETE_PRAYER_TEXT) {
        await request.delete(appUrl(`/api/data/prayer-items/${item.id}`));
      }
    }
  }
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title?.includes(PRAYER_TEXT) || entry.title === GROWTH_TITLE) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('the answered-prayer ceremony moves a request through stillness into a written answer', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/prayer'));
  await page.getByRole('button', { name: '+ Add Request' }).click();
  await page.getByPlaceholder('What would you like to bring before God?').fill(PRAYER_TEXT);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const card = page.getByText(PRAYER_TEXT).locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]').first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Mark Answered' }).click();

  // Stage 1: moving into the light.
  await expect(page.getByText('This request is about to move into the light.')).toBeVisible();
  await page.getByRole('button', { name: 'Let it move into the light →' }).click();

  // Stage 2: stillness (skip rather than wait out the timer).
  await expect(page.getByText('Sit with what God has done.')).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  // Stage 3: writing the answer as the closing act.
  await expect(page.getByText('Answered Prayer', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Write the answer, provision, clarity, or change Chronicle should remember.').fill('Chronicle recorded the ceremony test answer.');
  await page.getByPlaceholder('Philippians 4:19').fill('Philippians 4:19');
  await page.getByRole('button', { name: 'Seal It in the Light ✚' }).click();

  await expect(page.getByText('Chronicle recorded the ceremony test answer.').first()).toBeVisible();

  await cleanupPriorRuns(request);
});

test('the growth-marker ceremony chooses a stone, writes it, and sets it', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/thread/growth'));
  await page.getByRole('button', { name: '+ Add a Growth Marker' }).click();

  // Stage 1: choosing the stone.
  await expect(page.getByText('Which stone are you setting?')).toBeVisible();
  await page.getByRole('button', { name: 'Baptism' }).click();
  await page.getByRole('button', { name: 'Continue →' }).click();

  // Stage 2: writing it.
  await page.getByPlaceholder("Title (optional — we'll generate one from your entry)").fill(GROWTH_TITLE);
  await page.getByPlaceholder('What happened? What is this stone marking?').fill('Chronicle recorded the stone-setting ceremony test.');
  await page.getByRole('button', { name: 'Set the Stone ✚' }).click();

  // Stage 3: the setting beat, then it lands on the spine.
  await expect(page.getByText('Setting the stone…')).toBeVisible();
  await expect(page.getByText(GROWTH_TITLE, { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('💧 Baptism')).toBeVisible();

  await cleanupPriorRuns(request);
});

test('deleting a prayer request offers undo instead of a confirm dialog', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/prayer'));
  await page.getByRole('button', { name: '+ Add Request' }).click();
  await page.getByPlaceholder('What would you like to bring before God?').fill(DELETE_PRAYER_TEXT);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(DELETE_PRAYER_TEXT)).toBeVisible();

  await page.getByTitle('Delete prayer request').first().click();
  // No native confirm dialog should have appeared — the item is gone
  // immediately, with an Undo toast offered instead.
  await expect(page.getByText(DELETE_PRAYER_TEXT)).not.toBeVisible();
  await expect(page.getByText('Prayer request deleted')).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(DELETE_PRAYER_TEXT)).toBeVisible();

  await cleanupPriorRuns(request);
});
