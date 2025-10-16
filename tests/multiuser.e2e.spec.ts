import { test, expect, chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

async function loginAs(page, id: string, email: string, name: string) {
  const resp = await page.request.post(`${BASE}/api/test/seed-user`, {
    data: { id, email, sub: 'active', name }
  });
  expect(resp.ok()).toBeTruthy();
  await page.goto(BASE);
}

test('multi user flow with job creation and GPS check-in', async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ 
    permissions: ['geolocation'],
    geolocation: { latitude: 51.5074, longitude: -0.1278 } // London
  });
  const ctxB = await browser.newContext({ 
    permissions: ['geolocation'],
    geolocation: { latitude: 51.4545, longitude: -2.5879 } // Bristol
  });

  const driverA = await ctxA.newPage();
  const driverB = await ctxB.newPage();

  await loginAs(driverA, 'driver-A', 'a@drivenet.local', 'Driver Alpha');
  await loginAs(driverB, 'driver-B', 'b@drivenet.local', 'Driver Beta');

  // Driver A creates a job
  await driverA.getByTestId('button-nav-schedule').click();
  await driverA.getByTestId('button-add-job').click();
  await driverA.getByTestId('input-from-location').fill('London Bridge');
  await driverA.getByTestId('input-to-location').fill('Birmingham');
  await driverA.getByTestId('button-submit-job').click();
  
  // Wait for job to be created
  await expect(driverA.getByText(/job added/i)).toBeVisible({ timeout: 5000 });
  
  // Driver A checks in
  const checkInBtn = driverA.locator('[data-testid^="button-check-in-"]').first();
  await checkInBtn.click();
  
  // Verify status changed to In Progress
  await expect(driverA.getByText('In Progress')).toBeVisible({ timeout: 5000 });
  
  // Driver B creates a job
  await driverB.getByTestId('button-nav-schedule').click();
  await driverB.getByTestId('button-add-job').click();
  await driverB.getByTestId('input-from-location').fill('Bristol Temple Meads');
  await driverB.getByTestId('input-to-location').fill('Cardiff');
  await driverB.getByTestId('button-submit-job').click();
  
  await expect(driverB.getByText(/job added/i)).toBeVisible({ timeout: 5000 });

  // Both drivers should see map markers for checked-in drivers
  await driverA.getByTestId('button-nav-find').click();
  await driverA.getByTestId('button-view-map').click();
  await expect(driverA.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 });

  await driverB.getByTestId('button-nav-find').click();
  await driverB.getByTestId('button-view-map').click();
  await expect(driverB.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 });

  await browser.close();
});
