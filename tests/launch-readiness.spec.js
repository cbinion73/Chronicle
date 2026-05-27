import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

test.skip(!process.env.CHRONICLE_DEV_SERVER, 'Requires a running Chronicle dev server.');

test('launch readiness endpoints and docs are coherent', async ({ request }) => {
  const [settingsRes, bibleLibraryRes, syncRes, studyLibraryRes, workbookAuditRes, voiceStatusRes] = await Promise.all([
    request.get(appUrl('/settings')),
    request.get(appUrl('/api/bible-library/status')),
    request.get(appUrl('/api/chronicle-sync/status')),
    request.get(appUrl('/api/study-imports/library')),
    request.get(appUrl('/api/study-imports/workbook-audit')),
    request.get(appUrl('/api/voice/status')),
  ]);

  expect(settingsRes.ok()).toBeTruthy();
  expect(await settingsRes.text()).toContain('Chronicle');

  const bibleLibrary = await bibleLibraryRes.json();
  expect(bibleLibrary.ok).toBeTruthy();
  expect(Array.isArray(bibleLibrary.translations)).toBeTruthy();
  expect(bibleLibrary.translations.length).toBeGreaterThan(0);

  const syncStatus = await syncRes.json();
  expect(syncStatus.summary?.syncModelVersion || 0).toBeGreaterThan(0);

  const studyLibrary = await studyLibraryRes.json();
  expect(Array.isArray(studyLibrary.records)).toBeTruthy();
  expect(studyLibrary.manifest?.schemaVersion || 0).toBeGreaterThan(0);

  const workbookAudit = await workbookAuditRes.json();
  expect(Array.isArray(workbookAudit.audits)).toBeTruthy();

  const voiceStatus = await voiceStatusRes.json();
  expect(voiceStatus.ok).toBeTruthy();
  expect(voiceStatus.providers).toBeTruthy();
});
