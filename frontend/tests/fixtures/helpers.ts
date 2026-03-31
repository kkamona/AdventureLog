import { type Page, expect, type APIRequestContext } from '@playwright/test';

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
  settings: '/settings',
  locations: '/locations'
} as const;

// ── Backend base (used by API helpers) ───────────────────────────────────────
export const BACKEND_URL =
  process.env.BACKEND_URL || 'http://localhost:8016';

// ─────────────────────────────────────────────────────────────────────────────
// Browser helpers
// ─────────────────────────────────────────────────────────────────────────────

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

  if (totp) {
    const totpField = page.locator('input[name="totp"]');
    if (await totpField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await totpField.fill(totp);
      await page.locator('button[type="submit"]').first().click();
    }
  }
}

/** Assert the user is authenticated (not on the login page). */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/** Assert the user has been redirected to login. */
export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers  (used in beforeAll / afterAll hooks via request context)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch a CSRF token from the backend. */
export async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${BACKEND_URL}/csrf/`);
  const json = await res.json();
  return json.csrfToken as string;
}

/** Log in via the API and return the sessionid cookie value. */
export async function apiLogin(
  request: APIRequestContext,
  username = ADMIN_USER.username,
  password = ADMIN_USER.password
): Promise<string> {
  const csrf = await getCsrfToken(request);

  const res = await request.post(
    `${BACKEND_URL}/auth/browser/v1/auth/login`,
    {
      data: { username, password },
      headers: {
        'X-CSRFToken': csrf,
        'Content-Type': 'application/json',
        Cookie: `csrftoken=${csrf}`,
        Referer: BACKEND_URL
      }
    }
  );

  // 200 = direct success, 401 = MFA step (session still valid for cleanup)
  if (res.status() !== 200 && res.status() !== 401) {
    throw new Error(`API login failed with status ${res.status()}`);
  }

  // Extract the sessionid from the Set-Cookie header
  const setCookie = res.headers()['set-cookie'] || '';
  const match = setCookie.match(/sessionid=([^;]+)/);
  if (!match) {
    throw new Error('No sessionid cookie after API login');
  }
  return match[1];
}

/**
 * Create a minimal test location via the API.
 * Returns the created location object (with .id).
 */
export async function createTestLocation(
  request: APIRequestContext,
  sessionId: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; name: string; [key: string]: unknown }> {
  const csrf = await getCsrfToken(request);

  const payload = {
    name: `Playwright Test Location ${Date.now()}`,
    is_public: true,
    is_visited: false,
    ...overrides
  };

  const res = await request.post(`${BACKEND_URL}/api/locations/`, {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'X-CSRFToken': csrf,
      Referer: BACKEND_URL
    }
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to create test location (${res.status()}): ${body}`);
  }

  return res.json();
}

/**
 * Delete a location by ID via the API.
 */
export async function deleteTestLocation(
  request: APIRequestContext,
  sessionId: string,
  locationId: string
): Promise<void> {
  const csrf = await getCsrfToken(request);

  await request.delete(`${BACKEND_URL}/api/locations/${locationId}/`, {
    headers: {
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'X-CSRFToken': csrf,
      Referer: BACKEND_URL
    }
  });
}
