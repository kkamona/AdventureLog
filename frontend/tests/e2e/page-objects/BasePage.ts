import { type Page, type Locator, expect } from '@playwright/test';

/**
 * BasePage – shared helpers used by all Page Object Models.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to a path relative to BASE_URL */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /** Wait for a toast / alert message containing text */
  async expectToast(text: string | RegExp) {
    const toast = this.page.locator('[role="alert"], .toast, .alert').filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 8000 });
  }

  /** Assert current URL contains path segment */
  async expectUrl(segment: string) {
    await expect(this.page).toHaveURL(new RegExp(segment));
  }

  /** Wait for network to go idle after an action */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  /** Click and wait for navigation */
  async clickAndNavigate(locator: Locator) {
    await Promise.all([this.page.waitForNavigation(), locator.click()]);
  }
}
