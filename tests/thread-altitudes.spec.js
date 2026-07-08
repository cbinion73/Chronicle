import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 21: The Thread Made Literal — Record, Answered Light, Growth
// Spine, and Story become four altitudes of one Thread shell, with a
// literal zoom-down interaction from a stone back to its ground-level
// entries.

const MARKER = 'Playwright thread altitudes test';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.body?.includes(MARKER) || entry.title?.includes(MARKER)) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('all four altitudes are reachable from the Thread tab bar', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.goto(appUrl('/thread'));
  await expect(page.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Answered Light' }).click();
  await expect(page).toHaveURL(/\/thread\/light$/);
  await expect(page.getByText('The Answered Light')).toBeVisible();

  await page.getByRole('button', { name: 'Growth' }).click();
  await expect(page).toHaveURL(/\/thread\/growth$/);
  await expect(page.getByText('The Growth Spine')).toBeVisible();

  await page.getByRole('button', { name: 'Story' }).click();
  await expect(page).toHaveURL(/\/thread\/story$/);
  await expect(page.getByText('The Book of Chris').first()).toBeVisible();

  await cleanupPriorRuns(request);
});

test('a Growth Spine stone zooms down to its ground-level day in Record', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const markerRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: 'thread-altitudes-test-marker',
        date: '2022-04-01',
        type: 'growth',
        title: MARKER + ' marker',
        body: `${MARKER} the growth marker itself.`,
        sourceContext: { page: 'chronicle', growthMarker: { kind: 'calling' } },
      },
    },
  });
  expect(markerRes.ok()).toBeTruthy();
  const otherDayRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: 'thread-altitudes-test-otherday',
        date: '2022-05-15',
        type: 'reflection',
        title: MARKER + ' unrelated day',
        body: `${MARKER} a reflection on a different day — should not appear once zoomed.`,
      },
    },
  });
  expect(otherDayRes.ok()).toBeTruthy();

  await page.goto(appUrl('/thread/growth'));
  const markerCard = page.getByText(`${MARKER} the growth marker itself.`, { exact: true })
    .locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(markerCard).toBeVisible();
  await markerCard.getByRole('button', { name: '↓ View in Record' }).click();

  await expect(page).toHaveURL(/\/thread$/);
  await expect(page.getByText('Zoomed to', { exact: false })).toBeVisible();
  await expect(page.getByText(`${MARKER} the growth marker itself.`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${MARKER} unrelated day`, { exact: true })).not.toBeVisible();

  await page.getByRole('button', { name: 'Clear date filter' }).click();
  await expect(page.getByText(`${MARKER} unrelated day`, { exact: true })).toBeVisible();

  await cleanupPriorRuns(request);
});
