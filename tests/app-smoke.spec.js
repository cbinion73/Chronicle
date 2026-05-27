import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

function collectRuntimeIssues(page) {
  const issues = [];

  page.on('pageerror', (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (
      text.includes('favicon') ||
      text.includes('Failed to load resource: the server responded with a status of 404') ||
      text.includes('No route matches URL')
    ) {
      return;
    }
    issues.push(`console: ${text}`);
  });

  return issues;
}

function primaryNavItem(page, label) {
  return page.getByRole('navigation').first().getByText(label, { exact: true });
}

async function seedStructuredDiscipleshipBook(page, request) {
  const libraryResponse = await request.get(appUrl('/api/study-imports/library'));
  if (!libraryResponse.ok()) return;
  const libraryPayload = await libraryResponse.json();
  const structuredRecord = libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan && /experiencing god/i.test(record.title))
    || libraryPayload.records?.find((record) => record.status === 'structured' && record.generatedPlan);
  if (!structuredRecord) return;

  await page.addInitScript((record) => {
    const key = 'chronicle-app-state';
    const persisted = window.localStorage.getItem(key);
    const parsed = persisted ? JSON.parse(persisted) : { state: {}, version: 6 };
    const existingBooks = Array.isArray(parsed.state?.ownedBooks) ? parsed.state.ownedBooks.filter((book) => book.id !== record.id) : [];
    const nextBook = {
      id: record.id,
      title: record.title,
      sourcePath: record.storedPath,
      textPath: record.ocrTextPath || undefined,
      assets: record.assets,
      classification: record.classification || 'general-book',
      workflow: record.workflow === 'preserve-daily' ? 'preserve-daily' : 'ai-daily-study',
      status: 'ready',
      summary: record.summary || record.generatedPlan?.summary,
      importedAt: String(record.uploadedAt || '').split('T')[0],
      generatedPlan: record.generatedPlan,
      studyState: { currentDay: 1, bookmarks: [], entriesByDay: {} },
    };
    const next = {
      ...parsed,
      state: {
        ...parsed.state,
        ownedBooks: [nextBook, ...existingBooks],
        activeOwnedBookId: parsed.state?.activeOwnedBookId || record.id,
      },
      version: typeof parsed.version === 'number' ? parsed.version : 6,
    };
    window.localStorage.setItem(key, JSON.stringify(next));
  }, structuredRecord);
}

test('chronicle app smoke flow', async ({ page, request }) => {
  const issues = collectRuntimeIssues(page);
  await seedStructuredDiscipleshipBook(page, request);

  await page.goto(appUrl('/'));
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Today's Thread")).toBeVisible();
  await expect(page.getByText('Recurring Rhythms')).toBeVisible();
  await expect(page.getByText('Reflection Prompts').first()).toBeVisible();
  await page.getByRole('button', { name: "Open Today's Study" }).click();
  await expect(page.getByText(/Day 1 ·/)).toBeVisible();
  await primaryNavItem(page, 'Today').click();
  const expandChronicleAI = page.getByRole('button', { name: 'Expand Chronicle AI' });
  if (await expandChronicleAI.isVisible().catch(() => false)) {
    await expandChronicleAI.click();
  }
  await expect(page.getByText(/Thread:/).first()).toBeVisible();
  await expect(page.locator('#chronicle-agent-mode-select')).toHaveValue('reflection_guide');
  await page.getByRole('button', { name: 'What pattern do you see here?' }).click();
  await expect(page.locator('textarea').last()).toHaveValue('What pattern do you see here?');
  await page.getByRole('button', { name: 'Use in Prayer' }).click();
  await expect(page).toHaveURL(/\/prayer/);
  await expect(page.getByText('Prayer', { exact: true }).first()).toBeVisible();
  await expect(page.locator('textarea').first()).toContainText('What pattern do you see here?');
  await primaryNavItem(page, 'Today').click();
  await page.getByRole('button', { name: 'Give me a Chronicle reflection' }).click();
  await page.getByRole('button', { name: 'Save Reflection', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Chronicle' }).click();
  await page.getByRole('button', { name: 'Open Study' }).click();
  await expect(page.getByRole('button', { name: 'Open in Bible' })).toBeVisible();
  await primaryNavItem(page, 'Today').click();

  await primaryNavItem(page, 'Bible').click();
  await expect(page.getByRole('button', { name: /Theme Overlay/ })).toBeVisible();
  await expect(page.locator('#chronicle-agent-mode-select')).toHaveValue('bible_study_agent');
  await page.getByRole('button', { name: 'Summarize Psalm 23' }).click();
  await expect(page.locator('textarea').last()).toHaveValue(/Summarize Psalm 23(:\d+)?/);
  await expect(page.getByText(/Thread: Bible · Psalm 23/)).toBeVisible();
  await page.getByRole('button', { name: 'Open Themes' }).click();
  await expect(page.getByText('Reading Layer Status')).toBeVisible();
  await expect(page.getByText('Why Chronicle Thinks This').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open Echoes' }).click();
  await expect(page.getByText(/canonical echoes and cross references from your local study library/i)).toBeVisible();

  await primaryNavItem(page, 'Study').click();
  await expect(page.getByRole('button', { name: 'Open in Bible' })).toBeVisible();
  await page.getByRole('button', { name: 'Summarize today\'s study' }).click();
  await page.getByRole('button', { name: 'Save as Study' }).click();
  await expect(page.getByText('Related Chronicle Entries')).toBeVisible();
  await expect(page.getByText('Study · AI Study Questions').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open Discipleship' }).first().click();
  await expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible();
  await page.getByRole('navigation').getByText('Study', { exact: true }).click();
  await page.getByRole('button', { name: 'Turn Into Prayer' }).click();
  await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  await expect(page.locator('textarea').first()).toContainText('Lord, use');
  await primaryNavItem(page, 'Study').click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Day 2 ·', { exact: false })).toBeVisible();

  await primaryNavItem(page, 'Discipleship').click();
  await expect(page.locator('#chronicle-agent-mode-select')).toHaveValue('discipleship_coach');
  await expect(page.getByRole('button', { name: /Workbook|Study/ }).first()).toBeVisible();
  await primaryNavItem(page, 'Today').click();
  await page.getByRole('button', { name: 'Open Discipleship' }).first().click();
  await expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pray This Day' }).click();
  await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  await expect(page.locator('textarea').first()).toContainText('form me through');
  await primaryNavItem(page, 'Discipleship').click();
  await expect(page.getByRole('button', { name: 'Workbook', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Workbook', exact: true }).click();
  await expect(page.getByText('Workbook Mode')).toBeVisible();
  const mappedPageLabel = page.getByText(/^Page \d+/, { exact: false }).first();
  const workbookFallback = page.getByText(/No scanned source pages are available yet for this day/i).first();
  if (await mappedPageLabel.isVisible().catch(() => false)) {
    await expect(mappedPageLabel).toBeVisible();
  } else {
    await expect(workbookFallback).toBeVisible();
  }
  await page.getByRole('button', { name: 'Open Workbook' }).click();
  await expect(page.getByText('Workbook Mode')).toBeVisible();

  await page.getByRole('navigation').getByText('Prayer', { exact: true }).click();
  await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  await expect(page.locator('#chronicle-agent-mode-select')).toHaveValue('prayer_guide');
  await expect(page.getByText('Related Chronicle Entries')).toBeVisible();
  await expect(page.getByText('Recurring Rhythms').last()).toBeVisible();
  await expect(page.getByText('Save Reflection Prompts')).toBeVisible();
  await page.getByRole('button', { name: '+ Add Request' }).click();
  await page.getByPlaceholder('What would you like to bring before God?').fill('Playwright prayer request for app smoke test');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const prayerRequestCard = page.getByText('Playwright prayer request for app smoke test').locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  await expect(prayerRequestCard).toBeVisible();
  await prayerRequestCard.getByRole('button', { name: 'Mark Answered' }).click();
  await page.getByPlaceholder('Write the answer, provision, clarity, or change Chronicle should remember.').fill('Chronicle captured the answer during the smoke test.');
  await page.getByPlaceholder('Philippians 4:19').fill('Philippians 4:19');
  await page.getByRole('button', { name: 'Save Answer' }).click();
  await expect(page.getByText('Answered Prayers')).toBeVisible();
  await expect(page.getByText('Chronicle captured the answer during the smoke test.', { exact: true })).toBeVisible();

  await primaryNavItem(page, 'Chronicle').click();
  await expect(page.getByText('Answered prayer — Playwright prayer request for app smoke').first()).toBeVisible();
  await expect(page.getByText('Formation Story')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Prompt Set' }).first()).toBeVisible();
  const returnToPrayer = page.getByRole('button', { name: 'Return to Prayer' }).first();
  if (await returnToPrayer.isVisible().catch(() => false)) {
    await returnToPrayer.click();
    await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
    await primaryNavItem(page, 'Chronicle').click();
  }
  await page.getByRole('button', { name: 'Psalm 23:2' }).click();
  await expect(page.getByText('Psalm 23').first()).toBeVisible();
  await primaryNavItem(page, 'Chronicle').click();
  await page.getByRole('button', { name: 'Legacy View' }).evaluate((element) => element.click());
  await expect(page.getByText('The Shape of Returning')).toBeVisible();

  await primaryNavItem(page, 'Themes').click();
  await expect(page).toHaveURL(/\/themes/);
  await expect(page.locator('input[placeholder="Find a theme..."]').first()).toBeVisible();

  await primaryNavItem(page, 'Plans').click();
  await expect(page.getByText('Active Plan')).toBeVisible();
  await expect(page.getByText('Strongest Rhythm')).toBeVisible();

  await primaryNavItem(page, 'Insights').click();
  await expect(page.getByText('Formation Summary')).toBeVisible();
  await expect(page.getByText('Prayer Outcomes')).toBeVisible();
  await expect(page.getByText('Growth Story')).toBeVisible();

  await primaryNavItem(page, 'Settings').click();
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
  await expect(page.getByText('Profile', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('prayer follow-up').first()).toBeVisible();

  expect(issues, issues.join('\n')).toEqual([]);
});

test('chronicle key surfaces stay usable on a phone-width viewport', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(appUrl('/'));

  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Today's Thread")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Chronicle AI' })).toBeVisible();

  await page.getByRole('navigation').getByText('Prayer', { exact: true }).click();
  await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Follow Up Queue')).toBeVisible();

  await page.getByRole('navigation').getByText('Study', { exact: true }).click();
  await expect(page.getByText(/Day 1 ·/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open in Bible' })).toBeVisible();

  await page.getByRole('navigation').getByText('Bible', { exact: true }).click();
  const themeOverlayButton = page.getByRole('button', { name: /Theme Overlay/ }).first();
  const openThemesButton = page.getByRole('button', { name: 'Open Themes' }).first();
  if (await openThemesButton.isVisible().catch(() => false)) {
    await expect(openThemesButton).toBeVisible();
    await openThemesButton.click();
  } else {
    await themeOverlayButton.evaluate((element) => element.click());
  }
  await expect(page.getByText('Reading Layer Status')).toBeVisible();

  await page.getByRole('navigation').getByText('Settings', { exact: true }).click();
  await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
  await expect(page.getByText('Profile', { exact: true }).last()).toBeVisible();
});
