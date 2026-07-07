import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

test('planting and reviewing a verse schedules its next review', async ({ page }) => {
  await page.goto(appUrl('/memory'));
  await expect(page.getByText('Scripture Memory Engine')).toBeVisible();

  await page.getByRole('button', { name: '+ Plant a Verse' }).click();
  await page.getByPlaceholder('Reference — e.g. Philippians 4:6-7').fill('Playwright 1:1');
  await page.getByPlaceholder('The verse text...').fill('This is a verse planted by the memory engine test.');
  await page.getByRole('button', { name: 'Plant It' }).click();

  await expect(page.getByText('Playwright 1:1').first()).toBeVisible();
  await expect(page.getByText('Review · 1 of 1 due')).toBeVisible();

  // First-letter prompt should show initials, not the full text, until revealed.
  await expect(page.getByText('This is a verse planted by the memory engine test.')).not.toBeVisible();
  await page.getByRole('button', { name: 'Reveal' }).click();
  await expect(page.getByText('This is a verse planted by the memory engine test.')).toBeVisible();

  await page.getByRole('button', { name: 'Good' }).click();
  await expect(page.getByText('Nothing is due right now. Every planted verse is holding.')).toBeVisible();
  await expect(page.getByText(/Next review \d{4}-\d{2}-\d{2}/)).toBeVisible();

  // Clean up so repeated runs of this test don't accumulate garden entries.
  await page.getByTitle('Remove from the Memory Engine').click();
});
