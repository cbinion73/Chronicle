import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 15: Echoes of Your Own Life — past entries resurface,
// unprompted, against the passage being read now. Distinct from the
// existing canonical "Echoes" cross-reference feature (a different
// toggle entirely) — this test also confirms there's no collision.

const PAST_BODY = 'Playwright personal echo test — a memory from the past.';
const TODAY_BODY = 'Playwright personal echo test — written just now, not an echo.';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes('Playwright personal echo test')) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('a past entry on this passage resurfaces quietly; today\'s own entry does not', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const past = new Date();
  past.setDate(past.getDate() - 30);
  const pastDate = past.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const pastRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-echo-past-${Date.now()}`,
        date: pastDate,
        type: 'reflection',
        title: 'Past echo test entry',
        body: PAST_BODY,
        passage: 'Psalms 23:1',
      },
    },
  });
  expect(pastRes.ok()).toBeTruthy();

  const todayRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-echo-today-${Date.now()}`,
        date: today,
        type: 'reflection',
        title: 'Today echo test entry',
        body: TODAY_BODY,
        passage: 'Psalms 23:1',
      },
    },
  });
  expect(todayRes.ok()).toBeTruthy();

  await page.goto(appUrl('/bible'));
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();

  await expect(page.getByText("You've Returned Here")).toBeVisible();
  await expect(page.getByText(PAST_BODY, { exact: false })).toBeVisible();
  await expect(page.getByText(TODAY_BODY, { exact: false })).not.toBeVisible();

  // No collision with the existing canonical Echoes toggle.
  await expect(page.getByRole('button', { name: /Theme Overlay|Echoes/ }).first()).toBeVisible();

  await cleanupPriorRuns(request);
});
