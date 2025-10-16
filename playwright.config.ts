import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // only run tests in your own folder
  timeout: 60000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },
});
