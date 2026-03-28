/**
 * auth.spec.ts  – AdventureLog Authentication Tests
 *
 * ⚠️  CRITICAL MODULE  (QG-2 risk score 20)
 * The pipeline enforces ZERO failures in this file.
 * Any failure here blocks the PR from merging to main.
 *
 * Tests:
 *   AUTH-01  Login page renders the username, password fields and submit button
 *   AUTH-02  Valid admin credentials redirect to the dashboard
 *   AUTH-03  Invalid credentials stay on /login and show an error
 *   AUTH-04  Submitting with an empty username is rejected
 *   AUTH-05  Submitting with an empty password is rejected
 *   AUTH-06  Authenticated user visiting /login is redirected home
 *   AUTH-07  Unauthenticated user visiting / is redirected to /login
 *   AUTH-08  Logout clears the session and blocks re-entry to home
 *   AUTH-09  Registration page renders required fields (or disabled message)
 *   AUTH-10  Mismatched passwords on registration show an error
 *   AUTH-11  MFA input field is NOT shown on the initial login page load
 *   AUTH-12  Login page renders without a 5xx error regardless of provider list
 *   AUTH-13  Mixed-case username is accepted (server normalises to lowercase)
 *   AUTH-14  Authenticated user visiting /register is redirected home
 */

import { test, expect, type Page } from '@playwright/test';
import {
  ADMIN_USER,
  ROUTES,
  loginAs,
  expectAuthenticated,
  expectUnauthenticated
} from './fixtures/helpers';

// ── Local helpers ─────────────────────────────────────────────────────────────

async function gotoLogin(page: Page) {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');
}

async function gotoRegister(page: Page) {
  await page.goto(ROUTES.register);
  await page.waitForLoadState('networkidle');
}

const errorLocator = (page: Page) =>
  page
    .getByRole('alert')
    .or(page.locator('.error, .alert-error, [data-testid="error"], .text-error'))
    .first();

// ─────────────────────────────────────────────────────────────────────────────

test('AUTH-01: Login page has username, password fields and a submit button', async ({ page }) => {
  await gotoLogin(page);

  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]').first()).toBeVisible();
});

test('AUTH-02: Valid admin credentials redirect to the dashboard', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await expectAuthenticated(page);
});

test('AUTH-03: Invalid credentials stay on /login and show an error', async ({ page }) => {
  await gotoLogin(page);

  await page.locator('input[name="username"]').fill('nonexistent_user_xyz_9999');
  await page.locator('input[name="password"]').fill('wrongpassword');
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(errorLocator(page)).toBeVisible({ timeout: 8_000 });
});

test('AUTH-04: Submitting with an empty username is rejected', async ({ page }) => {
  await gotoLogin(page);

  await page.locator('input[name="password"]').fill(ADMIN_USER.password);
  await page.locator('button[type="submit"]').first().click();

  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/login/);
});

test('AUTH-05: Submitting with an empty password is rejected', async ({ page }) => {
  await gotoLogin(page);

  await page.locator('input[name="username"]').fill(ADMIN_USER.username);
  await page.locator('button[type="submit"]').first().click();

  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/login/);
});

test('AUTH-06: Authenticated user visiting /login is redirected home', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await expectAuthenticated(page);

  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
});

test('AUTH-07: Unauthenticated user visiting / is redirected to /login', async ({
  page,
  context
}) => {
  await context.clearCookies();
  await page.goto(ROUTES.home);
  await page.waitForLoadState('networkidle');

  await expectUnauthenticated(page);
});

test('AUTH-08: Logout clears the session and redirects to /login', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await expectAuthenticated(page);

  // Try common logout UI patterns
  const logoutBtn = page
    .getByRole('link', { name: /log.?out|sign.?out/i })
    .or(page.getByRole('button', { name: /log.?out|sign.?out/i }))
    .or(page.locator('[data-testid="logout"]'));

  if (await logoutBtn.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
    await logoutBtn.first().click();
  } else {
    // Some apps put logout behind an avatar/dropdown
    const avatar = page
      .locator('[data-testid="avatar"], .avatar, .dropdown-toggle, [aria-label="account menu"]')
      .first();
    if (await avatar.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await avatar.click();
      await logoutBtn.first().click();
    } else {
      await page.goto('/logout');
    }
  }

  await page.waitForLoadState('networkidle');
  await page.goto(ROUTES.home);
  await page.waitForLoadState('networkidle');
  await expectUnauthenticated(page);
});

test('AUTH-09: Registration page renders fields or a disabled message', async ({ page }) => {
  await gotoRegister(page);

  const formVisible = await page
    .locator('form')
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!formVisible) {
    // Acceptable when DISABLE_REGISTRATION=True
    const disabledMsg = page
      .locator('[data-testid="registration-disabled"]')
      .or(page.getByText(/registration.*disabled/i))
      .first();
    await expect(disabledMsg).toBeVisible({ timeout: 5_000 });
    return;
  }

  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password1"]')).toBeVisible();
  await expect(page.locator('input[name="password2"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]').first()).toBeVisible();
});

test('AUTH-10: Mismatched passwords on registration show an error', async ({ page }) => {
  await gotoRegister(page);

  if (!(await page.locator('input[name="password1"]').isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'Registration disabled');
    return;
  }

  await page.locator('input[name="username"]').fill(`testuser_${Date.now()}`);
  await page.locator('input[name="email"]').fill(`test_${Date.now()}@example.com`);
  await page.locator('input[name="password1"]').fill('Password123!');
  await page.locator('input[name="password2"]').fill('DifferentPassword456!');
  await page.locator('button[type="submit"]').first().click();

  await page.waitForTimeout(2_000);
  await expect(page).toHaveURL(/\/register/);
  await expect(errorLocator(page)).toBeVisible({ timeout: 8_000 });
});

test('AUTH-11: MFA input field is hidden on initial login page load', async ({ page }) => {
  await gotoLogin(page);
  await expect(page.locator('input[name="totp"]')).not.toBeVisible();
});

test('AUTH-12: Login page renders without a 5xx error', async ({ page }) => {
  const response = await page.goto(ROUTES.login);
  expect(response?.status()).toBeLessThan(500);

  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
});

test('AUTH-13: Mixed-case username is accepted (server normalises to lowercase)', async ({
  page
}) => {
  await loginAs(page, ADMIN_USER.username.toUpperCase(), ADMIN_USER.password);
  await expectAuthenticated(page);
});

test('AUTH-14: Authenticated user visiting /register is redirected home', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await expectAuthenticated(page);

  await page.goto(ROUTES.register);
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/\/register/, { timeout: 10_000 });
});
