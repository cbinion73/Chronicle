import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 11: the Quiet Pass + Chapel Mode.

test('chapel mode renders full-bleed with no chrome and exits on tap', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('chronicle.register.override', 'morning'));
  await page.goto(appUrl('/'));
  await page.getByRole('button', { name: 'Or enter chapel — one verse, no chrome' }).click();
  await expect(page).toHaveURL(/\/chapel/);

  // No sidebar, no topbar, no AI companion — this route renders outside AppShell.
  await expect(page.getByRole('navigation').first()).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Chronicle AI' })).not.toBeVisible();

  // A verse is shown with a reference.
  await expect(page.locator('p', { hasText: /^"/ })).toBeVisible();

  await page.locator('body').click();
  await expect(page).toHaveURL(/\/$/);
});

test('the AI companion panel is quiet by default and reveals more on request', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('chronicle.register.override', 'morning'));
  await page.goto(appUrl('/bible'));

  // Quiet by default: no Role/Voice <select> elements, capped quick actions,
  // and the standing action grid is hidden until asked for.
  await expect(page.locator('#chronicle-agent-mode-select')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Themes' })).not.toBeVisible();

  await page.getByRole('button', { name: 'More actions ▾' }).click();
  await expect(page.getByRole('button', { name: 'Open Themes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to Chronicle' }).first()).toBeVisible();
});
