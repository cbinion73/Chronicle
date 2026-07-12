import { test, expect, devices } from '@playwright/test';

const primaryDestinations = [
  'The Daily Office',
  'The Word',
  'The Prayer Room',
  'The Thread',
  'Settings',
];

test.describe('iOS shell', () => {
  test.use({
    viewport: devices['iPhone 13'].viewport,
    userAgent: devices['iPhone 13'].userAgent,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    isMobile: devices['iPhone 13'].isMobile,
    hasTouch: devices['iPhone 13'].hasTouch,
  });

  test('expands the active room sub-items in the top navigation', async ({ page }) => {
    await page.goto('/');

    const shell = page.locator('[data-platform="ios"][data-device-class="phone"]');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(shell).toBeVisible();
    await expect(nav.locator('..')).toHaveCSS('position', 'relative');
    await expect(page.locator('nav[aria-label="Section"]')).toHaveCount(0);
    expect(await page.locator('html').evaluate((element) => element.style.getPropertyValue('--chronicle-viewport-height'))).toMatch(/px$/);

    for (const destination of primaryDestinations) {
      const item = nav.getByRole('button', { name: destination });
      await expect(item).toBeVisible();
      expect((await item.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }

    await expect(nav.getByRole('button', { name: 'My Rule of Life' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Enter the Chapel' })).toBeVisible();

    await nav.getByRole('button', { name: 'The Word' }).click();
    await expect(page).toHaveURL(/\/bible$/);
    await expect(nav.getByRole('button', { name: 'The Word' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Daily Study' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Discipleship' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'My Rule of Life' })).toHaveCount(0);

    await nav.getByRole('button', { name: 'Daily Study' }).click();
    await expect(nav.getByRole('button', { name: 'The Word' })).not.toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Daily Study' })).toHaveAttribute('aria-current', 'page');

    await nav.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await nav.getByRole('button', { name: 'The Prayer Room' }).click();
    await expect.poll(() => nav.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(10);
    await expect(nav.getByRole('button', { name: 'The Prayer Room' }).first()).toBeInViewport();
  });

  test('keeps the expanding phone rail in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');

    await expect(page.locator('[data-platform="ios"][data-device-class="phone"]')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toHaveCSS('display', 'flex');
    await expect(page.locator('header')).toHaveCSS('flex-wrap', 'nowrap');
    await expect(nav.getByRole('button', { name: 'My Rule of Life' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Enter the Chapel' })).toBeVisible();
  });

  test('assigns legacy formation routes without falsely leading with Office', async ({ page }) => {
    await page.goto('/archaeology');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('button').first()).toHaveAccessibleName('The Thread');
    await expect(nav.getByRole('button', { name: 'Answered Light' })).toBeVisible();

    await page.goto('/prayer/answered-light');
    await expect(nav.getByRole('button').first()).toHaveAccessibleName('The Thread');
  });
});

test('desktop retains the existing rail and has no iOS marker', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-device-class="desktop"]').first()).toBeVisible();
  await expect(page.locator('[data-platform="ios"]')).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByText('The Daily Office', { exact: true })).toBeVisible();
  await expect(nav.locator('..')).not.toHaveCSS('position', 'fixed');

  await page.goto('/study');
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Section' }).getByRole('button', { name: 'Daily Study' })).toHaveAttribute('aria-current', 'page');
});

test('touch-enabled MacIntel is recognized as iPadOS, not macOS', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1366 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'MacIntel' });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  });
  await page.goto('/');

  await expect(page.locator('[data-platform="ios"][data-device-class="tablet"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' }).locator('..')).not.toHaveCSS('position', 'fixed');
  await context.close();
});
