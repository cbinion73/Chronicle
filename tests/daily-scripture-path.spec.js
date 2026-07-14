import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { appUrl } from './testUrls';

function evaluateDailyScripture(expression) {
  const script = `
    import * as plans from './src/data/dailyScripturePlans.ts';
    import * as daily from './src/lib/dailyScripture.ts';
    import * as reading from './src/lib/readingHistory.ts';
    const value = (${expression});
    console.log(JSON.stringify(value));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(), encoding: 'utf8',
  }).trim());
}

test('both annual plans cover all 1,189 canonical chapters exactly once', () => {
  const result = evaluateDailyScripture(`Object.values(plans.DAILY_SCRIPTURE_PLANS).map(plan => ({ id: plan.id, ...daily.validateDailyScripturePlan(plan), chapterCount: plan.days.flatMap(day => day.readings).length, dayCount: plan.days.length }))`);
  expect(result).toHaveLength(2);
  for (const plan of result) {
    expect(plan.valid).toBe(true);
    expect(plan.dayCount).toBe(365);
    expect(plan.chapterCount).toBe(1189);
    expect(plan.missing).toEqual([]);
    expect(plan.duplicates).toEqual([]);
  }
});

test('the Office follows the local calendar day, including leap-year compression', () => {
  const result = evaluateDailyScripture(`(() => {
    const migrated = daily.normalizeDailyScriptureState(null, { currentPlanName: 'Daily Walk', currentPlanDay: 999 }, '2026-07-14');
    const migratedReading = daily.resolveDailyScripture(migrated, '2026-07-14');
    const switched = daily.selectDailyScripturePlan(migrated, plans.DAILY_SCRIPTURE_PLAN_IDS.canonical, '2026-07-14', '2026-07-14T12:00:00.000Z');
    const resumed = daily.selectDailyScripturePlan(switched, plans.DAILY_SCRIPTURE_PLAN_IDS.chronological, '2026-07-20');
    return {
      migratedDay: migratedReading.day,
      switchedDay: daily.resolveDailyScripture(switched, '2026-07-14').day,
      preservedStart: resumed.anchors[plans.DAILY_SCRIPTURE_PLAN_IDS.chronological].startDate,
      nextDay: daily.resolveDailyScripture(daily.createDefaultDailyScriptureState('2026-03-07'), '2026-03-08').day,
      leapDay: daily.calendarPlanDay('2024-02-29'),
      afterLeapDay: daily.calendarPlanDay('2024-03-01'),
      yearEnd: daily.calendarPlanDay('2024-12-31'),
    };
  })()`);
  expect(result.migratedDay).toBe(195);
  expect(result.switchedDay).toBe(195);
  expect(result.preservedStart).toBe('2026-01-01');
  expect(result.nextDay).toBe(67);
  expect(result.leapDay).toBe(59);
  expect(result.afterLeapDay).toBe(60);
  expect(result.yearEnd).toBe(365);
});

test('preference reconciliation preserves per-path anchors and rejects stale or malformed cloud state', () => {
  const result = evaluateDailyScripture(`(() => {
    const chronological = daily.createDefaultDailyScriptureState('2026-07-01');
    const canonical = daily.selectDailyScripturePlan(chronological, plans.DAILY_SCRIPTURE_PLAN_IDS.canonical, '2026-07-10', '2026-07-10T12:00:00.000Z');
    const newerChronological = daily.selectDailyScripturePlan(chronological, plans.DAILY_SCRIPTURE_PLAN_IDS.chronological, '2026-07-12', '2026-07-12T12:00:00.000Z');
    const merged = daily.mergeDailyScriptureStates(canonical, newerChronological, '2026-07-14');
    const stale = daily.mergeDailyScriptureStates(merged, canonical, '2026-07-14');
    const malformed = daily.mergeDailyScriptureStates(merged, {
      selectedPlanId: plans.DAILY_SCRIPTURE_PLAN_IDS.canonical,
      updatedAt: '2026-07-20T12:00:00.000Z',
      anchors: { [plans.DAILY_SCRIPTURE_PLAN_IDS.canonical]: { startDate: '2026-02-30', updatedAt: 'not-a-date' } },
    }, '2026-07-14');
    return {
      selected: merged.selectedPlanId,
      anchorCount: Object.keys(merged.anchors).length,
      staleSelected: stale.selectedPlanId,
      malformedSelected: malformed.selectedPlanId,
      normalizedInvalidDay: daily.normalizeDailyScriptureState({
        selectedPlanId: plans.DAILY_SCRIPTURE_PLAN_IDS.chronological,
        updatedAt: 'not-a-date',
        anchors: { [plans.DAILY_SCRIPTURE_PLAN_IDS.chronological]: { startDate: '2026-99-99', updatedAt: 'not-a-date' } },
      }, undefined, '2026-07-14').anchors[plans.DAILY_SCRIPTURE_PLAN_IDS.chronological].startDate,
      freshDeviceSelection: daily.mergeDailyScriptureStates(
        daily.createDefaultDailyScriptureState('2026-07-14'),
        canonical,
        '2026-07-14',
      ).selectedPlanId,
    };
  })()`);
  expect(result.selected).toBe('chronological-bible-one-year');
  expect(result.anchorCount).toBe(2);
  expect(result.staleSelected).toBe('chronological-bible-one-year');
  expect(result.malformedSelected).toBe('chronological-bible-one-year');
  expect(result.normalizedInvalidDay).toBe('1970-01-01');
  expect(result.freshDeviceSelection).toBe('canonical-bible-one-year');
});

test('runtime validation rejects structurally corrupt schedules', () => {
  const result = evaluateDailyScripture(`(() => {
    const source = plans.DAILY_SCRIPTURE_PLANS[plans.DAILY_SCRIPTURE_PLAN_IDS.canonical];
    const corrupt = { ...source, days: source.days.map((day, index) => index === 0 ? { ...day, day: 2 } : day) };
    return daily.validateDailyScripturePlan(corrupt);
  })()`);
  expect(result.valid).toBe(false);
});

test('chapter reading records produce a yearly checklist and an all-time tally', () => {
  const result = evaluateDailyScripture(`(() => {
    const entries = [
      reading.createReadingCompletionEntry('Genesis', 1, '2025-01-01'),
      reading.createReadingCompletionEntry('Genesis', 1, '2026-01-01'),
      reading.createReadingCompletionEntry('Genesis', 1, '2026-06-01', undefined, 'repeat-1'),
      reading.createReadingCompletionEntry('Isaiah', 25, '2026-07-14'),
      { id: 'bad-reading', date: '2026-07-14', type: 'study', title: 'Bad', body: '', sourceContext: { page: 'reading-log', readingCompletion: { book: 'Genesis', chapter: 999, year: 2026 } } },
    ];
    return {
      completed2026: [...reading.completedChapterKeys(entries, 2026)],
      leaders: reading.allTimeChapterCounts(entries),
      nextWithinBook: reading.nextCanonicalChapter('Genesis', 1),
      nextBook: reading.nextCanonicalChapter('Genesis', 50),
      oldToNewTestament: reading.nextCanonicalChapter('Malachi', 4),
      endOfBible: reading.nextCanonicalChapter('Revelation', 22),
    };
  })()`);
  expect(result.completed2026).toEqual(expect.arrayContaining(['Genesis:1', 'Isaiah:25']));
  expect(result.leaders[0]).toMatchObject({ book: 'Genesis', chapter: 1, count: 3 });
  expect(result.nextWithinBook).toEqual({ book: 'Genesis', chapter: 2 });
  expect(result.nextBook).toEqual({ book: 'Exodus', chapter: 1 });
  expect(result.oldToNewTestament).toEqual({ book: 'Matthew', chapter: 1 });
  expect(result.endOfBible).toBeNull();
});

test('Bible completion is distinct from ordinary navigation and advances only after a successful save', async ({ page }) => {
  let createdEntry;
  let postCount = 0;
  await page.addInitScript(() => localStorage.clear());
  await page.route('**/api/data/chronicle-entries', async (route) => {
    if (route.request().method() === 'POST') {
      postCount += 1;
      createdEntry = route.request().postDataJSON().entry;
      await new Promise((resolve) => setTimeout(resolve, 75));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entry: createdEntry }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [] }) });
  });
  await page.goto(appUrl('/bible'));
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();
  await page.getByRole('button', { name: '›', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Psalm 24' })).toBeVisible();
  expect(createdEntry).toBeUndefined();

  await page.getByRole('button', { name: 'Mark Read & Continue →' }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole('heading', { name: 'Psalm 25' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Psalms 24 marked read. Continuing to Psalms 25.' })).toBeVisible();
  expect(postCount).toBe(1);
  expect(createdEntry.sourceContext.readingCompletion).toMatchObject({ book: 'Psalms', chapter: 24, year: new Date().getFullYear() });
});

test('Bible completion stays on the current chapter when the local save fails', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route('**/api/data/chronicle-entries', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'write failed' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [] }) });
  });
  await page.goto(appUrl('/bible'));
  await page.getByRole('button', { name: 'Mark Read & Continue →' }).click();
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Chronicle could not mark Psalms 23 read. You have not been moved.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Read & Continue →' })).toBeEnabled();
});

test('a completed save does not override navigation chosen while the write is pending', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route('**/api/data/chronicle-entries', async (route) => {
    if (route.request().method() === 'POST') {
      const entry = route.request().postDataJSON().entry;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entry }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [] }) });
  });
  await page.goto(appUrl('/bible'));
  await page.getByRole('button', { name: '›', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Psalm 24' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark Read & Continue →' }).click();
  await page.getByRole('button', { name: '‹', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Psalms 24 marked read. Your current location was left unchanged.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Psalm 23' })).toBeVisible();
});

test('an already-read Bible chapter continues without creating a duplicate completion', async ({ page }) => {
  let postCount = 0;
  const currentYear = new Date().getFullYear();
  const existing = {
    id: `bible-reading-${currentYear}-psalms-23`,
    date: `${currentYear}-07-14`,
    type: 'study',
    title: 'Read Psalms 23',
    body: 'Completed Psalms 23 in the NKJV.',
    passage: 'Psalms 23',
    sourceContext: {
      page: 'reading-log',
      translation: 'NKJV',
      readingCompletion: { book: 'Psalms', chapter: 23, year: currentYear, completedAt: `${currentYear}-07-14T12:00:00` },
    },
  };
  await page.addInitScript(() => localStorage.clear());
  await page.route('**/api/data/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') postCount += 1;
    const body = path.endsWith('/chronicle-entries') ? { entries: [existing] }
      : path.endsWith('/prayer-items') ? { items: [] }
        : path.endsWith('/formation-rhythms') ? { rhythms: [] }
          : path.endsWith('/scripture-bookmarks') ? { bookmarks: [] }
            : path.endsWith('/owned-books') ? { books: [] }
              : path.endsWith('/memory-verses') ? { verses: [] }
                : { settings: {} };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(appUrl('/bible'));
  await page.getByRole('button', { name: '✓ Read — Continue to Psalms 24 →' }).click();
  await expect(page.getByRole('heading', { name: 'Psalm 24' })).toBeVisible();
  expect(postCount).toBe(0);
});

test('Daily Office uses its own path, labels NKJV, and hands off to the local NKJV reader', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(appUrl('/'));
  await expect(page.getByRole('heading', { name: 'The Word', exact: true })).toBeVisible();
  await expect(page.getByText(/Chronological Bible in One Year · Day 195 · NKJV/)).toBeVisible();
  await expect(page.getByText(/Isaiah 25 · Isaiah 26 · Isaiah 27/).first()).toBeVisible();
  await expect(page.getByLabel('Mark Isaiah 25 read')).toBeVisible();
  await page.getByRole('button', { name: /Read today's reading/ }).click();
  await expect(page).toHaveURL(/\/bible/);
  await expect(page.getByLabel('Primary Scripture source')).toHaveValue('offline_nkjv');
  await expect(page.getByLabel('Primary Scripture source')).toBeDisabled();
});

test('The Word exposes the yearly chapter checklist and all-time view', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(appUrl('/reading-log'));
  await expect(page.getByRole('heading', { name: 'Reading Record' })).toBeVisible();
  await expect(page.getByText('0 of 1,189 chapters')).toBeVisible();
  await expect(page.getByLabel('Checklist year')).toHaveValue('2026');
  await expect(page.getByRole('button', { name: 'All-Time Leaders' })).toBeVisible();
  await page.getByRole('button', { name: 'All-Time Leaders' }).click();
  await expect(page.getByText('Most-read chapters')).toBeVisible();
});

test('the shared Settings control changes Station 1 and preserves an explicit local status on missing files', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: /Scripture/ }).click();
  const pathSelect = page.locator('select').filter({ has: page.locator('option[value="canonical-bible-one-year"]') });
  await expect(pathSelect).toHaveValue('chronological-bible-one-year');
  await pathSelect.selectOption('canonical-bible-one-year');
  await page.route('**/bibles/library/nkjv/chapters/**', (route) => route.abort());
  await page.goto(appUrl('/'));
  await expect(page.getByText(/Bible in One Year · Day 195 · NKJV/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Missing local NKJV chapters|unavailable in the local Scripture library/ }).first()).toBeVisible();
  await expect(page.getByText(/Loading local NKJV/)).toHaveCount(0);
});

test('source code keeps Station 1 independent from Bible Study and routes preferences through Apple KVS', () => {
  const source = execFileSync('sh', ['-c', "sed -n '1,620p' src/pages/Office.tsx; sed -n '1,260p' apple/ChronicleApp/Sync/ChronicleDataBridge.swift"], { cwd: process.cwd(), encoding: 'utf8' });
  expect(source).not.toContain('studyModuleDayById');
  expect(source).not.toContain("getStudyDay('bible-study'");
  expect(source).toContain("'offline_nkjv'");
  expect(source).toContain('NSUbiquitousKeyValueStore.default');
  expect(source).toContain('preferences.daily-scripture.set');
});
