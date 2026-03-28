/**
 * mapping.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module:     Mapping & Visualization
 * Risk Score: HIGH (12)
 * Tool:       Playwright (UI automation, Chromium)
 *
 * Every selector verified against:
 *   frontend/src/routes/map/+page.svelte
 *   frontend/src/lib/components/map/FullMap.svelte (renders the MapLibre canvas)
 *   frontend/src/lib/components/Avatar.svelte
 *
 * How map testing works with Playwright:
 *   MapLibre GL renders into a <canvas> element using WebGL. We cannot
 *   inspect individual pixels or read pin text from the canvas. Instead we
 *   verify structural correctness:
 *     1. The <canvas> is present and has non-zero dimensions (map rendered)
 *     2. No JavaScript errors thrown during load
 *     3. All UI controls (checkboxes, search, stats, buttons) function correctly
 *     4. Navigation from the navbar works
 *
 * Test Cases:
 *   TC-MAP-01  /map page loads with heading and stat bar
 *   TC-MAP-02  Map <canvas> is rendered with non-zero dimensions
 *   TC-MAP-03  No JavaScript errors thrown during map load
 *   TC-MAP-04  Show Visited checkbox is present and toggleable
 *   TC-MAP-05  Show Planned checkbox is present and toggleable
 *   TC-MAP-06  Show Regions checkbox is present and toggleable
 *   TC-MAP-07  Search input filters pins (stat bar count updates)
 *   TC-MAP-08  Add Location button opens dialog#my_modal_1 (LocationModal)
 *   TC-MAP-09  Map page re-renders canvas after navigate-away and return
 *   TC-MAP-10  Navbar Map link navigates to /map
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect, type Page } from '@playwright/test';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin';

const SEL = {
  // Login helpers
  usernameInput: '#username',
  passwordInput: '#password',
  loginSubmit:   'button[type="submit"].btn.btn-primary',

  // map/+page.svelte
  // <h1 class="text-3xl font-bold bg-clip-text text-primary">
  pageHeading:   'h1.text-3xl.font-bold',

  // Stat bar: <p class="text-sm text-base-content/60">
  // Shows "{filteredPins.length} of {totalAdventures} locations shown"
  statBar:       'p.text-sm.text-base-content\\/60',

  // MapLibre canvas — rendered by FullMap.svelte inside .card-body
  canvas:        'canvas',

  // Display options checkboxes — all in the sidebar
  // <input type="checkbox" bind:checked={showVisited} class="checkbox checkbox-success checkbox-sm">
  showVisited:   'input.checkbox.checkbox-success.checkbox-sm',
  // <input type="checkbox" bind:checked={showPlanned} class="checkbox checkbox-info checkbox-sm">
  showPlanned:   'input.checkbox.checkbox-info.checkbox-sm',
  // <input type="checkbox" bind:checked={showRegions} class="checkbox checkbox-accent checkbox-sm">
  showRegions:   'input.checkbox.checkbox-accent.checkbox-sm',
  // <input type="checkbox" bind:checked={showCities} class="checkbox checkbox-warning checkbox-sm">
  showCities:    'input.checkbox.checkbox-warning.checkbox-sm',
  // <input type="checkbox" bind:checked={showActivities} class="checkbox checkbox-error checkbox-sm">
  showActivities: 'input.checkbox.checkbox-error.checkbox-sm',

  // Search input: <input type="text" class="grow" bind:value={searchQuery}>
  // Inside: <label class="input input-bordered input-sm flex items-center gap-2 flex-1 max-w-md">
  searchInput:   'label.input.input-bordered input.grow',

  // Clear search button — only visible when searchQuery is non-empty
  // <button type="button" class="btn btn-ghost btn-xs btn-circle" ...>
  clearSearch:   'button.btn.btn-ghost.btn-xs.btn-circle',

  // Add Location button (no marker placed):
  // <button type="button" class="btn btn-primary btn-sm gap-2" on:click={() => (createModalOpen = true)}>
  addLocationBtn: 'button.btn.btn-primary.btn-sm.gap-2',

  // LocationModal dialog (reused from locations)
  modal:         'dialog#my_modal_1',

  // Navbar Map link
  navMap:        'a[href="/map"]',

  // Avatar for logout helper
  avatarBtn:     '.btn.btn-ghost.btn-circle.avatar',
  logoutBtn:     'button[formaction="/?/logout"]',
};

async function loginAs(page: Page, u = VALID_USERNAME, p = VALID_PASSWORD) {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);
  await page.locator(SEL.usernameInput).fill(u);
  await page.locator(SEL.passwordInput).fill(p);
  await page.locator(SEL.loginSubmit).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 12_000 });
}

async function ensureSidebarVisible(page: Page) {
  // Sidebar drawer toggle: <input id="map-drawer" type="checkbox" class="drawer-toggle">
  const toggle = page.locator('button.btn.btn-ghost.btn-square.lg\\:hidden').first();
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.waitForTimeout(400);
  }
}

// Give MapLibre time to initialise — it loads tiles and renders asynchronously
const MAP_INIT_WAIT = 4_000;

test.beforeEach(async ({ page }) => {
  await loginAs(page);
  await page.goto('/map');
  // Wait for the heading to confirm page load, then extra time for MapLibre init
  await page.waitForSelector(SEL.pageHeading, { timeout: 10_000 });
  await page.waitForTimeout(MAP_INIT_WAIT);
});

// =============================================================================
// TC-MAP-01  Page loads with heading and stat bar
// Source: <h1 class="text-3xl font-bold bg-clip-text text-primary">
//         <p class="text-sm text-base-content/60"> shows pin counts
// =============================================================================
test('TC-MAP-01: /map page loads with heading and stat bar', async ({ page }) => {
  await expect(page.locator(SEL.pageHeading)).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(SEL.statBar).first()).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-MAP-02  Map <canvas> rendered with non-zero dimensions
// MapLibre GL renders into <canvas>. If the canvas has zero size, map failed.
// =============================================================================
test('TC-MAP-02: map canvas is present and has non-zero dimensions', async ({ page }) => {
  const canvas = page.locator(SEL.canvas).first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);
});

// =============================================================================
// TC-MAP-03  No JavaScript errors during map load
// MapLibre errors (WebGL context failure, tile errors) surface as pageerror events
// =============================================================================
test('TC-MAP-03: no JavaScript errors are thrown during map page load', async ({ browser }) => {
  const context = await browser.newContext();
  const page    = await context.newPage();

  const jsErrors: string[] = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  await loginAs(page);
  await page.goto('/map');
  await page.waitForTimeout(MAP_INIT_WAIT + 1_000);

  // Filter out known benign browser warnings that are not real app errors
  const realErrors = jsErrors.filter(
    (msg) =>
      !msg.includes('ResizeObserver loop') &&
      !msg.includes('Non-Error promise rejection') &&
      !msg.includes('AbortError')
  );

  await context.close();
  expect(realErrors).toHaveLength(0);
});

// =============================================================================
// TC-MAP-04  Show Visited checkbox present and toggleable
// Source: <input type="checkbox" bind:checked={showVisited}
//                class="checkbox checkbox-success checkbox-sm">
// Toggling updates filteredPins reactively (no navigation)
// =============================================================================
test('TC-MAP-04: Show Visited checkbox is present and toggleable', async ({ page }) => {
  await ensureSidebarVisible(page);

  const checkbox = page.locator(SEL.showVisited);
  await expect(checkbox).toBeVisible({ timeout: 6_000 });

  // Default: checked (showVisited = true on mount)
  await expect(checkbox).toBeChecked();

  // Uncheck — filteredPins reactively recalculates, no navigation
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();

  // Re-check
  await checkbox.click();
  await expect(checkbox).toBeChecked();
});

// =============================================================================
// TC-MAP-05  Show Planned checkbox present and toggleable
// Source: <input type="checkbox" bind:checked={showPlanned}
//                class="checkbox checkbox-info checkbox-sm">
// =============================================================================
test('TC-MAP-05: Show Planned checkbox is present and toggleable', async ({ page }) => {
  await ensureSidebarVisible(page);

  const checkbox = page.locator(SEL.showPlanned);
  await expect(checkbox).toBeVisible({ timeout: 6_000 });
  await expect(checkbox).toBeChecked();

  await checkbox.click();
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  await expect(checkbox).toBeChecked();
});

// =============================================================================
// TC-MAP-06  Show Regions checkbox present and toggleable
// Source: <input type="checkbox" bind:checked={showRegions}
//                class="checkbox checkbox-accent checkbox-sm">
// =============================================================================
test('TC-MAP-06: Show Regions checkbox is present and toggleable', async ({ page }) => {
  await ensureSidebarVisible(page);

  const checkbox = page.locator(SEL.showRegions);
  await expect(checkbox).toBeVisible({ timeout: 6_000 });

  // Default: unchecked (showRegions = false on mount)
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  await expect(checkbox).toBeChecked();

  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
});

// =============================================================================
// TC-MAP-07  Search input filters visible pins
// Source: bind:value={searchQuery} → reactive $: filteredPins = pins.filter(...)
//         Stat bar shows "{filteredPins.length} of {totalAdventures} locations shown"
//         If we type a query that matches nothing, filteredPins.length drops to 0
// =============================================================================
test('TC-MAP-07: typing in search input updates the stat bar pin count', async ({ page }) => {
  // Read initial count from stat bar
  const statBar = page.locator(SEL.statBar).first();
  await expect(statBar).toBeVisible({ timeout: 6_000 });
  const initialText = await statBar.textContent() ?? '';

  // Type a query that is very unlikely to match any real location name
  const searchInput = page.locator(SEL.searchInput);
  await expect(searchInput).toBeVisible({ timeout: 6_000 });
  await searchInput.fill('zzzzzzzzz_no_match_99999');

  // Give the reactive filter time to update
  await page.waitForTimeout(500);

  // Stat bar text should now show a different (likely 0) count
  const filteredText = await statBar.textContent() ?? '';
  // The text will differ because filteredPins.length changed
  // We accept either a change in the text OR that it starts with "0"
  const hasZero = filteredText.startsWith('0') || filteredText.includes('0 of');
  expect(hasZero).toBeTruthy();

  // Clear the search
  const clearBtn = page.locator(SEL.clearSearch);
  await expect(clearBtn).toBeVisible({ timeout: 4_000 });
  await clearBtn.click();

  // Count should return to initial
  await page.waitForTimeout(400);
  const restoredText = await statBar.textContent() ?? '';
  expect(restoredText).toBe(initialText);
});

// =============================================================================
// TC-MAP-08  Add Location button opens LocationModal (dialog#my_modal_1)
// Source: <button type="button" class="btn btn-primary btn-sm gap-2"
//                 on:click={() => (createModalOpen = true)}>
//         {#if createModalOpen} <NewLocationModal ...> {/if}
//         LocationModal renders <dialog id="my_modal_1">
// =============================================================================
test('TC-MAP-08: Add Location button opens dialog#my_modal_1', async ({ page }) => {
  // The Add Location button appears in the header controls area
  const addBtn = page.locator(SEL.addLocationBtn).first();
  await expect(addBtn).toBeVisible({ timeout: 6_000 });
  await addBtn.click();

  // LocationModal should open
  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 8_000 });

  // Close it — use the modal's own close button
  await page.locator('dialog#my_modal_1 button.btn.btn-ghost.btn-square').first().click();
  await expect(page.locator(SEL.modal)).not.toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-MAP-09  Canvas still present after navigating away and returning
// Tests that MapLibre re-mounts correctly on second visit
// =============================================================================
test('TC-MAP-09: canvas is present after navigating away and returning to /map', async ({
  page,
}) => {
  // Navigate away
  await page.goto('/locations');
  await page.waitForSelector('h1.text-3xl', { timeout: 8_000 });

  // Navigate back
  await page.goto('/map');
  await page.waitForSelector(SEL.pageHeading, { timeout: 10_000 });
  await page.waitForTimeout(MAP_INIT_WAIT);

  const canvas = page.locator(SEL.canvas).first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
});

// =============================================================================
// TC-MAP-10  Navbar Map link navigates to /map
// Source: Navbar.svelte navigationItems: { path: '/map', label: 'navbar.map' }
//         Rendered as: <a href="/map" class="btn btn-ghost gap-2 ...">
// =============================================================================
test('TC-MAP-10: clicking the Map link in the navbar navigates to /map', async ({ page }) => {
  // Start from a different page
  await page.goto('/locations');
  await page.waitForSelector('h1', { timeout: 8_000 });

  // Click the Map link in the desktop navbar
  const mapLink = page.locator(SEL.navMap).first();
  await expect(mapLink).toBeVisible({ timeout: 6_000 });
  await mapLink.click();

  await page.waitForURL('**/map**', { timeout: 8_000 });
  expect(page.url()).toContain('/map');
});
