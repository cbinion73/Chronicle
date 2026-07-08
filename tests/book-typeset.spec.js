import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// Milestone 20 / UX redesign Design-1: The Book, Typeset, now in the Old
// Family Bible register — years as parts, chapters broken at growth
// markers, a genuine page count derived from actual content length. The
// page reads as a real heirloom book (leather cover, gilt page-edge,
// aged paper) rather than a card; a "Table of Contents" toggle replaces
// the old persistent chapter sidebar (removed along with the page's
// bespoke AI panel per DESIGN.md's no-AI-in-devotional-registers rule).

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
  await expect(page.getByText('The Book of Chris', { exact: false }).first()).toBeVisible();

  // The Table of Contents lists both years as distinct parts, with the
  // 2020 year split into a lead-in chapter plus "Baptism" (the growth
  // marker's kind label).
  await page.getByRole('button', { name: 'Table of Contents' }).click();
  await expect(page.getByText('Part I · 2019')).toBeVisible();
  await expect(page.getByText('Part II · 2020')).toBeVisible();
  const baptismChapterButton = page.getByRole('button', { name: /^Baptism/ });
  await expect(baptismChapterButton).toBeVisible();

  // Jumping to the Baptism chapter returns to reading mode on a page
  // whose running header and chapter title both name it.
  await baptismChapterButton.click();
  await expect(page.getByText('The 2020 Season', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Baptism' })).toBeVisible();

  // Pagination: the page tracker is real and Next/Previous move it.
  const pageTracker = page.getByText(/You are on page \d+ of your book\./);
  await expect(pageTracker).toBeVisible();
  const firstLabel = await pageTracker.textContent();

  await page.getByRole('button', { name: 'Next →' }).click();
  const secondLabel = await pageTracker.textContent();
  expect(secondLabel).not.toBe(firstLabel);

  await page.getByRole('button', { name: '← Previous' }).click();
  const backToFirst = await pageTracker.textContent();
  expect(backToFirst).toBe(firstLabel);

  await cleanupPriorRuns(request);
});
