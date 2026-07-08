import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// The Hours (Milestone 9): the app keeps liturgical time. These tests pin
// the register via the localStorage override (chronicle.register.override)
// so they are deterministic at any wall-clock hour, then verify the three
// behaviors of the milestone: the morning Office, the Evening Examen, and
// re-entry as grace. Data planted in the real DB is self-cleaned (see
// REDESIGN.md Milestone 5/6 for why that matters).

const REVIEW_ENTRY_TITLE = 'Playwright hours review entry';
const EXAMEN_MARKER = 'Playwright evening examen response marker';
const GRACE_PRAYER = 'Playwright hours grace test request';

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.title === REVIEW_ENTRY_TITLE || entry.body?.includes(EXAMEN_MARKER)) {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
  const itemsRes = await request.get(appUrl('/api/data/prayer-items'));
  if (itemsRes.ok()) {
    const { items } = await itemsRes.json();
    for (const item of items || []) {
      if (item.text === GRACE_PRAYER) {
        await request.delete(appUrl(`/api/data/prayer-items/${item.id}`));
      }
    }
  }
}

test('morning register renders the full Daily Office', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('chronicle.register.override', 'morning'));
  await page.goto(appUrl('/'));
  await expect(page.getByText('The Daily Office').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Word' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-register', 'morning');
});

test('evening register renders the Examen and reviews the day the Thread recorded', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const today = new Date().toISOString().split('T')[0];
  const createRes = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `pw-hours-${Date.now()}`,
        date: today,
        type: 'note',
        title: REVIEW_ENTRY_TITLE,
        body: 'A note written earlier today, for the examen to review.',
      },
    },
  });
  expect(createRes.ok()).toBeTruthy();

  await page.addInitScript(() => window.localStorage.setItem('chronicle.register.override', 'evening'));
  await page.goto(appUrl('/'));

  await expect(page.getByText('The Evening Examen')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-register', 'evening');
  await expect(page.getByText("The Day's Thread")).toBeVisible();
  await expect(page.getByText(REVIEW_ENTRY_TITLE)).toBeVisible();

  await page
    .getByPlaceholder(/Where was God in this day/)
    .fill(EXAMEN_MARKER);
  await page.getByRole('button', { name: 'Seal the Day ✚' }).click();
  await expect(page.getByText('The day is sealed.')).toBeVisible();

  await cleanupPriorRuns(request);
});

test('evening keeper can still choose the full Office', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('chronicle.register.override', 'evening');
    window.localStorage.removeItem('chronicle.office.examenCompleted');
  });
  await page.goto(appUrl('/'));
  await expect(page.getByText('The Evening Examen')).toBeVisible();
  await page.getByRole('button', { name: 'Pray the full Office instead' }).click();
  await expect(page.getByRole('heading', { name: 'The Word' })).toBeVisible();
});

test('returning after a long absence is met with grace, not a counter', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  const createRes = await request.post(appUrl('/api/data/prayer-items'), {
    data: {
      item: {
        id: `pw-hours-grace-${Date.now()}`,
        text: GRACE_PRAYER,
        category: 'needs',
        answered: false,
        dateAdded: '2026-05-01',
      },
    },
  });
  expect(createRes.ok()).toBeTruthy();

  await page.addInitScript(() => {
    window.localStorage.setItem('chronicle.register.override', 'morning');
    window.localStorage.setItem('chronicle.office.lastVisit', '2026-05-01');
  });
  await page.goto(appUrl('/'));

  await expect(page.getByText('Welcome back.')).toBeVisible();
  await expect(page.getByText('The thread held your place. Nothing was lost.')).toBeVisible();
  await expect(page.getByText(GRACE_PRAYER)).toBeVisible();
  // No shame mechanics: the day count of the absence must not appear.
  await expect(page.getByText(/\d+-day absence/)).not.toBeVisible();

  await cleanupPriorRuns(request);
});
