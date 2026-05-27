import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function settingsNavItem(page, label) {
  return page.locator('nav[aria-label="Settings sections"]').getByRole('button', { name: new RegExp(escapeRegex(label)) }).first();
}

async function seedBibleView(page, view) {
  await page.addInitScript((bibleView) => {
    const key = 'chronicle-app-state';
    const persisted = window.localStorage.getItem(key);
    const parsed = persisted ? JSON.parse(persisted) : { state: {}, version: 6 };
    const next = {
      ...parsed,
      state: {
        ...parsed.state,
        theme: parsed.state?.theme || 'light',
        translation: parsed.state?.translation || 'NKJV',
        bibleView: {
          ...parsed.state?.bibleView,
          ...bibleView,
        },
      },
      version: typeof parsed.version === 'number' ? parsed.version : 6,
    };
    window.localStorage.setItem(key, JSON.stringify(next));
  }, view);
}

test('bible local provider copy is clean and theme overlay stays meaningful across chapters', async ({ page }) => {
  await seedBibleView(page, {
    book: 'John',
    chapter: 3,
    overlayOn: true,
    showThemePanel: true,
    panelMode: 'themes',
    echoesOn: false,
    studyColorsOn: false,
    greekOn: false,
  });
  await page.goto(appUrl('/bible'));
  await page.locator('h2').first().waitFor({ timeout: 10000 });

  const providerSelect = page.locator('select[title="Chronicle local Bible source"]');
  await expect(providerSelect).toBeVisible();
  const optionLabels = await providerSelect.locator('option').allTextContents();
  expect(optionLabels).not.toContain('Chronicle Prototype Cache');

  await expect(page.getByText(/Generated locally with jadenzaleski\/BibleTranslations from privately installed source pages\./)).toBeVisible();
  await expect(page.locator('h2').first()).toContainText('John 3');
  await expect(page.locator('#verse-16')).toContainText('For God so loved the world');
  await expect(page.getByRole('button', { name: /Theme Overlay/ })).toBeVisible();
  await expect(page.getByText(/New Birth|Salvation|Identity of Christ|Judgment/).first()).toBeVisible();
});

test('settings data and privacy shows the full study import workflow', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });

  await settingsNavItem(page, 'Data & Privacy').click();
  await expect(page.getByText('Data & Privacy', { exact: true }).last()).toBeVisible();
  await expect.poll(async () => await page.getByText('Storage').first().isVisible().catch(() => false)).toBeTruthy();

  await page.getByText('Study Imports', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Study Imports', { exact: true })).toBeVisible();
  await expect(page.getByText('Choose a PDF from your computer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recommend Chunking' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Whole Book in Segments' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import & Apply MasterLife' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Discipleship' }).first()).toBeVisible();
  await expect(page.getByText('Import Progress')).toBeVisible();
  await expect(page.getByText('No active import')).toBeVisible();
  await expect(page.getByText('Chronicle Study Library')).toBeVisible();
  await expect.poll(async () => (
    await page.getByText(/Library manifest v\d+ · record schema v\d+ · owned book schema v\d+/).first().isVisible().catch(() => false)
  )).toBeTruthy();
  await expect(page.getByRole('button', { name: /Refresh Library|Refreshing…/ }).first()).toBeVisible();
  const libraryResponse = await page.request.get(appUrl('/api/study-imports/library'));
  expect(libraryResponse.ok()).toBeTruthy();
  const libraryPayload = await libraryResponse.json();
  expect(libraryPayload.manifest?.schemaVersion || 0).toBeGreaterThan(0);
  expect(Array.isArray(libraryPayload.records)).toBeTruthy();
  if (libraryPayload.records.length > 0) {
    await expect.poll(async () => await page.getByRole('button', { name: 'Delete Book' }).count()).toBeGreaterThan(0);
  }
  for (const record of libraryPayload.records) {
    expect(record.schemaVersion || 0).toBeGreaterThan(0);
    expect(Array.isArray(record.assets?.managed)).toBeTruthy();
    if (record.assets?.managed?.length) {
      expect(typeof record.assets.managed[0].id).toBe('string');
      expect(typeof record.assets.managed[0].relativePath).toBe('string');
    }
  }
  const ocrCompleteOrStructuredRecord = libraryPayload.records.find((record) => ['ocr_complete', 'structured'].includes(record.status) && record.ocrTextPath);
  if (ocrCompleteOrStructuredRecord) {
    expect(ocrCompleteOrStructuredRecord.ocrQuality).toBeTruthy();
    expect(typeof ocrCompleteOrStructuredRecord.ocrQuality.pageCount).toBe('number');
  }
  const needsRepairRecord = libraryPayload.records.find((record) => record.ocrQuality && record.ocrQuality.confidence !== 'high');
  if (needsRepairRecord) {
    await expect(page.getByRole('button', { name: /Repair OCR|Re-run OCR/ }).first()).toBeVisible();
  }
  await expect(page.getByText('Discipleship Workbook QA')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh QA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Workbook Sync' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Workbook QA' })).toBeVisible();
  await expect(page.getByText(/Audited days|Cue-safe days|Uncovered cue pages/).first()).toBeVisible();
  if ((libraryPayload.records?.length || 0) > 0) {
    const readinessVisible = await page.getByText('Book readiness').isVisible().catch(() => false);
    const noAuditYetVisible = await page.getByText(/has not generated a workbook QA audit yet|No workbook response cues were found/i).first().isVisible().catch(() => false);
    expect(readinessVisible || noAuditYetVisible).toBeTruthy();
  }
  const reviewWorkbookButton = page.getByRole('button', { name: 'Review Workbook' }).first();
  if (await reviewWorkbookButton.isVisible().catch(() => false)) {
    await reviewWorkbookButton.click();
    await expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible();
    const workbookImage = page.locator('img[alt*="page"]').first();
    const workbookModeText = page.getByText(/Workbook Mode|These overlays and the Study prompts use the same saved answers/i).first();
    const sourceFallbackText = page.getByText(/No scanned source pages are available yet for this day/i).first();
    const studyStructureText = page.getByText('Day Structure', { exact: true }).first();
    const imageVisible = await workbookImage.isVisible().catch(() => false);
    if (imageVisible) {
      await expect(workbookImage).toHaveAttribute('src', /book-page-image/);
    } else {
      await expect(workbookModeText.or(sourceFallbackText).or(studyStructureText)).toBeVisible();
    }
    await page.goto(appUrl('/settings'));
    await settingsNavItem(page, 'Data & Privacy').click();
    await expect.poll(async () => await page.getByText('Storage').first().isVisible().catch(() => false)).toBeTruthy();
  } else {
    await expect(page.getByText(/has not generated a workbook QA audit yet|No workbook response cues were found/i).first()).toBeVisible();
  }
  await expect(page.getByText('Chronicle Sync Snapshot')).toBeVisible();
  await expect(page.getByText('Data Health Center')).toBeVisible();
  await expect(page.getByText(/Cache gaps|OCR repair queue|Workbook flags/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Chronicle Snapshot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import & Merge Snapshot File' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Merge Latest Snapshot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download Latest Snapshot' })).toBeVisible();
  await expect(page.getByText(/Portable merge policy:/).first()).toBeVisible();
});

test('study library books can be deleted without touching the user source outside Chronicle', async ({ page }) => {
  const uniqueStem = `delete-me-${Date.now()}`;
  const uploadResponse = await page.request.post(appUrl('/api/study-imports/upload-book'), {
    data: {
      fileName: `${uniqueStem}.pdf`,
      contentBase64: Buffer.from('%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n').toString('base64'),
    },
  });
  expect(uploadResponse.ok()).toBeTruthy();
  const uploadPayload = await uploadResponse.json();
  expect(uploadPayload.recordId || '').not.toEqual('');

  const beforeDeleteResponse = await page.request.get(appUrl('/api/study-imports/library'));
  expect(beforeDeleteResponse.ok()).toBeTruthy();
  const beforeDeletePayload = await beforeDeleteResponse.json();
  expect(beforeDeletePayload.records.some((record) => record.id === uploadPayload.recordId)).toBeTruthy();

  const deleteResponse = await page.request.post(appUrl('/api/study-imports/delete-book'), {
    data: { bookId: uploadPayload.recordId },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deletePayload = await deleteResponse.json();
  expect(deletePayload.ok).toBeTruthy();
  expect(deletePayload.bookId).toBe(uploadPayload.recordId);
  expect(Array.isArray(deletePayload.removedPaths)).toBeTruthy();
  expect(deletePayload.removedPaths.length).toBeGreaterThan(0);

  const afterDeleteResponse = await page.request.get(appUrl('/api/study-imports/library'));
  expect(afterDeleteResponse.ok()).toBeTruthy();
  const afterDeletePayload = await afterDeleteResponse.json();
  expect(afterDeletePayload.records.some((record) => record.id === uploadPayload.recordId)).toBeFalsy();
});

test('settings data and privacy can create a Chronicle sync snapshot', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });

  await settingsNavItem(page, 'Data & Privacy').click();
  await expect.poll(async () => await page.getByText('Storage').first().isVisible().catch(() => false)).toBeTruthy();
  const [exportResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/chronicle-sync/export') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Create Chronicle Snapshot' }).click(),
  ]);
  expect(exportResponse.ok()).toBeTruthy();
  const exportPayload = await exportResponse.json();
  expect(exportPayload.snapshot?.id || '').toContain('snapshot-');
  expect(exportPayload.snapshot?.schemaVersion || 0).toBeGreaterThan(0);
  expect(exportPayload.snapshot?.appStateVersion || 0).toBeGreaterThan(0);
  const syncStatusResponse = await page.request.get(appUrl('/api/chronicle-sync/status'));
  expect(syncStatusResponse.ok()).toBeTruthy();
  const syncStatusPayload = await syncStatusResponse.json();
  expect(syncStatusPayload.latestSnapshot?.id || '').toContain('snapshot-');
  expect(syncStatusPayload.summary?.snapshotSchemaVersion || 0).toBeGreaterThan(0);
  expect(syncStatusPayload.summary?.appStateVersion || 0).toBeGreaterThan(0);
  expect(syncStatusPayload.snapshots?.length || 0).toBeGreaterThan(0);
  await expect(page.getByText(/Snapshot schema v\d+ · app state v\d+/).first()).toBeVisible();
  const downloadResponse = await page.request.get(appUrl('/api/chronicle-sync/download-latest'));
  expect(downloadResponse.ok()).toBeTruthy();
  expect((await downloadResponse.text())).toContain('appState');
});

test('legacy Chronicle snapshot imports are migrated onto the current app-state contract', async ({ page }) => {
  const legacySnapshot = {
    id: '"snapshot-legacy-migration-check"',
    createdAt: '2026-04-01T12:00:00.000Z',
    schemaVersion: 1,
    appStateVersion: 1,
    appState: {
      theme: 'dark',
      translation: 'ESV',
      bibleView: {
        book: 'John',
        chapter: 1,
      },
      chronicleEntries: [],
      prayerItems: [],
      scriptureBookmarks: [],
      ownedBooks: [],
    },
  };

  const importResponse = await page.request.post(appUrl('/api/chronicle-sync/import'), {
    data: {
      snapshot: legacySnapshot,
    },
  });
  expect(importResponse.ok()).toBeTruthy();
  const importPayload = await importResponse.json();
  expect(importPayload.snapshot?.schemaVersion || 0).toBeGreaterThanOrEqual(2);
  expect(importPayload.snapshot?.appStateVersion || 0).toBeGreaterThanOrEqual(6);
  expect(importPayload.appState?.translation).toBe('NKJV');
  expect(Array.isArray(importPayload.appState?.bibleView?.activeThemeIds)).toBeTruthy();

  const restoreResponse = await page.request.get(`${appUrl('/api/chronicle-sync/restore')}?snapshotId=${encodeURIComponent(importPayload.snapshot.id)}`);
  expect(restoreResponse.ok()).toBeTruthy();
  const restorePayload = await restoreResponse.json();
  expect(restorePayload.appState?.translation).toBe('NKJV');
  expect(restorePayload.snapshot?.schemaVersion || 0).toBeGreaterThanOrEqual(2);
  expect(restorePayload.snapshot?.appStateVersion || 0).toBeGreaterThanOrEqual(6);
});

test('settings scripture shows local bible library and theme cache controls', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });

  await settingsNavItem(page, 'Scripture').click();
  await expect(page.getByText('Chronicle Bible Library')).toBeVisible();
  await expect(page.getByText('Theme Analysis Cache')).toBeVisible();
  await expect(page.getByRole('button', { name: /Refresh Bible Library|Refreshing…/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Build Missing Analyses|Building…/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rebuild Selected' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build Missing' }).first()).toBeVisible();
  await expect(page.getByText(/cached ·/).first()).toBeVisible();
  const cacheResponse = await page.request.get(`${appUrl('/api/theme-analysis-cache')}?book=John&chapter=1&translation=nkjv`);
  expect(cacheResponse.ok()).toBeTruthy();
  const cachePayload = await cacheResponse.json();
  expect(cachePayload.version || '').not.toEqual('');
  expect(Array.isArray(cachePayload.themes)).toBeTruthy();
  expect(cachePayload.themes.length).toBeGreaterThan(0);
});

test('settings AI companion exposes role, persona, and provider controls', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });

  await settingsNavItem(page, 'AI Companion').click();
  await expect(page.getByText('Companion Roles')).toBeVisible();
  await expect(page.getByText('Provider Routing')).toBeVisible();
  await expect(page.getByText('Default Agent Role')).toBeVisible();
  await expect(page.getByText('Chronicle currently remembers')).toBeVisible();
  await expect(page.getByText('Default Persona')).toBeVisible();
  await expect(page.getByText('Bible Reader Provider')).toBeVisible();
  await expect(page.getByText(/Installed providers|Saved analyses/).first()).toBeVisible();
  await expect(page.getByText('Voice Platform')).toBeVisible();
  await expect(page.getByText('Whisper and Piper', { exact: true })).toBeVisible();
  await expect(page.getByText('Home Assistant Bridge', { exact: true })).toBeVisible();
  await expect(page.getByText('LiveKit Sessions', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Refresh Voice Status|Refreshing…/ })).toBeVisible();
  const voiceStatusResponse = await page.request.get(appUrl('/api/voice/status'));
  expect(voiceStatusResponse.ok()).toBeTruthy();
  const voiceStatusPayload = await voiceStatusResponse.json();
  expect(voiceStatusPayload.ok).toBeTruthy();
  expect(voiceStatusPayload.providers).toBeTruthy();
  expect(typeof voiceStatusPayload.providers.whisperCli.available).toBe('boolean');
});

test('settings about page exposes onboarding and recovery guidance', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });

  await settingsNavItem(page, 'About').click();
  await expect(page.getByText('Getting Started')).toBeVisible();
  await expect(page.getByText('Launch Readiness')).toBeVisible();
  await expect(page.getByText('If Something Feels Off')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Scripture' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Data & Privacy' }).first()).toBeVisible();
});

test('settings category deep links stay live while settings is already mounted', async ({ page, context }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText("You're offline.")).toBeVisible();

  await page.getByRole('button', { name: 'Open Sync' }).click();
  await expect(page.getByText('Data & Privacy', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Chronicle Sync Snapshot')).toBeVisible();
});

test('general-book analysis preserves source sections when building a daily study plan', async ({ page }) => {
  const response = await page.request.post(appUrl('/api/discipleship/analyze-book'), {
    data: {
      title: 'Structured General Book',
      textPath: 'data/ocr/fixtures/structured-general-book.txt',
      workflow: 'ai-daily-study',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.classification).toBe('general-book');
  expect(payload.recommendedWorkflow).toBe('ai-daily-study');
  expect(payload.generatedPlan?.summary || '').toContain('source sections');
  expect(payload.generatedPlan?.generationStrategy).toBe('source-sections');
  expect(payload.generatedPlan?.sourceDiagnostics?.sourceHealth).toBeTruthy();
  expect(payload.generatedPlan?.sourceDiagnostics?.mappedDayCount || 0).toBeGreaterThan(0);
  expect(payload.generatedPlan?.days?.length || 0).toBeGreaterThanOrEqual(5);
  expect(payload.generatedPlan?.days?.[0]?.title).toBe('Listening for God\'s Voice');
  expect(payload.generatedPlan?.days?.[1]?.title).toBe('Practicing Costly Obedience');
  expect(payload.generatedPlan?.days?.every((day) => day.phase === 'Generated from Source Sections')).toBeTruthy();
  expect(typeof payload.generatedPlan?.days?.[0]?.id).toBe('string');
  expect(['devotional', 'question-driven', 'workbook', 'teaching', 'narrative', 'mixed']).toContain(payload.generatedPlan?.days?.[0]?.sourceDiagnostics?.structure);
  expect(typeof payload.generatedPlan?.days?.[0]?.sourceDiagnostics?.scriptureReferenceCount).toBe('number');
  expect(typeof payload.generatedPlan?.days?.[0]?.sourceDiagnostics?.questionCount).toBe('number');
  expect(Array.isArray(payload.generatedPlan?.days?.[0]?.sourceDiagnostics?.warnings)).toBeTruthy();
});

test('malformed OCR source is rejected before Chronicle builds an untrustworthy study plan', async ({ page }) => {
  const response = await page.request.post(appUrl('/api/discipleship/analyze-book'), {
    data: {
      title: 'Sparse General Book',
      textPath: 'data/ocr/fixtures/sparse-general-book.txt',
      workflow: 'ai-daily-study',
    },
  });
  expect(response.status()).toBe(422);
  const payload = await response.json();
  expect(payload.error?.errmsg || '').toContain('too sparse');
});

test('john 1 late verses no longer smear the same theme stack across every verse', async ({ page }) => {
  await seedBibleView(page, {
    book: 'John',
    chapter: 1,
    overlayOn: true,
    showThemePanel: true,
    panelMode: 'themes',
    echoesOn: false,
    studyColorsOn: false,
    greekOn: false,
  });
  await page.goto(appUrl('/bible'));
  await page.locator('h2').first().waitFor({ timeout: 10000 });
  await expect(page.locator('h2').first()).toContainText('John 1');

  for (const verse of [38, 39, 41, 49, 51]) {
    const chips = await page.locator(`#verse-${verse}`).locator('span').allTextContents();
    const themeChips = chips.filter((value) => [
      'Calling/Discipleship',
      'Identity of Christ',
      'Witness/Testimony',
      'Revelation/Glory',
      'New Birth',
      'Reception/Rejection',
      'Sacrifice/Atonement',
      'Grace',
      'Incarnation',
      'Light',
    ].includes(value.trim()));
    expect(themeChips.length).toBeLessThanOrEqual(3);
  }
});
