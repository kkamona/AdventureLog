import { defineConfig, devices } from '@playwright/test';

/**
 * AdventureLog Playwright Configuration
 *
 * Reports are written to frontend/reports/ to match the paths
 * expected by the upload-artifact steps in qa-pipeline.yml.
 *
 * Quality gates enforced externally by the pipeline:
 *   QG-1  ≥ 95 % overall pass rate
 *   QG-2  0 failures in auth.spec.ts
 *   QG-5  ≤ 10 min suite duration (soft)
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8015';

export default defineConfig({
  testDir: './tests',

  timeout: 30_000,

  expect: {
    timeout: 10_000
  },

  /* Block accidental .only() from landing on CI */
  forbidOnly: !!process.env.CI,

  /* One retry on CI to absorb transient flakiness without masking real bugs */
  retries: process.env.CI ? 1 : 0,

  /* 2 workers on CI; unlimited locally */
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: 'reports/playwright-report',
        open: 'never'
      }
    ],
    [
      'junit',
      {
        /* QG-1 and QG-2 are enforced by parsing this file in the pipeline */
        outputFile: 'reports/playwright-results.xml'
      }
    ]
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    navigationTimeout: 20_000,
    ignoreHTTPSErrors: true
  },

  /* Failure artifacts land in reports/test-results/ */
  outputDir: 'reports/test-results',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
