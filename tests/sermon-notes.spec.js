import { test, expect, devices } from '@playwright/test';
import { appUrl } from './testUrls';

const TEST_TITLE = 'Playwright Sermon Notes';

async function removeTestEntries(request) {
  const response = await request.get(appUrl('/api/data/chronicle-entries'));
  if (!response.ok()) return;
  const { entries } = await response.json();
  for (const entry of entries || []) {
    if (entry.title === TEST_TITLE) {
      await request.delete(appUrl(`/api/data/chronicle-entries/${entry.id}`));
    }
  }
}

test.beforeEach(async ({ request }) => {
  await removeTestEntries(request);
});

test.afterEach(async ({ request }) => {
  await removeTestEntries(request);
});

test('captures, persists, searches, edits, opens, and deletes sermon notes', async ({ page, request }) => {
  await page.goto('/sermon-notes');

  await expect(page.getByRole('heading', { name: 'Sermon Notes', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Section' }).getByRole('button', { name: 'Sermon Notes' })).toHaveAttribute('aria-current', 'page');
  const saveButton = page.getByRole('button', { name: 'Save sermon notes' });
  await expect(saveButton).toBeDisabled();

  await page.getByLabel('Sermon title *').fill(TEST_TITLE);
  await page.getByLabel('Preacher').fill('Rev. Test Shepherd');
  await page.getByLabel('Church or gathering').fill('Chronicle Community');
  await page.getByLabel('Passage').fill('Romans 8:1-11');
  await page.getByLabel('Notes *').fill('Grace is not merely the beginning; grace is the atmosphere of life in Christ.\n## Prayer\nThis heading belongs inside the sermon notes.');
  await page.getByLabel('Big idea').fill('There is no condemnation for those who are in Christ.');
  await page.getByLabel('Personal response').fill('Return to this promise when accusation rises.');
  await page.getByRole('textbox', { name: 'Prayer', exact: true }).fill('Lord, teach me to live as one who has been set free.');

  await page.reload();
  await expect(page.getByLabel('Sermon title *')).toHaveValue(TEST_TITLE);
  await expect(page.getByLabel('Notes *')).toHaveValue(/Grace is not merely/);
  await page.getByRole('button', { name: 'Save sermon notes' }).click();

  const savedCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: TEST_TITLE }) });
  await expect(savedCard).toBeVisible();
  await expect.poll(async () => {
    const response = await request.get(appUrl('/api/data/chronicle-entries'));
    const { entries } = await response.json();
    return entries.find((entry) => entry.title === TEST_TITLE);
  }).toMatchObject({ type: 'study', passage: 'Romans 8:1-11', sourceContext: { page: 'sermon-notes' } });

  await page.getByPlaceholder('Search preacher, passage, or phrase…').fill('Test Shepherd');
  await expect(savedCard).toBeVisible();
  await page.getByPlaceholder('Search preacher, passage, or phrase…').fill('not present');
  await expect(savedCard).toHaveCount(0);
  await page.getByPlaceholder('Search preacher, passage, or phrase…').fill('');

  await page.getByLabel('Sermon title *').fill('Unsaved Sunday draft');
  await page.getByLabel('Notes *').fill('Do not lose this unfinished thought.');
  await savedCard.getByRole('button', { name: 'Edit' }).click();
  const draftDecision = page.getByRole('alert').filter({ hasText: 'Keep your unfinished notes?' });
  await expect(draftDecision).toBeVisible();
  await draftDecision.getByRole('button', { name: 'Set aside and edit' }).click();
  await expect(page.getByText('Editing saved notes')).toBeVisible();
  await expect(page.getByLabel('Notes *')).toHaveValue(/This heading belongs inside the sermon notes/);
  await page.getByRole('button', { name: 'Cancel edit' }).click();
  await expect(page.getByLabel('Sermon title *')).toHaveValue('Unsaved Sunday draft');
  await expect(page.getByLabel('Notes *')).toHaveValue('Do not lose this unfinished thought.');

  await page.getByLabel('Sermon title *').fill('');
  await page.getByLabel('Notes *').fill('');
  await savedCard.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Notes *').fill('Grace is the atmosphere of life in Christ, and the Spirit leads us home.');
  await page.reload();
  await expect(page.getByText('Editing saved notes')).toBeVisible();
  await expect(page.getByLabel('Notes *')).toHaveValue(/Spirit leads us home/);
  await page.getByRole('button', { name: 'Update notes' }).click();
  await expect.poll(async () => {
    const response = await request.get(appUrl('/api/data/chronicle-entries'));
    const { entries } = await response.json();
    return entries.find((entry) => entry.title === TEST_TITLE)?.body || '';
  }).toContain('the Spirit leads us home');

  await savedCard.getByRole('button', { name: 'Bible' }).click();
  await expect(page).toHaveURL(/\/bible$/);
  await expect(page.getByText('Romans 8', { exact: true }).first()).toBeVisible();

  await page.goto('/sermon-notes');
  const reopenedCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: TEST_TITLE }) });
  await reopenedCard.getByRole('button', { name: 'Delete' }).click();
  const confirmation = reopenedCard.getByRole('alert');
  await expect(confirmation).toContainText('Delete these sermon notes?');
  await confirmation.getByRole('button', { name: 'Delete' }).click();
  await expect(reopenedCard).toHaveCount(0);
  await expect.poll(async () => {
    const response = await request.get(appUrl('/api/data/chronicle-entries'));
    const { entries } = await response.json();
    return entries.some((entry) => entry.title === TEST_TITLE);
  }).toBe(false);
});

test.describe('iPhone Word rail', () => {
  test.use({
    viewport: devices['iPhone 13'].viewport,
    userAgent: devices['iPhone 13'].userAgent,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    isMobile: devices['iPhone 13'].isMobile,
    hasTouch: devices['iPhone 13'].hasTouch,
  });

  test('promotes Sermon Notes into the expanding Word navigation', async ({ page }) => {
    await page.goto('/sermon-notes');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('button').first()).toHaveAccessibleName('The Word');
    await expect(nav.getByRole('button', { name: 'Sermon Notes' })).toHaveAttribute('aria-current', 'page');
    expect((await nav.getByRole('button', { name: 'Sermon Notes' }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('heading', { name: 'Sermon Notes', exact: true })).toBeVisible();
  });
});
