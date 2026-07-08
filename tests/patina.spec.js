import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 16: Patina — passages visited often accumulate a faint warm
// texture. Local-only visit log (not DB-synced), pure derivation, no AI.

function scripturePaneLocator(page) {
  // The scripture pane is the scrollable container that carries the
  // heading; its background-image (a radial-gradient) is the patina.
  return page.locator('h2', { hasText: 'Psalm 23' }).locator('xpath=..');
}

test('a chapter visited many times over many days wears a visible patina', async ({ page }) => {
  // Bootstrap default state first.
  await page.goto(appUrl('/bible'));
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();

  const freshBackground = await scripturePaneLocator(page).evaluate((el) => getComputedStyle(el).backgroundImage);

  // Seed a heavy distinct-day visit history for Psalms 23 directly into the
  // persisted store (bibleVisits is local-only — see REDESIGN.md M16).
  await page.evaluate(() => {
    const raw = window.localStorage.getItem('chronicle-app-state');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 9 };
    const visits = [];
    for (let i = 0; i < 20; i += 1) {
      visits.push({ book: 'Psalms', chapter: 23, date: `2020-01-${String((i % 28) + 1).padStart(2, '0')}` });
    }
    parsed.state = { ...parsed.state, bibleVisits: visits };
    window.localStorage.setItem('chronicle-app-state', JSON.stringify(parsed));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();

  const wornBackground = await scripturePaneLocator(page).evaluate((el) => getComputedStyle(el).backgroundImage);

  expect(wornBackground).toContain('gradient');
  expect(wornBackground).not.toBe(freshBackground);
});
