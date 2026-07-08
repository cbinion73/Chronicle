import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 20: The Book, Typeset — the Story tab (/thread/story,
// src/pages/Legacy.tsx) becomes a real paginated book: years as parts,
// chapters broken at growth markers, a genuine "Page X of Y" derived
// from actual content length rather than decoration.

// The Legacy page runs a 3-pane layout (chapter sidebar, book reader,
// page-local AI panel) alongside the app's own global AI companion
// panel — at the default 1280px Chromium viewport there isn't enough
// room left for the reader card's own text once all four columns are
// laid out. Widen the viewport, matching a normal desktop monitor.
test.use({ viewport: { width: 1600, height: 900 } });

const MARKER = 'Playwright book typeset test';

function longEntry(label) {
  // Comfortably larger than bookPagination.ts's ~1600-char page budget,
  // so this single entry alone forces at least two pages.
  return `${MARKER} ${label} — ${'the thread remembers this day. '.repeat(80)}`;
}

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

async function seedEntry(request, overrides) {
  const res = await request.post(appUrl('/api/data/chronicle-entries'), {
    data: {
      entry: {
        id: `book-typeset-test-${overrides.id}`,
        date: overrides.date,
        type: overrides.type || 'reflection',
        title: MARKER,
        body: overrides.body,
        sourceContext: overrides.sourceContext,
      },
    },
  });
  expect(res.ok()).toBeTruthy();
}

test('the Book paginates real content, breaks chapters at growth markers, and groups years as parts', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  // Year 2019: one long reflection (forces 2+ pages within its own chapter).
  await seedEntry(request, { id: '1', date: '2019-03-10', body: longEntry('early season') });
  // Year 2020: a growth marker splits the year into two chapters.
  await seedEntry(request, { id: '2', date: '2020-02-01', body: longEntry('before the marker') });
  await seedEntry(request, {
    id: '3',
    date: '2020-06-15',
    type: 'growth',
    body: longEntry('the baptism itself'),
    sourceContext: { page: 'chronicle', growthMarker: { kind: 'baptism' } },
  });
  await seedEntry(request, { id: '4', date: '2020-09-01', body: longEntry('after the marker') });

  await page.goto(appUrl('/thread/story'));
  await expect(page.getByText('The Book of Chris').first()).toBeVisible();

  // Parts: both years should appear in the sidebar as distinct parts.
  await expect(page.getByText('Part I · 2019')).toBeVisible();
  await expect(page.getByText('Part II · 2020')).toBeVisible();

  // Chapters within 2020: a lead-in chapter plus "Baptism" (the growth marker's kind label).
  await expect(page.getByText('Baptism', { exact: true })).toBeVisible();

  // Pagination: page indicator is real and Next/Previous move it.
  const pageIndicator = page.getByText(/Page \d+ of \d+/);
  await expect(pageIndicator).toBeVisible();
  const firstLabel = await pageIndicator.textContent();

  await page.getByRole('button', { name: 'Next →' }).click();
  const secondLabel = await pageIndicator.textContent();
  expect(secondLabel).not.toBe(firstLabel);

  await page.getByRole('button', { name: '← Previous' }).click();
  const backToFirst = await pageIndicator.textContent();
  expect(backToFirst).toBe(firstLabel);

  // Jumping to the Baptism chapter lands on a page whose header names it.
  await page.getByText('Baptism', { exact: true }).click();
  await expect(page.getByText('2020 · Baptism')).toBeVisible();

  await cleanupPriorRuns(request);
});
