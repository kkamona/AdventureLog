import { type Page, expect, type APIRequestContext } from '@playwright/test';

// ── Credentials ───────────────────────────────────────────────────────────────
export const ADMIN_USER = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'Admin1234!'
};

// ── Routes ────────────────────────────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  settings: '/settings',
  locations: '/locations',
  collections: '/collections'
} as const;

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8016';

// ─────────────────────────────────────────────────────────────────────────────
// Browser helpers
// ─────────────────────────────────────────────────────────────────────────────

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

export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${BACKEND_URL}/csrf/`);
  return ((await res.json()) as { csrfToken: string }).csrfToken;
}

export async function apiLogin(
  request: APIRequestContext,
  username = ADMIN_USER.username,
  password = ADMIN_USER.password
): Promise<string> {
  const csrf = await getCsrfToken(request);
  const res = await request.post(`${BACKEND_URL}/auth/browser/v1/auth/login`, {
    data: { username, password },
    headers: {
      'X-CSRFToken': csrf,
      'Content-Type': 'application/json',
      Cookie: `csrftoken=${csrf}`,
      Referer: BACKEND_URL
    }
  });
  if (res.status() !== 200 && res.status() !== 401) {
    throw new Error(`API login failed: ${res.status()}`);
  }
  const setCookie = res.headers()['set-cookie'] || '';
  const match = setCookie.match(/sessionid=([^;]+)/);
  if (!match) throw new Error('No sessionid cookie after login');
  return match[1];
}

// ── Location helpers ──────────────────────────────────────────────────────────

export async function createTestLocation(
  request: APIRequestContext,
  sessionId: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; name: string; [key: string]: unknown }> {
  const csrf = await getCsrfToken(request);
  const res = await request.post(`${BACKEND_URL}/api/locations/`, {
    data: { name: `PW Loc ${Date.now()}`, is_public: true, is_visited: false, ...overrides },
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'X-CSRFToken': csrf,
      Referer: BACKEND_URL
    }
  });
  if (!res.ok()) throw new Error(`Create location failed: ${res.status()}`);
  return res.json();
}

export async function deleteTestLocation(
  request: APIRequestContext,
  sessionId: string,
  id: string
): Promise<void> {
  const csrf = await getCsrfToken(request);
  await request.delete(`${BACKEND_URL}/api/locations/${id}/`, {
    headers: {
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'X-CSRFToken': csrf,
      Referer: BACKEND_URL
    }
  });
}

// ── Collection helpers ────────────────────────────────────────────────────────

export interface TestCollection {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Create a minimal test collection via the API.
 * Pass `start_date` / `end_date` to create an itinerary-style collection.
 */
export async function createTestCollection(
  request: APIRequestContext,
  sessionId: string,
  overrides: Record<string, unknown> = {}
): Promise<TestCollection> {
  const csrf = await getCsrfToken(request);
  const payload = {
    name: `PW Collection ${Date.now()}`,
    is_public: true,
    description: 'Created by Playwright tests.',
    ...overrides
  };
  const res = await request.post(`${BACKEND_URL}/api/collections/`, {
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
    throw new Error(`Create collection failed (${res.status()}): ${body}`);
  }
  return res.json();
}

/**
 * Delete a collection by ID via the API.
 */
export async function deleteTestCollection(
  request: APIRequestContext,
  sessionId: string,
  id: string
): Promise<void> {
  const csrf = await getCsrfToken(request);
  await request.delete(`${BACKEND_URL}/api/collections/${id}/`, {
    headers: {
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'X-CSRFToken': csrf,
      Referer: BACKEND_URL
    }
  });
}
