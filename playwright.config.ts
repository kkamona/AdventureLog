import { defineConfig, devices } from '@playwright/test';

/**
 * AdventureLog – Playwright E2E Configuration
 * Test files:  qa/test-cases/e2e/*.spec.ts
 * Frontend:    http://localhost:8015  (SvelteKit / web container)
 * Backend API: http://localhost:8016  (Django / server container)
 *
 * CI behaviour
 *  - forbidOnly  : ensures test.only() cannot be committed
 *  - retries     : 2 retries in CI so flakiness is distinguished from real failure
 *  - workers     : 1 in CI (single Docker stack, no parallelism needed)
 *  - Hard-block  : a non-zero exit code from Playwright fails the e2e-tests job
 */
export default defineConfig({
  testDir: './qa/test-cases/e2e',

  /* Run all tests in a file sequentially (login state must be set up first) */
  fullyParallel: false,

  /* Fail the run immediately if test.only() is committed */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests twice in CI to rule out flakiness */
  retries: process.env.CI ? 2 : 0,

  /* Single worker in CI – the Docker stack is not replicated */
  workers: process.env.CI ? 1 : undefined,

  /* ---------- Reporters ---------- */
  reporter: [
    /* HTML report – opened manually after a local run; never in CI */
    ['html', { outputFolder: 'qa/reports/playwright-report', open: 'never' }],

    /* JUnit XML – consumed by GitHub Actions upload-artifact step */
    ['junit', { outputFile: 'qa/reports/playwright-results.xml' }],

    /* Console list – always visible in CI logs */
    ['list'],
  ],

  /* ---------- Shared settings for all projects ---------- */
  use: {
    /* SvelteKit frontend base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8015',

    /* Capture full trace on the first retry so failures are diagnosable */
    trace: 'on-first-retry',

    /* Screenshot on every failure – saved to qa/reports/test-results/ */
    screenshot: 'only-on-failure',

    /* Record video on first retry – useful for intermittent failures */
    video: 'on-first-retry',

    /* Global navigation timeout */
    navigationTimeout: 30_000,

    /* Global action timeout */
    actionTimeout: 15_000,
  },

  /* ---------- Output directory for artifacts ---------- */
  outputDir: 'qa/reports/test-results',

  /* ---------- Global test timeout (ms) ---------- */
  timeout: 60_000,

  /* ---------- Projects ---------- */
  projects: [
    /* Chromium only – matches the CI browser installed via playwright install --with-deps */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* ---------- Global setup / teardown (optional – add paths when ready) ---------- */
  // globalSetup:  './qa/test-cases/e2e/global-setup.ts',
  // globalTeardown: './qa/test-cases/e2e/global-teardown.ts',
});
