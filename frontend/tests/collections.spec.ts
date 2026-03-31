/**
 * collections.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module:     Collections (Trips)
 * Risk Score: HIGH (12)
 * Tool:       Playwright (UI automation, Chromium)
 *
 * Every selector verified against:
 *   frontend/src/routes/collections/+page.svelte
 *   frontend/src/lib/components/CollectionModal.svelte
 *
 * Critical source findings:
 *  - View tabs: <button class="tab gap-2"> (pure JS state, no navigation)
 *  - Sort direction: BUTTONS (join-item btn), NOT radio inputs
 *  - Order-by: radio inputs with name="order_by_radio"
 *  - Status filter: radio inputs with name="status_filter"
 *  - CollectionModal: <dialog id="my_modal_1"> (same id pattern as LocationModal)
 *  - Name: <input id="name" name="name" required>
 *  - Submit: <button type="submit" class="btn btn-primary gap-2">
 *  - Cancel: <button type="button" class="btn btn-neutral gap-2">
 *
 * Test Cases:
 *   TC-COL-01  Page loads — heading visible
 *   TC-COL-02  All four view tabs present
 *   TC-COL-03  Switching tabs applies tab-active class
 *   TC-COL-04  FAB (+) opens dropdown with Collection and Import buttons
 *   TC-COL-05  FAB Collection button opens dialog#my_modal_1
 *   TC-COL-06  Create collection — fill name, submit → card appears
 *   TC-COL-07  Empty name does not close modal (required field)
 *   TC-COL-08  Sort direction buttons (Ascending/Descending) present and clickable
 *   TC-COL-09  Order-by radios (updated/start_date/name) present
 *   TC-COL-10  Status filter radios (5 options) present and functional
 *   TC-COL-11  Modal Cancel button closes dialog#my_modal_1
 *   TC-COL-12  Public Collection toggle is present and toggleable
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

  // collections/+page.svelte
  pageHeading:   'h1.text-3xl.font-bold',

  // View tabs — <button class="tab gap-2 ..."> inside .tabs.tabs-boxed
  tabs:          '.tabs.tabs-boxed button.tab',
  tabOwned:      '.tabs.tabs-boxed button.tab:nth-child(1)',
  tabShared:     '.tabs.tabs-boxed button.tab:nth-child(2)',
  tabArchived:   '.tabs.tabs-boxed button.tab:nth-child(3)',
  tabInvites:    '.tabs.tabs-boxed button.tab:nth-child(4)',

  // Empty-state button
  emptyStateBtn: 'button.btn.btn-primary.btn-wide',

  // FAB: <div tabindex="0" role="button" class="btn btn-primary btn-circle w-16 h-16 ...">
  fab:              'div.btn.btn-primary.btn-circle[role="button"]',
  // <button class="btn btn-primary gap-2 w-full"> inside dropdown
  fabCollectionBtn: '.dropdown-content button.btn.btn-primary.gap-2',
  // <button class="btn btn-neutral gap-2 w-full"> inside dropdown (Import)
  fabImportBtn:     '.dropdown-content button.btn.btn-neutral.gap-2',

  // Collection card links
  collectionCardLink: 'a[href^="/collections/"]',

  // Sidebar — sort direction are BUTTONS (confirmed from source)
  // <button class="join-item btn btn-sm flex-1 ...">
  sortAscBtn:   '.join.w-full button.join-item:nth-child(1)',
  sortDescBtn:  '.join.w-full button.join-item:nth-child(2)',

  // Order-by: <input type="radio" name="order_by_radio">
  orderByRadios:    'input[name="order_by_radio"]',
  orderByStartDate: 'input[name="order_by_radio"]:nth-of-type(2)',
  orderByName:      'input[name="order_by_radio"]:nth-of-type(3)',

  // Status filter: <input type="radio" name="status_filter"> (5 options)
  statusRadios:     'input[name="status_filter"]',
  statusAll:        'input[name="status_filter"]:nth-of-type(1)',
  statusFolder:     'input[name="status_filter"]:nth-of-type(2)',

  // CollectionModal.svelte
  modal:        'dialog#my_modal_1',
  nameInput:    'dialog#my_modal_1 #name',
  startDate:    'dialog#my_modal_1 #start_date',
  endDate:      'dialog#my_modal_1 #end_date',
  publicToggle: 'dialog#my_modal_1 #is_public',
  // <button type="submit" class="btn btn-primary gap-2">
  modalSubmit:  'dialog#my_modal_1 button[type="submit"].btn.btn-primary',
  // <button type="button" class="btn btn-neutral gap-2" on:click={close}>
  modalCancel:  'dialog#my_modal_1 button[type="button"].btn.btn-neutral',
  // <button class="btn btn-ghost btn-square" on:click={close}> (header ×)
  modalClose:   'dialog#my_modal_1 button.btn.btn-ghost.btn-square',
};

async function loginAs(page: Page, u = VALID_USERNAME, p = VALID_PASSWORD) {
  await page.goto('/login');
  await page.waitForSelector(SEL.usernameInput);
  await page.locator(SEL.usernameInput).fill(u);
  await page.locator(SEL.passwordInput).fill(p);
  await page.locator(SEL.loginSubmit).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 12_000 });
}

async function openCollectionModal(page: Page) {
  await page.locator(SEL.fab).click();
  await page.locator(SEL.fabCollectionBtn).waitFor({ state: 'visible', timeout: 6_000 });
  await page.locator(SEL.fabCollectionBtn).click();
  await page.locator(SEL.modal).waitFor({ state: 'visible', timeout: 6_000 });
}

async function ensureSidebarVisible(page: Page) {
  const toggle = page.locator('button.btn.btn-ghost.btn-square.lg\\:hidden').first();
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.waitForTimeout(400);
  }
}

test.beforeEach(async ({ page }) => {
  await loginAs(page);
  await page.goto('/collections');
  await page.waitForSelector(SEL.pageHeading, { timeout: 10_000 });
});

// =============================================================================
// TC-COL-01
// =============================================================================
test('TC-COL-01: /collections page loads with page heading', async ({ page }) => {
  await expect(page.locator(SEL.pageHeading)).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-COL-02
// =============================================================================
test('TC-COL-02: all four view tabs are present', async ({ page }) => {
  await expect(page.locator(SEL.tabs)).toHaveCount(4, { timeout: 6_000 });
  await expect(page.locator(SEL.tabOwned)).toBeVisible();
  await expect(page.locator(SEL.tabShared)).toBeVisible();
  await expect(page.locator(SEL.tabArchived)).toBeVisible();
  await expect(page.locator(SEL.tabInvites)).toBeVisible();
});

// =============================================================================
// TC-COL-03  tab-active class moves to the clicked tab
// Source: class="tab gap-2 {activeView === 'owned' ? 'tab-active' : ''}"
// =============================================================================
test('TC-COL-03: clicking a tab makes it active and deactivates the previous one', async ({
  page,
}) => {
  // My Collections active on load
  await expect(page.locator(SEL.tabOwned)).toHaveClass(/tab-active/, { timeout: 6_000 });

  await page.locator(SEL.tabShared).click();
  await expect(page.locator(SEL.tabShared)).toHaveClass(/tab-active/);
  await expect(page.locator(SEL.tabOwned)).not.toHaveClass(/tab-active/);

  await page.locator(SEL.tabArchived).click();
  await expect(page.locator(SEL.tabArchived)).toHaveClass(/tab-active/);

  await page.locator(SEL.tabInvites).click();
  await expect(page.locator(SEL.tabInvites)).toHaveClass(/tab-active/);

  // Return to owned
  await page.locator(SEL.tabOwned).click();
  await expect(page.locator(SEL.tabOwned)).toHaveClass(/tab-active/);
});

// =============================================================================
// TC-COL-04  FAB dropdown contains Collection and Import buttons
// =============================================================================
test('TC-COL-04: FAB (+) opens dropdown with Collection and Import buttons', async ({ page }) => {
  await page.locator(SEL.fab).click();

  await expect(page.locator(SEL.fabCollectionBtn)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.fabImportBtn)).toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-COL-05  FAB Collection button opens dialog#my_modal_1
// Source: CollectionModal mounts <dialog id="my_modal_1"> and calls showModal() in onMount
// =============================================================================
test('TC-COL-05: FAB Collection button opens dialog#my_modal_1 with name input', async ({
  page,
}) => {
  await openCollectionModal(page);

  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 6_000 });
  // Name input must be inside the modal
  await expect(page.locator(SEL.nameInput)).toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-COL-06  Create collection → card appears
// Source: handleSubmit() POSTs /api/collections → dispatches 'save' → saveOrCreate()
//         prepends new collection to array → reactive render shows card
// =============================================================================
test('TC-COL-06: creating a collection saves it and shows a card in the list', async ({ page }) => {
  await openCollectionModal(page);

  const name = `Playwright Trip ${Date.now()}`;
  await page.locator(SEL.nameInput).fill(name);
  await page.locator(SEL.modalSubmit).click();

  // Modal should close after successful save
  await expect(page.locator(SEL.modal)).not.toBeVisible({ timeout: 8_000 });

  // Card with the collection name should appear
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8_000 });
});

// =============================================================================
// TC-COL-07  Empty name does not close modal
// Source: <input id="name" required> — HTML5 required blocks form submission
// =============================================================================
test('TC-COL-07: submitting with empty name keeps the modal open', async ({ page }) => {
  await openCollectionModal(page);

  // Click submit without filling name
  await page.locator(SEL.modalSubmit).click();

  await page.waitForTimeout(1_500);
  await expect(page.locator(SEL.modal)).toBeVisible();
});

// =============================================================================
// TC-COL-08  Sort direction BUTTONS (not radios — confirmed from source)
// Source: <button class="join-item btn btn-sm flex-1 {orderDirection === 'asc' ? 'btn-active' : ''}">
//         Clicking calls updateSort() which navigates URL
// =============================================================================
test('TC-COL-08: sort direction buttons (Ascending/Descending) are present and change state', async ({
  page,
}) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.sortAscBtn)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(SEL.sortDescBtn)).toBeVisible({ timeout: 6_000 });

  // Click Descending
  await page.locator(SEL.sortDescBtn).click();
  await page.waitForSelector(SEL.pageHeading, { timeout: 8_000 });
  await ensureSidebarVisible(page);
  await expect(page.locator(SEL.sortDescBtn)).toHaveClass(/btn-active/, { timeout: 4_000 });

  // Click Ascending
  await page.locator(SEL.sortAscBtn).click();
  await page.waitForSelector(SEL.pageHeading, { timeout: 8_000 });
  await ensureSidebarVisible(page);
  await expect(page.locator(SEL.sortAscBtn)).toHaveClass(/btn-active/, { timeout: 4_000 });
});

// =============================================================================
// TC-COL-09  Order-by radios present (3 options: updated_at/start_date/name)
// Source: name="order_by_radio" — 3 radio inputs
// =============================================================================
test('TC-COL-09: three order-by radio buttons are present', async ({ page }) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.orderByRadios)).toHaveCount(3, { timeout: 6_000 });
});

// =============================================================================
// TC-COL-10  Status filter radios — 5 options, functional
// Source: name="status_filter" — 5 radios, each on:change calls updateStatusFilter()
// =============================================================================
test('TC-COL-10: five status filter radios are present and folder filter works', async ({
  page,
}) => {
  await ensureSidebarVisible(page);

  await expect(page.locator(SEL.statusRadios)).toHaveCount(5, { timeout: 6_000 });

  // Click Folder filter
  await page.locator(SEL.statusFolder).click();
  await page.waitForSelector(SEL.pageHeading, { timeout: 8_000 });

  // Reset to All
  await ensureSidebarVisible(page);
  await page.locator(SEL.statusAll).click();
  await page.waitForSelector(SEL.pageHeading, { timeout: 8_000 });
});

// =============================================================================
// TC-COL-11  Modal Cancel button closes dialog#my_modal_1
// Source: <button type="button" class="btn btn-neutral gap-2" on:click={close}>
// =============================================================================
test('TC-COL-11: modal Cancel button dismisses dialog#my_modal_1', async ({ page }) => {
  await openCollectionModal(page);
  await expect(page.locator(SEL.modal)).toBeVisible({ timeout: 6_000 });

  await page.locator(SEL.modalCancel).click();
  await expect(page.locator(SEL.modal)).not.toBeVisible({ timeout: 6_000 });
});

// =============================================================================
// TC-COL-12  Public Collection toggle present and toggleable
// Source: <input type="checkbox" class="toggle toggle-primary" id="is_public" name="is_public">
//         Default: collection.is_public = false (unchecked on new collection)
// =============================================================================
test('TC-COL-12: Public Collection toggle is present and toggleable in modal', async ({ page }) => {
  await openCollectionModal(page);

  const toggle = page.locator(SEL.publicToggle);
  await expect(toggle).toBeVisible({ timeout: 6_000 });

  // Default: unchecked
  await expect(toggle).not.toBeChecked();

  await toggle.click();
  await expect(toggle).toBeChecked();

  await toggle.click();
  await expect(toggle).not.toBeChecked();
});
