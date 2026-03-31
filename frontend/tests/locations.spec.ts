/**
 * locations.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module:     Location Management
 * Risk Score: HIGH (12)
 * Tool:       Playwright (UI automation, Chromium)
 *
 * Every selector verified against:
 *   frontend/src/routes/locations/+page.svelte
 *   frontend/src/lib/components/locations/LocationModal.svelte
 *   frontend/src/lib/components/locations/LocationQuickStart.svelte
 *   frontend/src/lib/components/locations/LocationDetails.svelte
 *   frontend/src/lib/components/Avatar.svelte
 *
 * Modal flow (confirmed from source):
 *   Step 1 — LocationQuickStart: map/search picker, dispatches 'next' to skip
 *   Step 2 — LocationDetails:    name (id="name") + category (required) + save
 *   Step 3 — LocationMedia:      images/attachments (requires saved id)
 *   Step 4 — LocationVisits:     visit dates (requires saved id)
 *
 * Test Cases:
 *   TC-LOC-01  Page loads — heading and stat bar visible
 *   TC-LOC-02  Empty-state Create Location button opens dialog#my_modal_1
 *   TC-LOC-03  FAB (+) opens dropdown, Location button opens modal
 *   TC-LOC-04  Create location — skip QuickStart, fill name+category, save → card appears
 *   TC-LOC-05  Save button disabled when name is empty in Details step
 *   TC-LOC-06  Sort direction radios (asc/desc) present and clickable
 *   TC-LOC-07  Order-by radios (updated/name/date/rating) all present
 *   TC-LOC-08  Visit status filter radios (all/visited/not-visited) present and selectable
 *   TC-LOC-09  Include Collection Locations checkbox is toggleable
 *   TC-LOC-10  Location card link navigates to /locations/<id>
 *   TC-LOC-11  Modal close button (×) dismisses dialog#my_modal_1
 *   TC-LOC-12  Modal step tabs are rendered and non-active tabs are disabled without an id
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Credentials
// ─────────────────────────────────────────────────────────────────────────────
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin';

// ─────────────────────────────────────────────────────────────────────────────
// Selectors — every value verified against source
// ─────────────────────────────────────────────────────────────────────────────
const SEL = {
  // ── Login helpers ───────────────────────────────────────────────────────
  usernameInput: '#username',
  passwordInput: '#password',
  loginSubmit:   'button[type="submit"].btn.btn-primary',

  // ── locations/+page.svelte ──────────────────────────────────────────────
  // <h1 class="text-3xl font-bold bg-clip-text text-primary">
  // Targeted by structure, not text — text is i18n-translated
  pageHeading:   'h1.text-3xl.font-bold',

  // <p class="text-sm text-base-content/60"> (stat bar: "N Locations • N Visited • N Planned")
  statBar:       'p.text-sm.text-base-content\\/60',

  // Empty-state: <button class="btn btn-primary btn-wide mt-6 gap-2" on:click={...}>
  emptyStateBtn: 'button.btn.btn-primary.btn-wide',

  // FAB: <div tabindex="0" role="button" class="btn btn-primary btn-circle w-16 h-16 ...">
  fab:           'div.btn.btn-primary.btn-circle[role="button"]',
  // Location button inside FAB dropdown: <button class="btn btn-primary gap-2 w-full">
  fabLocationBtn: '.dropdown-content button.btn.btn-primary.gap-2',

  // ── LocationModal.svelte ────────────────────────────────────────────────
  // <dialog id="my_modal_1" class="modal backdrop-blur-sm">
  modal:         'dialog#my_modal_1',
  // Close (×): <button class="btn btn-ghost btn-square" on:click={close}>
  modalClose:    'dialog#my_modal_1 button.btn.btn-ghost.btn-square',
  // Step tab buttons: <button class="timeline-end timeline-box ...">
  stepTabs:      'dialog#my_modal_1 button.timeline-end.timeline-box',

  // ── LocationQuickStart.svelte (Step 1) ─────────────────────────────────
  // Search input — no id/name, identified by its unique class combination:
  // <input type="text" bind:value={searchQuery} class="input input-bordered w-full pl-10 pr-4">
  quickStartSearch: 'dialog#my_modal_1 input.input.input-bordered.pl-10',
  // Continue button: <button class="btn btn-primary flex-1" on:click={continueWithLocation}>
  // Clicking with no selection dispatches 'next' → advances to Step 2 (Details)
  quickStartContinue: 'dialog#my_modal_1 button.btn.btn-primary.flex-1',

  // ── LocationDetails.svelte (Step 2) ────────────────────────────────────
  // Name input: <input type="text" id="name" bind:value={location.name} ...>
  nameInput:     'dialog#my_modal_1 #name',
  // Link input: <input type="url" id="link" bind:value={location.link} ...>
  linkInput:     'dialog#my_modal_1 #link',
  // Public toggle: <input type="checkbox" id="is_public" class="toggle toggle-primary">
  publicToggle:  'dialog#my_modal_1 #is_public',
  // Save/Continue button: <button class="btn btn-primary gap-2" disabled={!location.name || !location.category ...}>
  // IMPORTANT: this button is disabled until both name AND category are filled
  detailsSaveBtn: 'dialog#my_modal_1 button.btn.btn-primary.gap-2',
  // Category dropdown — rendered by CategoryDropdown component.
  // CategoryDropdown renders a DaisyUI dropdown; we select the first option inside it.
  categoryDropdown: 'dialog#my_modal_1 .dropdown',
  categoryOption:   'dialog#my_modal_1 .dropdown-content li button, dialog#my_modal_1 .dropdown-content li',

  // ── Sidebar filter form (id="location-filters-form") ───────────────────
  // Sort direction: <input type="radio" name="order_direction" value="asc|desc">
  sortAsc:        'input[name="order_direction"][value="asc"]',
  sortDesc:       'input[name="order_direction"][value="desc"]',
  // Order-by: <input type="radio" name="order_by" value="...">
  orderByUpdated: 'input[name="order_by"][value="updated_at"]',
  orderByName:    'input[name="order_by"][value="name"]',
  orderByDate:    'input[name="order_by"][value="date"]',
  orderByRating:  'input[name="order_by"][value="rating"]',
  // Visit status: <input type="radio" name="is_visited" value="all|true|false">
  visitAll:       'input[name="is_visited"][value="all"]',
  visitTrue:      'input[name="is_visited"][value="true"]',
  visitFalse:     'input[name="is_visited"][value="false"]',
  // Include collections: <input type="checkbox" id="include_collections">
  includeCollections: '#include_collections',

  // Location card links rendered by LocationCard
  locationCardLink: 'a[href^="/locations/"]',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — login
// ─────────────────────────────────────────────────────────────────────────────
async function loginAs(page: Page, u = VALID_USERNAME, p = VALID_PASSWORD) {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);
  await page.locator(SEL.usernameInput).fill(u);
  await page.locator(SEL.passwordInput).fill(p);
  await page.locator(SEL.loginSubmit).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 12_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — open the location modal via FAB
// ─────────────────────────────────────────────────────────────────────────────
async function openLocationModal(page: Page) {
  await page.locator(SEL.fab).click();
  await page.locator(SEL.fabLocationBtn).waitFor({ state: 'visible', timeout: 6_000 });
  await page.locator(SEL.fabLocationBtn).click();
  await page.locator(SEL.modal).waitFor({ state: 'visible', timeout: 6_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — advance from Step 1 (QuickStart) to Step 2 (Details)
// Clicking Continue with no selection dispatches 'next', modal advances to Details
// ─────────────────────────────────────────────────────────────────────────────
async function skipToDetailsStep(page: Page) {
  // The Continue button in QuickStart: button.btn.btn-primary.flex-1
  await page.locator(SEL.quickStartContinue).waitFor({ state: 'visible', timeout: 6_000 });
  await page.locator(SEL.quickStartContinue).click();
  // Wait for the name input (Details step) to appear
  await page.locator(SEL.nameInput).waitFor({ state: 'visible', timeout: 6_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — on desktop the sidebar is always open (lg:drawer-open).
// On mobile we must click the filter toggle to open it.
// ─────────────────────────────────────────────────────────────────────────────
async function ensureSidebarVisible(page: Page) {
  const mobileToggle = page.locator('button.btn.btn-ghost.btn-square.lg\\:hidden').first();
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    await page.waitForTimeout(400);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// All tests need an authenticated session and start on /locations
// ─────────────────────────────────────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  await loginAs(page);
  await page.goto('/locations');
  await page.waitForSelector(SEL.pageHeading, { timeout: 10_000 });
});

// =============================================================================
// TC-LOC-01  Page loads — heading and stat bar visible
// Source: <h1 class="text-3xl font-bold bg-clip-text text-primary">
//         <p class="text-sm text-base-content/60"> (e.g. "3 Locations • 2 Visited • 1 Planned")
// =============================================================================
test('TC-LOC-01: /locations page loads with heading and stat bar', async ({ page }) => {
  await expect(page.locator(SEL.pageHeading)).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(SEL.statBar).first()).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-LOC-02  Empty-state button opens dialog#my_modal_1
// Source: <button class="btn btn-primary btn-wide mt-6 gap-2"
//                 on:click={() => { adventureToEdit = null; isLocationModalOpen = true; }}>
// =============================================================================
test('TC-LOC-02: empty-state Create Location button opens dialog#my_modal_1', async ({ page }) => {
  const emptyBtn = page.locator(SEL.emptyStateBtn);

  if (!(await emptyBtn.isVisible())) {
    // Locations already exist — modal opening is tested via FAB in TC-LOC-03
    test.skip();
    return;
  }

  await emptyBtn.click();
  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-LOC-03  FAB (+) → dropdown → Location button → opens modal
// Source: FAB = div.btn.btn-primary.btn-circle[role="button"]  (DaisyUI dropdown trigger)
//         Location button inside = .dropdown-content button.btn.btn-primary.gap-2
//         Modal = <dialog id="my_modal_1">
// =============================================================================
test('TC-LOC-03: FAB (+) opens dropdown and Location button opens dialog#my_modal_1', async ({
  page,
}) => {
  await page.locator(SEL.fab).click();
  await expect(page.locator(SEL.fabLocationBtn)).toBeVisible({ timeout: 6_000 });

  await page.locator(SEL.fabLocationBtn).click();
  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-LOC-04  Create a location: skip QuickStart → fill name+category → save → card appears
//
// Flow confirmed from source:
//  1. Open modal via FAB
//  2. Click Continue (no selection) → dispatches 'next' → modal advances to Details step
//  3. #name input is now visible (LocationDetails.svelte: <input id="name">)
//  4. Fill name
//  5. Open CategoryDropdown and select the first available category
//     (required — handleSave() returns early if !location.category)
//  6. Click Save button (btn.btn-primary.gap-2) — only enabled when name+category filled
//  7. API POST /api/locations → modal advances to Media step (step 3)
//  8. Close modal — location card with the new name should appear in the grid
// =============================================================================
test('TC-LOC-04: create location via modal — card appears in the locations list', async ({
  page,
}) => {
  await openLocationModal(page);

  // ── Step 1: QuickStart — click Continue to skip to Details
  await skipToDetailsStep(page);

  // ── Step 2: Details — fill required fields
  const locationName = `Playwright Test Location ${Date.now()}`;

  // Name input: <input type="text" id="name" bind:value={location.name}>
  await page.locator(SEL.nameInput).fill(locationName);

  // Category is required — open the CategoryDropdown and pick the first option
  // CategoryDropdown is a DaisyUI dropdown inside the modal
  const categoryDropdown = page.locator(SEL.categoryDropdown).first();
  await categoryDropdown.click();

  // Wait for dropdown options to appear and click the first one
  const firstOption = page.locator(SEL.categoryOption).first();
  await firstOption.waitFor({ state: 'visible', timeout: 6_000 });
  await firstOption.click();

  // Save button: <button class="btn btn-primary gap-2" disabled={!location.name || !location.category}>
  const saveBtn = page.locator(SEL.detailsSaveBtn);
  await expect(saveBtn).toBeEnabled({ timeout: 4_000 });
  await saveBtn.click();

  // After save, modal advances to Step 3 (Media). Close the modal.
  // The close button is btn.btn-ghost.btn-square
  await page.locator(SEL.modalClose).first().waitFor({ state: 'visible', timeout: 8_000 });
  await page.locator(SEL.modalClose).first().click();

  // Modal should close
  await expect(page.locator(SEL.modal)).not.toBeVisible({ timeout: 6_000 });

  // The new location card should now appear in the grid
  await expect(page.locator(`text=${locationName}`)).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-LOC-05  Save button is disabled when name is empty
// Source: <button class="btn btn-primary gap-2"
//                 disabled={!location.name || !location.category || isReverseGeocoding}>
// =============================================================================
test('TC-LOC-05: Details step Save button is disabled when name field is empty', async ({
  page,
}) => {
  await openLocationModal(page);
  await skipToDetailsStep(page);

  // Name field is empty on mount — Save button must be disabled
  const saveBtn = page.locator(SEL.detailsSaveBtn);
  await expect(saveBtn).toBeDisabled({ timeout: 4_000 });

  // Fill name only (no category yet) — button should still be disabled
  await page.locator(SEL.nameInput).fill('Test');
  // Without category it remains disabled
  await expect(saveBtn).toBeDisabled();
});

// =============================================================================
// TC-LOC-06  Sort direction radios present and clickable
// Source: <input type="radio" name="order_direction" id="asc" value="asc" ...>
//         <input type="radio" name="order_direction" id="desc" value="desc" ...>
// =============================================================================
test('TC-LOC-06: sort direction radios (asc/desc) are present and clickable', async ({ page }) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.sortAsc)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.sortDesc)).toBeVisible({ timeout: 6_000 });

  await page.locator(SEL.sortDesc).click();
  await expect(page.locator(SEL.sortDesc)).toBeChecked();

  await page.locator(SEL.sortAsc).click();
  await expect(page.locator(SEL.sortAsc)).toBeChecked();
});

// =============================================================================
// TC-LOC-07  Order-by radios all present
// Source: radio inputs with name="order_by", values: updated_at / name / date / rating
// =============================================================================
test('TC-LOC-07: all four order-by radios (updated/name/date/rating) are present', async ({
  page,
}) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.orderByUpdated)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.orderByName)).toBeVisible();
  await expect(page.locator(SEL.orderByDate)).toBeVisible();
  await expect(page.locator(SEL.orderByRating)).toBeVisible();
});

// =============================================================================
// TC-LOC-08  Visit status filter radios present and selectable
// Source: <input type="radio" name="is_visited" value="all|true|false">
// =============================================================================
test('TC-LOC-08: visit status radios (all/visited/not-visited) are present and selectable', async ({
  page,
}) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.visitAll)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.visitTrue)).toBeVisible();
  await expect(page.locator(SEL.visitFalse)).toBeVisible();

  // Select "Visited" — confirm it becomes checked
  await page.locator(SEL.visitTrue).click();
  await expect(page.locator(SEL.visitTrue)).toBeChecked();

  // Return to "All"
  await page.locator(SEL.visitAll).click();
  await expect(page.locator(SEL.visitAll)).toBeChecked();
});

// =============================================================================
// TC-LOC-09  Include Collection Locations checkbox is toggleable
// Source: <input type="checkbox" id="include_collections" ...
//                on:change={(e) => { goto(url...); }}>  // triggers full navigation
// =============================================================================
test('TC-LOC-09: Include Collection Locations checkbox is toggleable', async ({ page }) => {
  await ensureSidebarVisible(page);

  const checkbox = page.locator(SEL.includeCollections);
  await expect(checkbox).toBeVisible({ timeout: 6_000 });

  const before = await checkbox.isChecked();

  // Click — triggers goto() which causes a full page navigation
  await checkbox.click();
  await page.waitForSelector(SEL.pageHeading, { timeout: 10_000 });

  // Reopen sidebar on mobile after navigation
  await ensureSidebarVisible(page);

  const after = await page.locator(SEL.includeCollections).isChecked();
  expect(after).toBe(!before);
});

// =============================================================================
// TC-LOC-10  Location card link navigates to /locations/<id>
// Source: LocationCard renders <a href="/locations/{adventure.id}">
// =============================================================================
test('TC-LOC-10: clicking a location card navigates to its detail page', async ({ page }) => {
  const card = page.locator(SEL.locationCardLink).first();

  if ((await card.count()) === 0) {
    console.log('TC-LOC-10: no location cards found — run TC-LOC-04 first');
    test.skip();
    return;
  }

  await card.click();
  await page.waitForURL('**/locations/**', { timeout: 8_000 });
  expect(page.url()).toMatch(/\/locations\/[a-zA-Z0-9-]+$/);
});

// =============================================================================
// TC-LOC-11  Modal close button (×) dismisses dialog#my_modal_1
// Source: <button class="btn btn-ghost btn-square" on:click={close}>
// =============================================================================
test('TC-LOC-11: modal close (×) button dismisses dialog#my_modal_1', async ({ page }) => {
  await openLocationModal(page);
  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 6_000 });

  await page.locator(SEL.modalClose).first().click();
  await expect(page.locator(SEL.modal)).not.toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-LOC-12  Modal step tabs: Media and Visits tabs disabled until location is saved
// Source: <button ... disabled={step.requires_id && !location.id}>
//         steps[2] (Media) and steps[3] (Visits) both have requires_id: true
// =============================================================================
test('TC-LOC-12: Media and Visits step tabs are disabled before a location is saved', async ({
  page,
}) => {
  await openLocationModal(page);

  // There are 4 step tabs: Quick Start, Details, Media, Visits
  const tabs = page.locator(SEL.stepTabs);
  await expect(tabs).toHaveCount(4, { timeout: 6_000 });

  // Tabs 2 (index 2, Media) and 3 (index 3, Visits) must be disabled
  // before any save occurs (location.id is empty string on mount)
  await expect(tabs.nth(2)).toBeDisabled();
  await expect(tabs.nth(3)).toBeDisabled();

  // Tabs 0 (Quick Start) and 1 (Details) must be enabled
  await expect(tabs.nth(0)).toBeEnabled();
  await expect(tabs.nth(1)).toBeEnabled();
});
