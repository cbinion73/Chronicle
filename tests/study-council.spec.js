import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

// The Study Council calls OpenAI server-side, which isn't available in CI/
// local test runs without a real key. This test mocks the network boundary
// (the /api/ai/study-council response) so it can verify the part that's
// actually ours: the client-side Source Ledger tag parsing and rendering
// (src/lib/studyCouncil.ts) — every paragraph must render with a visible
// tag and, for interpretation claims, a confidence badge.

const MOCK_SEATS = [
  { id: 'exegete', name: 'The Exegete', text: '[SCRIPTURE] The passage opens with a direct statement of praise.\n\n[INTERPRETATION] This structure supports a reading of thanksgiving as the controlling theme. (broadly held)' },
  { id: 'historian', name: 'The Historian', text: '[HISTORY] Temple worship in this period involved antiphonal singing.' },
  { id: 'canonist', name: 'The Canonist', text: '[SCRIPTURE] This theme echoes across the Psalter.' },
  { id: 'churchman', name: 'The Churchman', text: '[INTERPRETATION] The Reformers read this psalm liturgically. (disputed)' },
  { id: 'berean', name: 'The Berean', text: '[INTERPRETATION] The Exegete\'s claim about thanksgiving holds up against the text. (settled)' },
];

test('the Study Council renders every claim with a visible source tag', async ({ page, request }) => {
  // A prior run's saved session lingers as a real chronicle_entries row (this
  // isn't localStorage), which would leave more than one "Past Convenings"
  // entry and make the reopen step below ambiguous. Clean any leftovers.
  const existing = await request.get(appUrl('/api/data/chronicle-entries'));
  if (existing.ok()) {
    const { entries } = await existing.json();
    for (const entry of entries || []) {
      if (entry.type === 'study' && entry.sourceContext?.studyCouncil && entry.passage === 'Psalms 23') {
        await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
      }
    }
  }

  await page.route('**/api/ai/study-council', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ seats: MOCK_SEATS }) });
  });

  await page.goto(appUrl('/bible'));
  await page.getByTitle(/Convene the Study Council/).click();
  await expect(page.getByText('The Study Council')).toBeVisible();

  await page.getByRole('button', { name: 'Convene the Council' }).click();

  await expect(page.getByText('The Exegete', { exact: true })).toBeVisible();
  await expect(page.getByText('The Berean', { exact: true })).toBeVisible();
  await expect(page.getByText('SCRIPTURE').first()).toBeVisible();
  await expect(page.getByText('HISTORY').first()).toBeVisible();
  await expect(page.getByText('Broadly held')).toBeVisible();
  await expect(page.getByText('Disputed')).toBeVisible();
  await expect(page.getByText(/This structure supports a reading of thanksgiving/)).toBeVisible();

  // No paragraph should render untagged with this well-formed mock response.
  await expect(page.getByText('UNTYPED')).not.toBeVisible();

  // Saving persists the full typed session to the Thread, not just a summary.
  await page.getByRole('button', { name: 'Save to the Thread' }).click();
  await expect(page.getByRole('button', { name: '✓ Saved to the Thread' })).toBeVisible();

  await page.getByRole('button', { name: '← Ask again' }).click();
  await expect(page.getByRole('button', { name: 'Convene the Council' })).toBeVisible();
  await expect(page.getByText('Past Convenings on')).toBeVisible();

  // Reopening a past convening re-renders it exactly, with no new network call.
  await page.unroute('**/api/ai/study-council');
  await page.getByText('General reading of the passage').first().click();
  await expect(page.getByText('The Exegete', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '✓ Saved to the Thread' })).toBeVisible();
});
