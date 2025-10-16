import { test, expect } from '@playwright/test';

test('homepage loads and DriveNet title visible', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DriveNet/i);
});

test('bottom navigation has 4 tabs', async ({ page }) => {
  await page.goto('/');
  const findLifts = page.getByTestId('button-nav-find');
  const schedule = page.getByTestId('button-nav-schedule');
  const messages = page.getByTestId('button-nav-messages');
  const profile = page.getByTestId('button-nav-profile');
  
  await expect(findLifts).toBeVisible();
  await expect(schedule).toBeVisible();
  await expect(messages).toBeVisible();
  await expect(profile).toBeVisible();
});

test('Add Delivery Job dialog opens', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('button-nav-schedule').click();
  await page.getByTestId('button-add-job').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
