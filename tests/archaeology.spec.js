import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 18: The Archaeology — a guided backfill interview that
// excavates a keeper's prehistory into stones. Walks the wizard through
// its first prompt (growth) with a past date, skips the rest, then
// verifies the growth marker landed on the Growth Spine with that date.
// A second run walks only the answered-prayer prompt (skipping the growth
// ones ahead of it) and verifies it landed on the Answered Light with a
// backdated "carried for" arc.

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes('Playwright archaeology test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
  const itemsRes = await request.get(appUrl('/api/data/prayer-items'));
  if (itemsRes.ok()) {
    const { items } = await itemsRes.json();
    for (const item of items || []) {
      if (item.text?.includes('Playwright archaeology test')) {
        await request.delete(appUrl(`/api/data/prayer-items/${item.id}`));
      }
    }
  }
}

test('excavating a past conversion sets a backdated stone on the Growth Spine', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/archaeology'));
  await expect(page.getByText('The Archaeology')).toBeVisible();
  await expect(page.getByText('Is there a moment you first committed your life to Christ?')).toBeVisible();

  await page.getByRole('button', { name: 'Yes, I remember' }).click();
  await page.locator('input[type="date"]').fill('2015-06-01');
  await page.getByPlaceholder(/What do you remember about that moment/).fill('Playwright archaeology test conversion memory.');
  await page.getByRole('button', { name: 'Set This Stone ✚' }).click();

  // Wizard advances to the next prompt (baptism) — skip everything else.
  await expect(page.getByText('Were you baptized? Roughly when?')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
  }
  await expect(page.getByText(/stone.* set\./)).toBeVisible();

  await page.goto(appUrl('/thread/growth'));
  const markerCard = page.getByText('Playwright archaeology test conversion memory.', { exact: true })
    .locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(markerCard).toBeVisible();
  await expect(markerCard.getByText('June 1, 2015')).toBeVisible();

  await cleanupPriorRuns(request);
});

test('excavating an old answered prayer sets a backdated arc on the Answered Light', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/archaeology'));
  await expect(page.getByText('Is there a moment you first committed your life to Christ?')).toBeVisible();

  // Skip the five growth prompts ahead of the answered-prayer prompt.
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
  }
  await expect(page.getByText('Is there a prayer God answered that you still remember, even years later?')).toBeVisible();

  await page.getByRole('button', { name: 'Yes, I remember' }).click();
  await page.locator('input[type="date"]').fill('2020-03-15');
  await page.getByRole('button', { name: 'Several years' }).click();
  await page.getByPlaceholder(/What did you ask for/).fill('Playwright archaeology test answered prayer memory.');
  await page.getByRole('button', { name: 'Set This Stone ✚' }).click();

  await expect(page.getByText(/stone.* set\./)).toBeVisible();

  await page.goto(appUrl('/prayer/answered-light'));
  const lightCard = page.getByText('Playwright archaeology test answered prayer memory.', { exact: true })
    .locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(lightCard).toBeVisible();
  await expect(lightCard.getByText('March 15, 2020')).toBeVisible();

  await cleanupPriorRuns(request);
});
