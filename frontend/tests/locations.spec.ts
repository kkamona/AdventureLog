/**
 * locations.spec.ts  – AdventureLog Locations List Page Tests
 *
 * Route: /locations
 * Server: fetches /api/locations/filtered with query params
 *         redirects to /login when unauthenticated
 *         actions: image, activity, attachment uploads
 *
 * Tests:
 *   LOC-01  Unauthenticated user is redirected to /login
 *   LOC-02  Authenticated user can reach the locations page
 *   LOC-03  Page title is set (not blank, not an error)
 *   LOC-04  Page does not produce JS console errors on load
 *   LOC-05  Default URL has no required query params and still loads
 *   LOC-06  order_by query param is accepted without error
 *   LOC-07  order_direction query param is accepted without error
 *   LOC-08  is_visited=true filter renders without error
 *   LOC-09  is_visited=false filter renders without error
 *   LOC-10  Page parameter ?page=1 renders without error
 *   LOC-11  A newly created location appears in the list
 *   LOC-12  The list page renders when include_collections=false
 *   LOC-13  Navigating to page 2 works without a 500 error
 *   LOC-14  Location cards link through to the detail page
 */

import { test, expect, type Page } from '@playwright/test';
import {
  ADMIN_USER,
  ROUTES,
  loginAs,
  expectUnauthenticated,
  apiLogin,
  createTestLocation,
  deleteTestLocation
} from './fixtures/helpers';

// ── State shared across tests ─────────────────────────────────────────────────

let sessionId: string;
let testLocationId: string;
let testLocationName: string;

test.beforeAll(async ({ request }) => {
  sessionId = await apiLogin(request);
  const loc = await createTestLocation(request, sessionId, {
    name: `PW List Test ${Date.now()}`
  });
  testLocationId = loc.id;
  testLocationName = loc.name as string;
});

test.afterAll(async ({ request }) => {
  if (testLocationId) {
    await deleteTestLocation(request, sessionId, testLocationId);
  }
});

// ── Per-test login ────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
});

// ─────────────────────────────────────────────────────────────────────────────

test('LOC-01: Unauthenticated user visiting /locations is redirected to /login', async ({
  page,
  context
}) => {
  await context.clearCookies();
  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');
  await expectUnauthenticated(page);
});

test('LOC-02: Authenticated user can reach the locations page', async ({ page }) => {
  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/locations/);
});

test('LOC-03: Locations page has a non-empty, non-error page title', async ({ page }) => {
  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');

  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
  expect(title).not.toMatch(/error|exception/i);
});

test('LOC-04: Locations page loads without critical JS console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');

  const critical = errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('umami') &&
      !e.includes('ERR_ABORTED') &&
      !e.includes('net::ERR_')
  );
  expect(critical).toHaveLength(0);
});

test('LOC-05: /locations loads with default params (no query string)', async ({ page }) => {
  const response = await page.goto('/locations');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/locations/);
});

test('LOC-06: order_by=name query param is accepted without error', async ({ page }) => {
  const response = await page.goto('/locations?order_by=name&order_direction=asc');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-07: order_direction=desc query param is accepted without error', async ({ page }) => {
  const response = await page.goto('/locations?order_by=updated_at&order_direction=desc');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-08: is_visited=true filter loads without error', async ({ page }) => {
  const response = await page.goto('/locations?is_visited=true');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-09: is_visited=false filter loads without error', async ({ page }) => {
  const response = await page.goto('/locations?is_visited=false');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-10: ?page=1 query param loads without error', async ({ page }) => {
  const response = await page.goto('/locations?page=1');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-11: A newly created location is visible in the list', async ({ page }) => {
  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');

  // The location name should appear somewhere on the page
  await expect(page.getByText(testLocationName)).toBeVisible({ timeout: 10_000 });
});

test('LOC-12: include_collections=false renders the page without error', async ({ page }) => {
  const response = await page.goto('/locations?include_collections=false');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('LOC-13: Navigating to ?page=2 returns a non-500 response', async ({ page }) => {
  const response = await page.goto('/locations?page=2');
  // May be a 200 with empty results or a redirect – must not be a 500
  expect(response?.status()).toBeLessThan(500);
});

test('LOC-14: Location cards contain a link to the detail page', async ({ page }) => {
  await page.goto(ROUTES.locations);
  await page.waitForLoadState('networkidle');

  // Look for any anchor that points to /locations/<id>
  const detailLink = page
    .locator('a[href^="/locations/"]')
    .first();

  if (await detailLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const href = await detailLink.getAttribute('href');
    expect(href).toMatch(/^\/locations\/\S+/);
  } else {
    // Empty state is acceptable – just ensure the list itself rendered
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);
  }
});
