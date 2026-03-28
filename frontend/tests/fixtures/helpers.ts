import { type Page, expect } from '@playwright/test';

// ── Credentials – mirror the CI .env values ──────────────────────────────────
export const ADMIN_USER = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'Admin1234!'
};

// ── Application routes ────────────────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  settings: '/settings'
} as const;

// ── Page helpers ──────────────────────────────────────────────────────────────

/**
 * Navigate to /login, fill the form and submit.
 * Handles the optional TOTP step automatically when `totp` is supplied.
 */
export async function loginAs(
  page: Page,
  username: string,
  password: string,
  totp?: string
): Promise<void> {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('networkidle');

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').first().click();

  // If MFA is active and a code was supplied, fill it after the first POST
  if (totp) {
    const totpField = page.locator('input[name="totp"]');
    if (await totpField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await totpField.fill(totp);
      await page.locator('button[type="submit"]').first().click();
    }
  }
}

/**
 * Assert the user is authenticated (not on the login page).
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/**
 * Assert the user has been redirected to login.
 */
export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
}

/**
 * Wait for an alert / toast message containing the given regex.
 */
export async function expectAlert(page: Page, pattern: RegExp): Promise<void> {
  const alert = page
    .getByRole('alert')
    .or(page.locator('.alert, .toast, [data-testid="alert"], .text-error'))
    .first();
  await expect(alert).toContainText(pattern, { timeout: 8_000 });
}
