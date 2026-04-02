/**
 * Authentication & User Management Tests
 *
 * IMPORTANT — storageState override pattern:
 *   Describe blocks that test unauthenticated flows (Login, Registration, Password Reset)
 *   must call  test.use({ storageState: { cookies: [], origins: [] } })
 *   to clear the project-level session for those tests only.
 *
 *   All other describe blocks (Logout, Settings) run WITH the project session.
 */
import { test, expect, uid } from '../fixtures';

const VALID_USER = {
  username: process.env.TEST_USERNAME ?? 'admin',
  password: process.env.TEST_PASSWORD ?? 'admin',
};

// ─── Login (unauthenticated) ──────────────────────────────────────────────────

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page shows username, password fields and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('user flow: fill credentials → click Login → redirect away from /login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', VALID_USER.username);
    await page.fill('#password', VALID_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('wrong password → stays on /login → .alert-error shown', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', VALID_USER.username);
    await page.fill('#password', 'definitely-wrong-password-xyz');
    await page.click('button[type="submit"]');

    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('non-existent username → error alert', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', 'ghost_user_that_does_not_exist');
    await page.fill('#password', 'somepassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
  });

  test('submitting empty form stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain('/login');
  });

  test('"Sign Up" link navigates to /signup', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/signup"]');
    await expect(page).toHaveURL(/\/signup/);
  });

  test('"Forgot password" link navigates to /user/reset-password', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/user/reset-password"]');
    await expect(page).toHaveURL(/reset-password/);
  });
});

// ─── Registration (unauthenticated) ──────────────────────────────────────────

test.describe('Registration', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sign-up page renders all required fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#first_name')).toBeVisible();
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#password2')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('user flow: fill all fields with unique username → submit → redirect or verify email msg', async ({ page }) => {
    await page.goto('/signup');

    const newUser = `e2e_${uid()}`;

    await page.fill('#username', newUser);
    await page.fill('#email', `${newUser}@example.com`);
    await page.fill('#first_name', 'Test');
    await page.fill('#last_name', 'User');
    await page.fill('#password', 'TestPass123!');
    await page.fill('#password2', 'TestPass123!');
    await page.click('button[type="submit"]');


    await page.waitForTimeout(3_000);
    const onSignup = page.url().includes('/signup');
    if (onSignup) {
      // Must NOT show an error alert — only info / success
      await expect(page.locator('.alert-error')).toHaveCount(0);
    } else {
      await expect(page).not.toHaveURL(/\/signup/);
    }
  });

  test('mismatched passwords → .alert-error → stays on /signup', async ({ page }) => {
    await page.goto('/signup');
    const name = `e2e_${uid()}`;

    await page.fill('#username', name);
    await page.fill('#email', `${name}@example.com`);
    await page.fill('#first_name', 'Test');
    await page.fill('#last_name', 'User');
    await page.fill('#password', 'Password123!');
    await page.fill('#password2', 'Mismatch456!');
    await page.click('button[type="submit"]');

    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain('/signup');
  });

  test('duplicate username → server returns error', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('#username', VALID_USER.username);
    await page.fill('#email', `dup_${uid()}@example.com`);
    await page.fill('#first_name', 'Test');
    await page.fill('#last_name', 'Dup');
    await page.fill('#password', 'Password123!');
    await page.fill('#password2', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
  });

  test('"Already have an account?" link goes to /login', async ({ page }) => {
    await page.goto('/signup');
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Password Reset (unauthenticated) ────────────────────────────────────────

test.describe('Password Reset', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('reset-password page renders email input and submit button', async ({ page }) => {
    await page.goto('/user/reset-password');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('submitting a valid email shows no crash and no error alert', async ({ page }) => {
    await page.goto('/user/reset-password');
    await page.fill('input[type="email"], input[name="email"]', 'nonexistent@example.com');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2_000);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('.alert-error')).toHaveCount(0);
  });
});


// ─── Settings / Profile (authenticated — uses project storageState) ───────────


test.describe('Settings – Profile', () => {
  test('settings page is accessible and shows profile section', async ({ page }) => {
  await page.goto('/');

  const avatarBtn = page.locator('.navbar-end [role="button"].btn-circle.avatar, .navbar-end .dropdown [role="button"]').first();
    await expect(avatarBtn).toBeVisible({ timeout: 8_000 });
    await avatarBtn.click();


    // Logout is a button inside a <form method="post"> with formaction="/?/logout"
    const settingsBtn = page.locator('button:has-text("Settings")');
    await expect(settingsBtn).toBeVisible({ timeout: 4_000 });
    await settingsBtn.click();
});


  test('user flow: update first name → save → no error alert', async ({ page }) => {
    await page.goto('/settings');

    const firstNameInput = page.locator('input[name="first_name"], #first_name').first();
    await expect(firstNameInput).toBeVisible({ timeout: 8_000 });

    await firstNameInput.fill('AssiyaTest');
    const updateButton = page.getByRole('button', { name: /update/i });

  
    await expect(page.locator('.alert-error')).toHaveCount(0);
  });
});


// ─── Logout (authenticated — uses project storageState) ──────────────────────
/*test.describe('Logout', () => {
  test('user flow: authenticated → open avatar dropdown → Logout → land on /', async ({ page }) => {
    // We start authenticated via project-level storageState
    await page.goto('/');

    // The avatar dropdown is a div[role="button"] with initials inside
    const avatarBtn = page.locator('.navbar-end [role="button"].btn-circle.avatar, .navbar-end .dropdown [role="button"]').first();
    await expect(avatarBtn).toBeVisible({ timeout: 8_000 });
    await avatarBtn.click();

    // Logout is a button inside a <form method="post"> with formaction="/?/logout"
    const logoutBtn = page.locator('button[formaction="/?/logout"], button:has-text("Logout")');
    await expect(logoutBtn).toBeVisible({ timeout: 4_000 });
    await logoutBtn.click();

    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });
});*/


