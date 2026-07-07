import { test, expect } from '@playwright/test';
import { appUrl } from './testUrls';

test('exploring the knowledge graph — people, relationships, and places link together', async ({ page }) => {
  await page.goto(appUrl('/explore'));
  await expect(page.getByRole('heading', { name: 'Adam' })).toBeVisible();

  await page.getByPlaceholder('Find a person...').fill('Abraham');
  await page.getByRole('button', { name: /^Abraham/ }).click();
  await expect(page.getByRole('heading', { name: 'Abraham' })).toBeVisible();
  await expect(page.getByText('Called out of Ur')).toBeVisible();

  // Jump to a related person via the relationship list.
  await page.getByRole('button', { name: /Spouse of\s+Sarah/ }).click();
  await expect(page.getByRole('heading', { name: 'Sarah' })).toBeVisible();

  // Jump to a place tied to this person, landing on the Places tab.
  await page.getByRole('button', { name: /📍 Hebron/ }).first().click();
  await expect(page).toHaveURL(/\/explore\/places/);
  await expect(page.getByRole('heading', { name: 'Hebron' })).toBeVisible();
  await expect(page.getByText('Who Was Here')).toBeVisible();

  // Search narrows the list.
  await page.getByPlaceholder('Find a place...').fill('Jerusalem');
  await expect(page.getByRole('button', { name: /^Jerusalem/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bethlehem/ })).not.toBeVisible();

  // A passage chip opens the Bible reader.
  await page.getByRole('button', { name: /^Jerusalem/ }).click();
  await page.getByRole('button', { name: /^2 Samuel 5/ }).click();
  await expect(page).toHaveURL(/\/bible/);
});
