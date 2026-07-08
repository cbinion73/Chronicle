import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 13: Remembrance — on-this-day resurfacing and personal feast
// days, unprompted, derived purely from existing thread data. Dates are
// computed relative to "today" so this test is stable on any run date.

const GROWTH_TITLE = 'Playwright remembrance growth marker';
const PRAYER_TEXT = 'Playwright remembrance answered prayer';

function isoDateYearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().split('T')[0];
}

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title === GROWTH_TITLE) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
  const itemsRes = await request.get(appUrl('/api/data/prayer-items'));
  if (itemsRes.ok()) {
    const { items } = await itemsRes.json();
    for (const item of items || []) {
      if (item.text === PRAYER_TEXT) {
        await request.delete(appUrl(`/api/data/prayer-items/${item.id}`));
      }
    }
  }
}

test('the Office surfaces on-this-day growth markers and answered prayers, unprompted', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const growthRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-remembrance-growth-${Date.now()}`,
        date: isoDateYearsAgo(1),
        type: 'growth',
        title: GROWTH_TITLE,
        body: 'A stone set one year ago today.',
        sourceContext: { page: 'chronicle', growthMarker: { kind: 'baptism' } },
      },
    },
  });
  expect(growthRes.ok()).toBeTruthy();

  const prayerRes = await request.post(appUrl('/api/data/prayer-items'), {
    data: {
      item: {
        id: `pw-remembrance-prayer-${Date.now()}`,
        text: PRAYER_TEXT,
        category: 'needs',
        answered: true,
        dateAdded: isoDateYearsAgo(3),
        dateAnswered: isoDateYearsAgo(2),
        answerSummary: 'Answered two years ago today.',
      },
    },
  });
  expect(prayerRes.ok()).toBeTruthy();

  await page.addInitScript(() => window.localStorage.setItem('chronicle.register.override', 'morning'));
  await page.goto(appUrl('/'));

  await expect(page.getByRole('heading', { name: 'Remembrance' })).toBeVisible();
  await expect(page.getByText('1 year ago today')).toBeVisible();
  await expect(page.getByText('2 years ago today')).toBeVisible();
  await expect(page.getByText(GROWTH_TITLE, { exact: false })).toBeVisible();
  await expect(page.getByText(PRAYER_TEXT, { exact: false })).toBeVisible();

  await cleanupPriorRuns(request);
});
