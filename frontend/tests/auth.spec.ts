/**
 * auth.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module:     Authentication & User Management
 * Risk Score: CRITICAL (20) — highest priority per Assignment 1
 * Tool:       Playwright (UI automation, Chromium)
 *
 * Every selector in this file is derived directly from source code:
 *   frontend/src/routes/login/+page.svelte
 *   frontend/src/routes/signup/+page.svelte
 *   frontend/src/lib/components/Navbar.svelte
 *   frontend/src/lib/components/Avatar.svelte
 *
 * Test Cases:
 *   TC-AUTH-01  Valid credentials → redirected away from /login
 *   TC-AUTH-02  Wrong password → .alert-error shown, stays on /login
 *   TC-AUTH-03  Empty username → stays on /login
 *   TC-AUTH-04  Empty password → stays on /login
 *   TC-AUTH-05  Both fields empty → stays on /login
 *   TC-AUTH-06  Authenticated user sees nav links (Locations, Collections, Map)
 *   TC-AUTH-07  Logout via Avatar dropdown works and redirects to /login
 *   TC-AUTH-08  Unauthenticated visit to /locations → redirected to /login
 *   TC-AUTH-09  Unauthenticated visit to /collections → redirected to /login
 *   TC-AUTH-10  Signup page loads with all six required fields
 *   TC-AUTH-11  Mismatched passwords on signup → .alert-error shown
 *   TC-AUTH-12  Duplicate username on signup → .alert-error shown
 *   TC-AUTH-13  Login page Signup link navigates to /signup
 *   TC-AUTH-14  Login page Forgot Password link navigates to /user/reset-password
 *   TC-AUTH-15  Signup page Login link navigates back to /login
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Credentials — match your .env file
// ─────────────────────────────────────────────────────────────────────────────
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin';

// ─────────────────────────────────────────────────────────────────────────────
// Selectors — every value verified against source code
// ─────────────────────────────────────────────────────────────────────────────
const SEL = {
  // ── login/+page.svelte ──────────────────────────────────────────────────
  // <input id="username" name="username" type="text" ...>
  usernameInput:   '#username',
  // <input id="password" name="password" type="password" ...>
  passwordInput:   '#password',
  // <button type="submit" class="btn btn-primary w-full">
  submitBtn:       'button[type="submit"].btn.btn-primary',
  // {#if $page.form?.message} <div class="alert alert-error">
  errorAlert:      '.alert.alert-error',
  // <a href="/signup" class="link link-primary">
  signupLink:      'a[href="/signup"]',
  // <a href="/user/reset-password" class="link link-primary">
  forgotPassLink:  'a[href="/user/reset-password"]',

  // ── signup/+page.svelte ─────────────────────────────────────────────────
  // <input id="email" name="email">
  signupEmail:     '#email',
  // <input id="first_name" name="first_name">
  signupFirstName: '#first_name',
  // <input id="last_name" name="last_name">
  signupLastName:  '#last_name',
  // <input id="password2" name="password2">
  signupPassword2: '#password2',
  // <a href="/login" class="link link-primary">  (on signup page)
  loginLink:       'a[href="/login"]',

  // ── Navbar.svelte — only rendered when data.user is truthy ──────────────
  navLocations:    'a[href="/locations"]',
  navCollections:  'a[href="/collections"]',
  navMap:          'a[href="/map"]',

  // ── Avatar.svelte ───────────────────────────────────────────────────────
  // The avatar circle button that opens the dropdown
  // <div class="btn btn-ghost btn-circle avatar ...">
  avatarBtn:       '.btn.btn-ghost.btn-circle.avatar',
  // The logout button inside the Avatar dropdown
  // <button formaction="/?/logout" class="btn btn-ghost ...">
  logoutBtn:       'button[formaction="/?/logout"]',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — login and wait until page leaves /login
// ─────────────────────────────────────────────────────────────────────────────
async function loginAs(
  page: Page,
  username = VALID_USERNAME,
  password = VALID_PASSWORD
): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);
  await page.locator(SEL.usernameInput).fill(username);
  await page.locator(SEL.passwordInput).fill(password);
  await page.locator(SEL.submitBtn).click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 12_000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — logout via the Avatar dropdown (confirmed from Avatar.svelte)
// Flow: click avatar circle → dropdown opens → click logout button
// ─────────────────────────────────────────────────────────────────────────────
async function logout(page: Page): Promise<void> {
  // Click the avatar circle to open the dropdown
  await page.locator(SEL.avatarBtn).click();
  // Wait for the logout button to appear inside the dropdown
  await page.waitForSelector(SEL.logoutBtn, { timeout: 6_000 });
  // Click the logout button — its formaction="/?/logout" posts to SvelteKit
  await page.locator(SEL.logoutBtn).click();
  // Wait to be redirected away from the authenticated area
  await page.waitForURL(
    (url) => url.pathname.startsWith('/login') || url.pathname === '/',
    { timeout: 10_000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — destroy session without going through UI (used before
//          unauthenticated-access tests so we don't depend on logout UI)
// ─────────────────────────────────────────────────────────────────────────────
async function clearSession(page: Page): Promise<void> {
  // Navigate directly to allauth's logout endpoint — always available
  await page.goto('/auth/logout/');
  await page.waitForTimeout(1_000);
}

// =============================================================================
// TC-AUTH-01  Valid credentials redirect to authenticated area
// =============================================================================
test('TC-AUTH-01: valid credentials redirect to authenticated area', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);

  await page.locator(SEL.usernameInput).fill(VALID_USERNAME);
  await page.locator(SEL.passwordInput).fill(VALID_PASSWORD);
  await page.locator(SEL.submitBtn).click();

  // Must leave /login
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 12_000 }
  );

  // Navbar nav links only render when data.user is truthy — confirms session created
  await expect(page.locator(SEL.navLocations).first()).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-AUTH-02  Wrong password → error alert, stays on /login
// Source: {#if ($page.form?.message && $page.form?.message.length > 1) ||
//              $page.form?.type === 'error'} <div class="alert alert-error">
// =============================================================================
test('TC-AUTH-02: wrong password shows alert-error and stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);

  await page.locator(SEL.usernameInput).fill(VALID_USERNAME);
  await page.locator(SEL.passwordInput).fill('WRONG_PASSWORD_99999');
  await page.locator(SEL.submitBtn).click();

  // SvelteKit form action returns error → page re-renders with .alert-error
  await expect(page.locator(SEL.errorAlert)).toBeVisible({ timeout: 8_000 });
  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-03  Empty username → stays on /login
// Login form has no `required` on username — Django rejects blank username
// =============================================================================
test('TC-AUTH-03: empty username stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.passwordInput);

  // Leave username blank, fill only password
  await page.locator(SEL.passwordInput).fill(VALID_PASSWORD);
  await page.locator(SEL.submitBtn).click();

  await page.waitForTimeout(2_500);
  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-04  Empty password → stays on /login
// =============================================================================
test('TC-AUTH-04: empty password stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);

  await page.locator(SEL.usernameInput).fill(VALID_USERNAME);
  // Leave password blank
  await page.locator(SEL.submitBtn).click();

  await page.waitForTimeout(2_500);
  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-05  Both fields empty → stays on /login
// =============================================================================
test('TC-AUTH-05: both fields empty stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.submitBtn);

  await page.locator(SEL.submitBtn).click();

  await page.waitForTimeout(2_500);
  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-06  Authenticated user sees nav items
// Navbar.svelte: navigationItems rendered only inside {#if data.user}
// =============================================================================
test('TC-AUTH-06: authenticated user sees Locations, Collections and Map in navbar', async ({
  page,
}) => {
  await loginAs(page);

  await expect(page.locator(SEL.navLocations).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(SEL.navCollections).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(SEL.navMap).first()).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-AUTH-07  Logout via Avatar dropdown
// Avatar.svelte:
//   - avatar trigger: .btn.btn-ghost.btn-circle.avatar
//   - logout button:  button[formaction="/?/logout"]
// =============================================================================
test('TC-AUTH-07: logout via Avatar dropdown redirects to login or home', async ({ page }) => {
  await loginAs(page);

  // Open the Avatar dropdown by clicking the avatar circle button
  await page.locator(SEL.avatarBtn).click();

  // The logout button appears inside the dropdown — wait for it
  await expect(page.locator(SEL.logoutBtn)).toBeVisible({ timeout: 6_000 });

  // Click logout — posts to /?/logout via SvelteKit form action
  await page.locator(SEL.logoutBtn).click();

  // After logout: should be on /login or landing page
  await page.waitForURL(
    (url) => url.pathname.startsWith('/login') || url.pathname === '/',
    { timeout: 10_000 }
  );

  // Nav links should no longer be visible (data.user is now null)
  await expect(page.locator(SEL.navLocations)).toHaveCount(0);
});

// =============================================================================
// TC-AUTH-08  Unauthenticated access to /locations → redirect to /login
// SvelteKit server load in locations/+page.server.ts guards this route
// =============================================================================
test('TC-AUTH-08: unauthenticated user visiting /locations is redirected to /login', async ({
  page,
}) => {
  await clearSession(page);

  await page.goto('/locations');
  await page.waitForURL(
    (url) => url.pathname.startsWith('/login'),
    { timeout: 10_000 }
  );

  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-09  Unauthenticated access to /collections → redirect to /login
// =============================================================================
test('TC-AUTH-09: unauthenticated user visiting /collections is redirected to /login', async ({
  page,
}) => {
  await clearSession(page);

  await page.goto('/collections');
  await page.waitForURL(
    (url) => url.pathname.startsWith('/login'),
    { timeout: 10_000 }
  );

  expect(page.url()).toContain('/login');
});

// =============================================================================
// TC-AUTH-10  Signup page loads with all six required fields
// signup/+page.svelte: id="username","email","first_name","last_name",
//                      id="password" (name="password1"), id="password2"
// =============================================================================
test('TC-AUTH-10: signup page loads with all six required input fields', async ({ page }) => {
  await page.goto('/signup');

  await expect(page.locator(SEL.usernameInput)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.signupEmail)).toBeVisible();
  await expect(page.locator(SEL.signupFirstName)).toBeVisible();
  await expect(page.locator(SEL.signupLastName)).toBeVisible();
  await expect(page.locator(SEL.passwordInput)).toBeVisible();   // id="password", name="password1"
  await expect(page.locator(SEL.signupPassword2)).toBeVisible(); // id="password2", name="password2"
  await expect(page.locator(SEL.submitBtn)).toBeVisible();
});

// =============================================================================
// TC-AUTH-11  Mismatched passwords on signup → .alert-error
// signup/+page.svelte: {#if $page.form?.message} <div class="alert alert-error">
// =============================================================================
test('TC-AUTH-11: mismatched passwords on signup shows alert-error', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForSelector(SEL.usernameInput);

  const uid = Date.now();
  await page.locator(SEL.usernameInput).fill(`testuser_${uid}`);
  await page.locator(SEL.signupEmail).fill(`test_${uid}@example.com`);
  await page.locator(SEL.signupFirstName).fill('Test');
  await page.locator(SEL.signupLastName).fill('User');
  await page.locator(SEL.passwordInput).fill('Password123!');
  await page.locator(SEL.signupPassword2).fill('TotallyDifferent456!');
  await page.locator(SEL.submitBtn).click();

  await expect(page.locator(SEL.errorAlert)).toBeVisible({ timeout: 8_000 });
  expect(page.url()).toContain('/signup');
});

// =============================================================================
// TC-AUTH-12  Duplicate username on signup → .alert-error
// Uses known-existing 'admin' username — Django returns a conflict error
// =============================================================================
test('TC-AUTH-12: duplicate username on signup shows alert-error', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForSelector(SEL.usernameInput);

  await page.locator(SEL.usernameInput).fill('admin'); // known existing
  await page.locator(SEL.signupEmail).fill(`dup_${Date.now()}@example.com`);
  await page.locator(SEL.signupFirstName).fill('Test');
  await page.locator(SEL.signupLastName).fill('User');
  await page.locator(SEL.passwordInput).fill('Password123!');
  await page.locator(SEL.signupPassword2).fill('Password123!');
  await page.locator(SEL.submitBtn).click();

  await expect(page.locator(SEL.errorAlert)).toBeVisible({ timeout: 8_000 });
  expect(page.url()).toContain('/signup');
});

// =============================================================================
// TC-AUTH-13  Login page Signup link → navigates to /signup
// Source: <a href="/signup" class="link link-primary">
// =============================================================================
test('TC-AUTH-13: login page Signup link navigates to /signup', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.signupLink);

  await page.locator(SEL.signupLink).first().click();
  await page.waitForURL('**/signup', { timeout: 8_000 });

  expect(page.url()).toContain('/signup');
});

// =============================================================================
// TC-AUTH-14  Login page Forgot Password link → /user/reset-password
// Source: <a href="/user/reset-password" class="link link-primary">
// =============================================================================
test('TC-AUTH-14: login page Forgot Password link navigates to /user/reset-password', async ({
  page,
}) => {
  await page.goto('/login');
  await page.waitForSelector(SEL.forgotPassLink);

  await page.locator(SEL.forgotPassLink).first().click();
  await page.waitForURL('**/reset-password**', { timeout: 8_000 });

  expect(page.url()).toContain('/reset-password');
});

// =============================================================================
// TC-AUTH-15  Signup page Login link → navigates back to /login
// Source: <a href="/login" class="link link-primary">
// =============================================================================
test('TC-AUTH-15: signup page Login link navigates back to /login', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForSelector(SEL.loginLink);

  await page.locator(SEL.loginLink).first().click();
  await page.waitForURL('**/login', { timeout: 8_000 });

  expect(page.url()).toContain('/login');
});
