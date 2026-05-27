import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

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

test('bible study modes surface echoes, study colors, and greek word study', async ({ page }) => {
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

  await page.getByRole('button', { name: '↔ Echoes' }).evaluate((element) => element.click());
  await expect(page.getByText('Reading Layer Status')).toBeVisible();
  await expect(page.getByText(/Active mode: Echoes/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Genesis 1:1' }).first()).toBeVisible();
  await expect(page.getByTitle(/Genesis 1:1/).first()).toBeVisible();
  const comparePanel = page.locator('div').filter({ hasText: 'Translation Compare · Verse 1' }).first();
  await expect(comparePanel).toBeVisible();
  await expect(comparePanel).toContainText('NKJV Local Library');
  await expect(comparePanel).toContainText('CSB Local Library');

  await page.getByRole('button', { name: /Theme Overlay/ }).evaluate((element) => element.click());
  await expect(page.getByText(/Focused Verse Guide · Verse \d+/).first()).toBeVisible();
  await expect(page.getByText('Evidence Posture')).toBeVisible();
  await expect(page.getByText('Guided Canonical Thread')).toBeVisible();
  await expect(page.getByText('Passage-Level Theological Synthesis')).toBeVisible();
  await expect(page.getByText(/Theological center:/)).toBeVisible();
  await expect(page.getByText(/eternal Word|Creator side of reality|new creation people/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Genesis 1:1' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Canonical Thread' })).toBeVisible();
  await expect(page.getByText('Translation Discernment')).toBeVisible();
  await expect(page.getByText(/Variation type:/).first()).toBeVisible();
  await expect(page.getByText(/Shared core:/).first()).toBeVisible();
  await expect(page.getByText(/How to read it:/).first()).toBeVisible();

  await page.getByRole('button', { name: /◌ Study Colors|● Study Colors/ }).evaluate((element) => element.click());
  await expect(page.getByText('Study Color Code gives you a simpler reading layer')).toBeVisible();
  await expect(page.getByText(/Active mode: Study Colors/)).toBeVisible();
  await expect(page.getByText('Identity & Confession').first()).toBeVisible();

  await page.getByRole('button', { name: /^α Greek$/ }).evaluate((element) => element.click());
  await expect(page.getByText('Greek / Word Study follows the New Testament text')).toBeVisible();
  await expect(page.getByText(/Active mode: Greek \/ Word Study/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verse 1', exact: true }).first()).toBeVisible();
  await expect(page.getByText('λόγος').first()).toBeVisible();
});

test('john 3 surfaces richer synthesis and canonical thread guidance', async ({ page }) => {
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

  await expect(page.locator('h2').first()).toContainText('John 3');
  await expect(page.getByText('Passage-Level Theological Synthesis')).toBeVisible();
  await expect(page.getByText('New Birth, Belief, and the Crisis of Light')).toBeVisible();
  await expect(page.getByText(/The lifted-up Son is the saving answer to human need/i)).toBeVisible();
  await expect(page.getByText('Guided Canonical Thread')).toBeVisible();
  await expect(page.getByText('From Wilderness Provision to New-Creation Life')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Numbers 21:8-9' })).toBeVisible();
});
