/**
 * auth.setup.ts — runs ONCE before all test projects.
 * Logs in and saves the full browser storage state (cookies incl. httpOnly sessionid)
 * to AUTH_FILE. The chromium project then loads this file so every test
 * starts already authenticated.
 */
import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AUTH_FILE } from '../playwright.config';



setup('authenticate as admin', async ({ page }) => {
  // Guarantee the directory exists regardless of CWD
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Step 1: Navigate to login page
  await page.goto('/login');
  await expect(page.locator('h2')).toContainText('Login');

  // Step 2: Fill credentials
  await page.fill('#username', process.env.TEST_USERNAME ?? 'admin');
  await page.fill('#password', process.env.TEST_PASSWORD ?? 'admin');

  // Step 3: Submit the form
  await page.click('button[type="submit"]');

  // Step 4: Wait until we are NOT on the login page any more
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  });

  // Step 5: Confirm we are authenticated (navbar shows user avatar or username)
  // The navbar HTML includes "Hi, <name>" text inside the avatar dropdown
  //await expect(page.locator('nav, header')).toBeVisible();

  // Step 6: Persist the entire browser context (cookies, localStorage, sessionStorage)
  // httpOnly cookies like `sessionid` ARE included in storageState
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`✓ Auth state saved to ${AUTH_FILE}`);
  const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
  console.log('=== STORAGE STATE FILE ===');
  console.log(raw);
});
