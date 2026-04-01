import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h2')).toContainText('Login');

  await page.fill('#username', process.env.TEST_USERNAME || 'admin');
  await page.fill('#password', process.env.TEST_PASSWORD || 'admin');
  await page.click('button[type="submit"]');

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
  await page.context().storageState({ path: authFile });
});
