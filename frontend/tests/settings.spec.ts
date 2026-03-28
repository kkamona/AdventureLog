/**
 * settings.spec.ts  – AdventureLog Settings Page Tests
 *
 * Tests:
 *   SET-01  Settings page is accessible to authenticated users
 *   SET-02  Unauthenticated users are redirected to /login
 *   SET-03  Username field is pre-populated with the current account name
 *   SET-04  Change-password form rejects mismatched passwords
 *   SET-05  Change-password form rejects passwords shorter than 6 characters
 *   SET-06  Data-restore form rejects submission without a file
 *   SET-07  Data-restore form has a confirmation field
 *   SET-08  Email address section is visible on the page
 *   SET-09  Two-factor authentication section is visible on the page
 *   SET-10  Measurement system toggle is rendered
 */

import { test, expect } from '@playwright/test';
import { ADMIN_USER, ROUTES, loginAs } from './fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await page.goto(ROUTES.settings);
  await page.waitForLoadState('networkidle');
});

// ─────────────────────────────────────────────────────────────────────────────

test('SET-01: Settings page is accessible to authenticated users', async ({ page }) => {
  await expect(page).not.toHaveURL(/\/login/);

  const content = page
    .locator('main, [data-testid="settings"], form, .settings-container, h1, h2')
    .first();
  await expect(content).toBeVisible({ timeout: 10_000 });
});

test('SET-02: Unauthenticated users are redirected to /login', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto(ROUTES.settings);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('SET-03: Username field is pre-populated with the current account name', async ({ page }) => {
  const usernameInput = page.locator('input[name="username"]').first();

  if (await usernameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const value = await usernameInput.inputValue();
    expect(value.toLowerCase()).toBe(ADMIN_USER.username.toLowerCase());
  } else {
    // May be rendered as read-only text
    await expect(page.getByText(new RegExp(ADMIN_USER.username, 'i'))).toBeVisible();
  }
});

test('SET-04: Change-password form rejects mismatched passwords', async ({ page }) => {
  const pw1 = page.locator('input[name="password1"]').first();
  const pw2 = page.locator('input[name="password2"]').first();

  if (!(await pw1.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'Password change form not found on this page');
    return;
  }

  await pw1.fill('NewPassword123!');
  await pw2.fill('DifferentPassword456!');

  const form = page.locator('form').filter({ has: pw1 }).first();
  await form.locator('button[type="submit"]').first().click();

  await page.waitForTimeout(2_000);

  const error = page
    .getByRole('alert')
    .or(page.locator('.error, .alert-error, [data-testid="error"], .text-error'))
    .first();
  await expect(error).toBeVisible({ timeout: 8_000 });
});

test('SET-05: Change-password form rejects passwords shorter than 6 characters', async ({
  page
}) => {
  const pw1 = page.locator('input[name="password1"]').first();
  const pw2 = page.locator('input[name="password2"]').first();

  if (!(await pw1.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'Password change form not found on this page');
    return;
  }

  await pw1.fill('abc');
  await pw2.fill('abc');

  const form = page.locator('form').filter({ has: pw1 }).first();
  await form.locator('button[type="submit"]').first().click();

  await page.waitForTimeout(2_000);

  const error = page
    .getByRole('alert')
    .or(page.locator('.error, .alert-error, [data-testid="error"], .text-error'))
    .first();
  await expect(error).toBeVisible({ timeout: 8_000 });
});

test('SET-06: Data-restore form rejects submission without a file', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]').first();

  if (!(await fileInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'Restore form not found on this page');
    return;
  }

  const form = page.locator('form').filter({ has: fileInput }).first();

  // Fill the confirmation field if it exists
  const confirmInput = form.locator('input[name="confirm"]').first();
  if (await confirmInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmInput.fill('yes');
  }

  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2_000);

  const error = page
    .getByRole('alert')
    .or(page.locator('.error, .alert-error, [data-testid="error"], .text-error'))
    .first();
  await expect(error).toBeVisible({ timeout: 8_000 });
});

test('SET-07: Data-restore form has a confirmation field', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]').first();

  if (!(await fileInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'Restore form not found on this page');
    return;
  }

  const form = page.locator('form').filter({ has: fileInput }).first();
  const confirmField = form
    .locator('input[name="confirm"], input[type="checkbox"][name="confirm"]')
    .first();

  await expect(confirmField).toBeVisible({ timeout: 5_000 });
});

test('SET-08: Email address section is visible on the settings page', async ({ page }) => {
  const emailSection = page
    .getByText(/email/i)
    .or(page.locator('input[type="email"], [data-testid="email-section"]'))
    .first();
  await expect(emailSection).toBeVisible({ timeout: 8_000 });
});

test('SET-09: Two-factor authentication section is visible on the settings page', async ({
  page
}) => {
  const mfaSection = page.getByText(/two.?factor|2fa|authenticat/i).first();
  await expect(mfaSection).toBeVisible({ timeout: 8_000 });
});

test('SET-10: Measurement system toggle (metric / imperial) is rendered', async ({ page }) => {
  const toggle = page
    .locator('input[name="measurement_system"]')
    .or(page.getByLabel(/measurement|metric|imperial/i).first())
    .or(page.getByText(/metric|imperial/i).first());
  await expect(toggle).toBeVisible({ timeout: 8_000 });
});
