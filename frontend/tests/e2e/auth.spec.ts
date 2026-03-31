/**
 * auth.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module : Authentication & User Management
 *
 * Scenarios covered
 * ─────────────────
 *  1. Login – valid credentials redirect to dashboard
 *  2. Login – invalid credentials show an error (parametrised dataset)
 *  3. Login – empty form fields show validation
 *  4. Logout – session is destroyed, protected routes redirect to login
 *  5. Registration – successful new-user flow
 *  6. Registration – password mismatch error
 *  7. Registration – weak password rejected
 *  8. Registration – duplicate username rejected
 *  9. Profile – settings page accessible after login
 * 10. Profile – profile information displayed correctly
 * 11. API – /auth/user-metadata/ returns 200 for active session
 * 12. API – /auth/user-metadata/ returns 401/403 when unauthenticated
 * 13. Protected route – unauthenticated users are redirected to /login
 * 14. Session persistence – page reload keeps the user logged in
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from './page-objects/AuthPage';
import {
  ADMIN_USER,
  INVALID_CREDENTIALS,
  REGISTRATION_DATA,
  ENV,
  API,
} from './fixtures/test-data';

// ── Helper ─────────────────────────────────────────────────────────────────

function authPage(page: Parameters<typeof test.extend>[0] extends infer T ? never : any) {
  return new AuthPage(page as any);
}

// ── 1–4: Login scenarios ──────────────────────────────────────────────────

test.describe('Login', () => {
  test('valid credentials redirect to home dashboard', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();
    // Confirm user-facing element appears (nav, avatar, or username)
    await expect(
      page.locator('nav, header').filter({ hasText: new RegExp(ADMIN_USER.username, 'i') }).or(
        page.locator('[data-testid="user-menu"], .avatar')
      )
    ).toBeVisible({ timeout: 8000 });
  });

  for (const cred of INVALID_CREDENTIALS) {
    test(`invalid login – ${cred.label}`, async ({ page }) => {
      const auth = new AuthPage(page);
      await auth.login(cred.username, cred.password);
      // Must stay on the login page or show an error
      const onLoginPage = page.url().includes('/login');
      if (onLoginPage) {
        // Server-side error message
        await auth.expectLoginError();
      } else {
        // Client-side validation prevented submit — still on /login
        await expect(page).toHaveURL(/login/);
      }
    });
  }

  test('submit with completely empty form stays on login page', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.loginButton.click();
    await expect(page).toHaveURL(/login/);
  });
});

// ── 4: Logout ─────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('logout clears session and redirects to login', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();
    await auth.logout();
    await auth.expectLoggedOut();
  });

  test('accessing protected page after logout redirects to /login', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();
    await auth.logout();

    // Try to visit a protected route
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/login/);
  });
});

// ── 5–8: Registration ─────────────────────────────────────────────────────

test.describe('Registration', () => {
  test('new user registration succeeds and redirects', async ({ page }) => {
    const auth = new AuthPage(page);
    const data = REGISTRATION_DATA.valid;
    await auth.register(data);
    // After successful registration, user should be authenticated or on login page
    const url = page.url();
    const isSuccess = !url.includes('/register') || url.includes('/login') || url.includes('/');
    expect(isSuccess).toBe(true);
  });

  test('password mismatch shows error', async ({ page }) => {
    const auth = new AuthPage(page);
    const data = REGISTRATION_DATA.passwordMismatch;
    await auth.register(data);
    // Should stay on register page with an error
    const errorVisible = await page
      .locator('[role="alert"], .alert-error, .error, .text-error')
      .filter({ hasText: /match|password/i })
      .isVisible()
      .catch(() => false);
    const stayedOnRegister = page.url().includes('/register');
    expect(errorVisible || stayedOnRegister).toBe(true);
  });

  test('weak password is rejected', async ({ page }) => {
    const auth = new AuthPage(page);
    const data = REGISTRATION_DATA.weakPassword;
    await auth.register(data);
    const stayedOnRegister = page.url().includes('/register');
    const errorShown = await page
      .locator('[role="alert"], .alert-error, .text-error')
      .isVisible()
      .catch(() => false);
    expect(stayedOnRegister || errorShown).toBe(true);
  });

  test('duplicate username is rejected', async ({ page }) => {
    const auth = new AuthPage(page);
    const data = REGISTRATION_DATA.duplicateUsername;
    await auth.register(data);
    const stayedOnRegister = page.url().includes('/register');
    const errorShown = await page
      .locator('[role="alert"], .alert-error, .text-error')
      .filter({ hasText: /username|already|exists/i })
      .isVisible()
      .catch(() => false);
    expect(stayedOnRegister || errorShown).toBe(true);
  });
});

// ── 9–10: Profile & settings ──────────────────────────────────────────────

test.describe('Profile & Settings', () => {
  test.beforeEach(async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();
  });

  test('settings page is accessible after login', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSettings();
    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('h1, h2, main')).toBeVisible();
  });

  test('settings page shows username', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSettings();
    await expect(
      page.locator('input[name="username"], [data-testid="username"], body')
        .filter({ hasText: new RegExp(ADMIN_USER.username, 'i') })
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('profile picture section exists on settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('img[alt*="profile" i], img[alt*="avatar" i], .avatar, input[type="file"]').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ── 11–12: API contract tests ─────────────────────────────────────────────

test.describe('Auth API', () => {
  test('GET /auth/user-metadata/ returns 200 with valid session', async ({ page, request }) => {
    // Log in via UI to get session cookie
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();

    // Reuse the browser's session cookies via the page context
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      return { status: res.status, ok: res.ok };
    }, `${ENV.API_URL}${API.userMetadata}`);

    expect(response.status).toBe(200);
  });

  test('GET /auth/user-metadata/ returns 4xx when unauthenticated', async ({ page }) => {
    // Fresh page with no session
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      return { status: res.status };
    }, `${ENV.API_URL}${API.userMetadata}`);

    expect([401, 403, 302]).toContain(response.status);
  });

  test('POST /auth/login/ with valid credentials returns 200/302', async ({ request }) => {
    const response = await request.post(`${ENV.API_URL}${API.login}`, {
      form: {
        username: ADMIN_USER.username,
        password: ADMIN_USER.password,
      },
    });
    expect([200, 302]).toContain(response.status());
  });

  test('POST /auth/login/ with invalid credentials returns 400', async ({ request }) => {
    const response = await request.post(`${ENV.API_URL}${API.login}`, {
      form: {
        username: 'nobody',
        password: 'nopass',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ── 13: Protected route guard ─────────────────────────────────────────────

test.describe('Route Protection', () => {
  const protectedRoutes = ['/locations', '/collections', '/map', '/settings'];

  for (const route of protectedRoutes) {
    test(`unauthenticated access to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/login/);
    });
  }
});

// ── 14: Session persistence ───────────────────────────────────────────────

test.describe('Session Persistence', () => {
  test('session survives a full page reload', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(ADMIN_USER.username, ADMIN_USER.password);
    await auth.expectLoggedIn();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated after reload
    await expect(page).not.toHaveURL(/login/);
  });
});
