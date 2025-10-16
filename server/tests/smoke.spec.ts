import { test, expect } from '@playwright/test';

// Basic DriveNet functional test
test('homepage loads, title visible, and map present', async ({ page }) => {
  await page.goto('http://localhost:5173/'); // or http://localhost:5000 if running through Express

  // 1. Check title
  await expect(page).toHaveTitle(/DriveNet/i);

  // 2. Check navigation
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible();

  // 3. Check map
  const map = page.locator('#map, .leaflet-container');
  await expect(map).toBeVisible();

  // 4. Check “Post Lift” button works (replace text if your button is named differently)
  await page.getByRole('button', { name: /post lift/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});