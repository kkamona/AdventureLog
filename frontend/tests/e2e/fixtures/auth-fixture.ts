/**
 * auth-fixture.ts
 *
 * Provides a `loggedInPage` fixture that navigates to /login, authenticates
 * with admin credentials, and makes the authenticated page available to tests.
 *
 * Usage:
 *   import { test } from '../fixtures/auth-fixture';
 *   test('my test', async ({ loggedInPage }) => { ... });
 */

import { test as base, expect, type Page } from '@playwright/test';
import { ADMIN_USER } from './test-data';

type AuthFixtures = {
  loggedInPage: Page;
};

export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.locator('input[name="username"], input[id="username"]').fill(ADMIN_USER.username);
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill(ADMIN_USER.password);
    await page
      .locator('button[type="submit"]')
      .filter({ hasText: /log\s*in|sign\s*in/i })
      .click();

    await page.waitForLoadState('networkidle');

    // Confirm we are authenticated (not on login page)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    await use(page);
  },
});

export { expect };
