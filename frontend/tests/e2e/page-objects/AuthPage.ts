import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // ── Login form ────────────────────────────────────────────────────────────
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly loginError: Locator;

  // ── Registration form ─────────────────────────────────────────────────────
  readonly registerLink: Locator;
  readonly regUsernameInput: Locator;
  readonly regFirstNameInput: Locator;
  readonly regLastNameInput: Locator;
  readonly regEmailInput: Locator;
  readonly regPasswordInput: Locator;
  readonly regPasswordConfirmInput: Locator;
  readonly registerButton: Locator;

  // ── Profile / settings ────────────────────────────────────────────────────
  readonly profileMenuTrigger: Locator;
  readonly logoutButton: Locator;
  readonly settingsLink: Locator;
  readonly changePasswordSection: Locator;

  constructor(page: Page) {
    super(page);

    // Login
    this.usernameInput = page.locator('input[name="username"], input[id="username"]');
    this.passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    this.loginButton = page.locator('button[type="submit"]').filter({ hasText: /log\s*in|sign\s*in/i });
    this.loginError = page.locator('[role="alert"], .alert-error, .error-message, .text-error').filter({
      hasText: /invalid|incorrect|wrong|credentials|username|password/i,
    });

    // Registration
    this.registerLink = page.locator('a[href*="register"], a[href*="signup"]').first();
    this.regUsernameInput = page.locator('input[name="username"]');
    this.regFirstNameInput = page.locator('input[name="first_name"], input[id="first_name"]');
    this.regLastNameInput = page.locator('input[name="last_name"], input[id="last_name"]');
    this.regEmailInput = page.locator('input[name="email"], input[type="email"]').first();
    this.regPasswordInput = page.locator('input[name="password1"], input[name="password"]').first();
    this.regPasswordConfirmInput = page.locator(
      'input[name="password2"], input[name="password_confirm"], input[name="confirmPassword"]'
    );
    this.registerButton = page.locator('button[type="submit"]').filter({ hasText: /register|sign\s*up|create/i });

    // Profile
    this.profileMenuTrigger = page.locator('[data-testid="user-menu"], .avatar, button:has(.avatar), button[aria-label*="profile" i]').first();
    this.logoutButton = page.locator('button, a').filter({ hasText: /log\s*out|sign\s*out/i });
    this.settingsLink = page.locator('a[href*="settings"], a').filter({ hasText: /settings/i }).first();
    this.changePasswordSection = page.locator('section, div, form').filter({ hasText: /change\s*password/i }).first();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async gotoLogin() {
    await this.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoRegister() {
    await this.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async login(username: string, password: string) {
    await this.gotoLogin();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    await this.profileMenuTrigger.click();
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async register(data: {
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    passwordConfirm?: string;
  }) {
    await this.gotoRegister();
    await this.regUsernameInput.fill(data.username);
    if (data.firstName) await this.regFirstNameInput.fill(data.firstName);
    if (data.lastName) await this.regLastNameInput.fill(data.lastName);
    await this.regEmailInput.fill(data.email);
    await this.regPasswordInput.fill(data.password);
    await this.regPasswordConfirmInput.fill(data.passwordConfirm ?? data.password);
    await this.registerButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoginError() {
    await expect(this.loginError).toBeVisible({ timeout: 6000 });
  }

  async expectLoggedIn() {
    // After login, user lands on home/dashboard and URL is no longer /login
    await expect(this.page).not.toHaveURL(/login/);
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoggedOut() {
    await expect(this.page).toHaveURL(/login|^\//);
  }

  async gotoSettings() {
    await this.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }
}
