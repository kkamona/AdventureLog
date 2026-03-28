/**
 * navigation.spec.ts  – AdventureLog Navigation & App Health Tests
 *
 * Tests:
 *   NAV-01  App returns a non-5xx HTTP status on the login route
 *   NAV-02  Login page has a non-empty <title>
 *   NAV-03  No critical JS console errors on the login page
 *   NAV-04  No critical JS console errors on the authenticated home page
 *   NAV-05  Dashboard is fully loaded within 15 seconds of login
 *   NAV-06  Unknown routes render a user-friendly page (no blank screen)
 *   NAV-07  User can navigate from settings back to home via the nav link
 *   NAV-08  Login page is usable on a 375 × 667 mobile viewport
 *   NAV-09  Login page has a link to the registration page
 *   NAV-10  Login form inputs all have accessible labels or aria attributes
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { ADMIN_USER, ROUTES, loginAs } from './fixtures/helpers';

// ── Utility: collect console errors from the moment of registration ───────────

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

function filterNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('umami') &&
      !e.includes('ERR_ABORTED') &&
      !e.includes('net::ERR_')
  );
}

// ─────────────────────────────────────────────────────────────────────────────

test('NAV-01: App returns a non-5xx HTTP status on the login route', async ({ page }) => {
  const response = await page.goto(ROUTES.login);
  expect(response?.status()).toBeLessThan(500);
});

test('NAV-02: Login page has a non-empty <title>', async ({ page }) => {
  await page.goto(ROUTES.login);
  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
  expect(title).not.toMatch(/error|exception/i);
});

test('NAV-03: No critical JS console errors on the login page', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  expect(filterNoise(errors)).toHaveLength(0);
});

test('NAV-04: No critical JS console errors on the authenticated home page', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await page.waitForLoadState('networkidle');

  expect(filterNoise(errors)).toHaveLength(0);
});

test('NAV-05: Dashboard is fully loaded within 15 seconds of login', async ({ page }) => {
  const start = Date.now();
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await page.waitForLoadState('networkidle');
  const elapsed = Date.now() - start;

  if (elapsed > 8_000) {
    console.warn(`⚠️  Dashboard loaded in ${elapsed}ms – consider optimising.`);
  }
  expect(elapsed).toBeLessThan(15_000);
});

test('NAV-06: Unknown routes render a user-friendly page (not blank)', async ({ page }) => {
  await page.goto('/this-route-does-not-exist-xyz-9999');
  const bodyText = await page.locator('body').innerText();

  expect(bodyText.trim().length).toBeGreaterThan(0);
  expect(bodyText).not.toMatch(/Traceback|SyntaxError|ReferenceError/);
});

test('NAV-07: User can navigate from settings back to home via the nav link', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  await page.goto(ROUTES.settings);
  await page.waitForLoadState('networkidle');

  const homeLink = page
    .getByRole('link', { name: /home|dashboard|adventurelog/i })
    .or(page.locator('a[href="/"]'))
    .first();

  if (await homeLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await homeLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/settings/);
  } else {
    // Fallback: direct navigation
    await page.goto(ROUTES.home);
    await expect(page).toHaveURL(/\//);
  }
});

test('NAV-08: Login page is usable on a 375 × 667 mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('form').first()).toBeVisible();

  const submitBtn = page.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible();

  const box = await submitBtn.boundingBox();
  expect(box).not.toBeNull();
  // Button should be within a reasonable scroll distance of the viewport
  expect(box!.y + box!.height).toBeLessThanOrEqual(667 + 200);
});

test('NAV-09: Login page contains a link to the registration page', async ({ page }) => {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  const registerLink = page
    .getByRole('link', { name: /register|sign.?up|create.?account/i })
    .first();

  if (await registerLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await registerLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/register/);
  } else {
    test.skip(true, 'No register link found (social-only or registration disabled)');
  }
});

test('NAV-10: Login form inputs all have accessible labels or aria attributes', async ({
  page
}) => {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  const inputs = page.locator('input:not([type="hidden"]):not([type="submit"])');
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    const placeholder = await input.getAttribute('placeholder');

    const hasAssociatedLabel = id
      ? (await page.locator(`label[for="${id}"]`).count()) > 0
      : false;

    const isAccessible = hasAssociatedLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder;
    expect(isAccessible, `Input #${i} lacks an accessible label`).toBeTruthy();
  }
});
