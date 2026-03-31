/**
 * collections.spec.ts  – AdventureLog Collections List Page Tests
 *
 * Route:   /collections
 * Server:  requires auth; fetches /api/collections/ (paginated) plus
 *          /shared/, /archived/, /invites/ in parallel.
 *          Query params: order_by, order_direction, status, page
 *          Action:  restoreData (import collection from JSON file)
 *
 * Tests:
 *   COL-01  Unauthenticated user redirected to /login
 *   COL-02  Authenticated user reaches /collections
 *   COL-03  Page has a non-empty, non-error <title>
 *   COL-04  Page loads without critical JS console errors
 *   COL-05  Default URL (no query params) loads successfully
 *   COL-06  order_by=name query param accepted without error
 *   COL-07  order_direction=asc query param accepted without error
 *   COL-08  page=1 query param accepted without error
 *   COL-09  page=2 returns a non-500 response
 *   COL-10  A newly created collection appears in the list
 *   COL-11  Collection list cards link to the detail page (/collections/<id>)
 *   COL-12  Shared collections section is rendered (or gracefully absent)
 *   COL-13  Archived collections section is rendered (or gracefully absent)
 *   COL-14  restoreData action rejects submission with no file selected
 */

import { test, expect } from '@playwright/test';
import {
  ADMIN_USER,
  ROUTES,
  loginAs,
  expectUnauthenticated,
  apiLogin,
  createTestCollection,
  deleteTestCollection
} from './fixtures/helpers';

// ── Shared state ──────────────────────────────────────────────────────────────

let sessionId: string;
let testCollectionId: string;
let testCollectionName: string;

test.beforeAll(async ({ request }) => {
  sessionId = await apiLogin(request);
  const col = await createTestCollection(request, sessionId, {
    name: `PW List Col ${Date.now()}`
  });
  testCollectionId = col.id;
  testCollectionName = col.name;
});

test.afterAll(async ({ request }) => {
  if (testCollectionId) {
    await deleteTestCollection(request, sessionId, testCollectionId);
  }
});

test.beforeEach(async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
});

// ─────────────────────────────────────────────────────────────────────────────

test('COL-01: Unauthenticated user visiting /collections is redirected to /login', async ({
  page,
  context
}) => {
  await context.clearCookies();
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');
  await expectUnauthenticated(page);
});

test('COL-02: Authenticated user can reach /collections', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/collections/);
});

test('COL-03: Collections page has a non-empty, non-error <title>', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
  expect(title).not.toMatch(/error|exception/i);
});

test('COL-04: Collections page loads without critical JS console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(ROUTES.collections);
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

test('COL-05: /collections loads with default params (no query string)', async ({ page }) => {
  const response = await page.goto('/collections');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/collections/);
});

test('COL-06: order_by=name query param is accepted without error', async ({ page }) => {
  const response = await page.goto('/collections?order_by=name&order_direction=asc');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('COL-07: order_direction=asc query param is accepted without error', async ({ page }) => {
  const response = await page.goto('/collections?order_by=updated_at&order_direction=asc');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('COL-08: ?page=1 query param accepted without error', async ({ page }) => {
  const response = await page.goto('/collections?page=1');
  expect(response?.status()).toBeLessThan(500);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
});

test('COL-09: ?page=2 returns a non-500 response', async ({ page }) => {
  const response = await page.goto('/collections?page=2');
  expect(response?.status()).toBeLessThan(500);
  // Page 2 may be empty – just confirm it didn't crash
});

test('COL-10: A newly created collection is visible in the list', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(testCollectionName)).toBeVisible({ timeout: 10_000 });
});

test('COL-11: Collection cards contain a link to /collections/<id>', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  const detailLink = page.locator('a[href^="/collections/"]').first();

  if (await detailLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const href = await detailLink.getAttribute('href');
    expect(href).toMatch(/^\/collections\/\S+/);
  } else {
    // Empty state is acceptable – ensure the page itself rendered
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);
  }
});

test('COL-12: Shared collections section is rendered or gracefully absent', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  // The section for shared collections may have a heading or simply be missing if empty
  // Either outcome is acceptable – the test just confirms no crash
  const body = await page.locator('body').innerText();
  expect(body.trim().length).toBeGreaterThan(0);
  await expect(page).not.toHaveURL(/\/login/);
});

test('COL-13: Archived collections section is rendered or gracefully absent', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  const body = await page.locator('body').innerText();
  expect(body.trim().length).toBeGreaterThan(0);
  await expect(page).not.toHaveURL(/\/login/);
});

test('COL-14: restoreData action rejects form submission with no file', async ({ page }) => {
  await page.goto(ROUTES.collections);
  await page.waitForLoadState('networkidle');

  // Find a file input associated with the restoreData / import action
  const fileInput = page.locator('input[type="file"]').first();

  if (!(await fileInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true, 'No file import form visible on the collections list page');
    return;
  }

  const form = page.locator('form').filter({ has: fileInput }).first();
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1_500);

  // Should stay on /collections and show an error
  await expect(page).toHaveURL(/\/collections/);

  const error = page
    .getByRole('alert')
    .or(page.locator('.error, .alert-error, [data-testid="error"], .text-error'))
    .first();
  await expect(error).toBeVisible({ timeout: 8_000 });
});
