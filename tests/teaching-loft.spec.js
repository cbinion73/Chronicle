import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// The Teaching Loft derives from a saved Study Council convening, which
// itself calls OpenAI server-side — mock that network boundary (as
// study-council.spec.js does) so this test can verify the part that's
// actually ours: deriving and rendering a teaching outline from the
// convening's tagged paragraphs (src/lib/teachingLoft.ts).

const MOCK_SEATS = [
  { id: 'exegete', name: 'The Exegete', text: '[SCRIPTURE] The Lord is my shepherd; I shall not want. (settled)' },
  { id: 'historian', name: 'The Historian', text: '[HISTORY] Shepherding imagery was common royal language in the ancient Near East.' },
  { id: 'canonist', name: 'The Canonist', text: '[INTERPRETATION] This reading is disputed among modern commentators. (disputed)' },
  { id: 'churchman', name: 'The Churchman', text: '[APPLICATION] Spend five minutes this week naming one area where you are tempted to want more than God has given.' },
  { id: 'berean', name: 'The Berean', text: '[APPLICATION] Ask each person in your group to share one way God has provided for them this month.' },
];

async function cleanupPriorRuns(request) {
  const entriesRes = await request.get(appUrl('/api/data/chronicle-entries'));
  if (entriesRes.ok()) {
    const { entries } = await entriesRes.json();
    for (const entry of entries || []) {
      if (entry.type === 'study' && entry.sourceContext?.studyCouncil && entry.passage === 'Psalms 23') {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }
}

test('a saved Study Council convening can become a shareable teaching outline', async ({ page, request }) => {
  await cleanupPriorRuns(request);

  await page.route('**/api/ai/study-council', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ seats: MOCK_SEATS }) });
  });

  await page.goto(appUrl('/bible'));
  await page.getByTitle(/Convene the Study Council/).click();
  await expect(page.getByText('The Study Council')).toBeVisible();
  await page.getByRole('button', { name: 'Convene the Council' }).click();
  await expect(page.getByText('The Exegete', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Save to the Thread' }).click();
  await expect(page.getByRole('button', { name: '✓ Saved to the Thread' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto(appUrl('/thread'));
  await page.getByRole('button', { name: 'Create Teaching Outline →' }).first().click();
  await expect(page).toHaveURL(/\/thread\/teach\//);

  await expect(page.getByText('Big Idea')).toBeVisible();
  await expect(page.getByText('The Lord is my shepherd; I shall not want.')).toBeVisible();
  await expect(page.getByText('Where Scholars Disagree')).toBeVisible();
  await expect(page.getByText('This reading is disputed among modern commentators.')).toBeVisible();
  await expect(page.getByText('Discussion & Application')).toBeVisible();
  await expect(page.getByText('Spend five minutes this week naming one area')).toBeVisible();
  await expect(page.getByText('Closing Prayer')).toBeVisible();
  await expect(page.getByText('Psalms 23', { exact: true })).toBeVisible();

  await cleanupPriorRuns(request);
});
