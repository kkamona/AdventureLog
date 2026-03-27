import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // qa/ is now a direct child of frontend/, so paths are relative (no ../)
  testDir: './test-cases/e2e',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: './reports/playwright-report', open: 'never' }],
    ['junit', { outputFile: './reports/playwright-results.xml' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8015',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  outputDir: './reports/test-results',

  timeout: 60000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
