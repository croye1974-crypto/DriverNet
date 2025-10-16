import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // only run tests in your own folder
  timeout: 60000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173', // or 5000 if Express serves
    trace: 'on-first-retry',
  },
});
