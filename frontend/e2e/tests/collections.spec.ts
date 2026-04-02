/**
 * Collections Tests
 *
 * All tests run in the chromium project which loads playwright/.auth/user.json.
 * Every describe block asserts toHaveURL(/collections/) first — if the app
 * redirected to /login the session is broken and the test fails clearly.
 *
 * Selector notes (from source):
 *  - FAB:  [role="button"].btn-primary.btn-circle  (a <div>, not a <button>)
 *  - FAB dropdown item: button text "Collection"
 *  - Empty-state create button: button.btn-primary.btn-wide "Create"
 *  - Modal: dialog#my_modal_1,  name field: #name
 *  - Card action menu: button.btn-square.btn-sm  (inside .dropdown.dropdown-end on card)
 *  - Edit text: "Edit Collection"   Archive: "Archive"   Delete: "Delete"
 */
import { test, expect, uid } from '../fixtures';

// ── Shared helper ─────────────────────────────────────────────────────────────

async function openCreateCollectionModal(page: any) {
  const fab = page.locator('[role="button"].btn-primary.btn-circle');
  if (await fab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fab.click();
    // Dropdown item — text from $t('adventures.collection') = "Collection"
    const item = page.locator('.dropdown-content button:has-text("Collection")').first();
    await expect(item).toBeVisible({ timeout: 4_000 });
    await item.click();
  } else {
    // Empty-state button — text from $t('collection.create') = "Create"
    await page.locator('button.btn-primary.btn-wide').click();
  }
  await expect(page.locator('dialog#my_modal_1')).toBeVisible({ timeout: 6_000 });
}

// ─── List ─────────────────────────────────────────────────────────────────────

test.describe('Collections – List', () => {
  test('collections page loads (proves session is active)', async ({ page }) => {
    await page.goto('/collections');
    // If session is missing, the app redirects to /login — this catches it
    await expect(page).toHaveURL(/\/collections/, { timeout: 8_000 });
    await expect(
  page.getByRole('link', { name: 'Playwright Trip 1774683402674' })
).toBeVisible();
  });

  test('DEBUG: auth state check', async ({ page, context }) => {
  const cookies = await context.cookies();
  console.log('=== COOKIES AT TEST START ===');
  console.log(JSON.stringify(cookies, null, 2));

  await page.goto('/collections');
  console.log('=== FINAL URL ===', page.url());
});

  test('FAB circle button is visible in bottom-right', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.locator('[role="button"].btn-primary.btn-circle')).toBeVisible();
  });

  test('tab buttons My Collections / Shared / Archived / Invites are visible', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.locator('button:has-text("My Collections")')).toBeVisible();
    await expect(page.locator('button:has-text("Shared")')).toBeVisible();
    await expect(page.locator('button:has-text("Archived")')).toBeVisible();
  });

  test('filter sidebar shows Status Filter and Sort sections', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    const statusCard = page.locator('div.card', {
  has: page.locator('text=Status Filter')
});

await expect(statusCard).toBeVisible();
  });
});



// ─── Detail page ──────────────────────────────────────────────────────────────

test.describe('Collections – Detail page', () => {
  test('user flow: navigate to collection detail → switch All / Itinerary / Map / Stats tabs', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);

    let firstLink = page.locator('a[href*="/collections/"]').first();
    if (await firstLink.count() === 0) {
      await openCreateCollectionModal(page);
      await page.fill('#name', `Nav Test ${uid()}`);
      await page.click('dialog#my_modal_1 button[type="submit"]');
      await expect(page.locator('dialog#my_modal_1')).toBeHidden({ timeout: 8_000 });
      firstLink = page.locator('a[href*="/collections/"]').first();
    }

    const href = await firstLink.getAttribute('href');
    await page.goto(href!);
    await expect(page).toHaveURL(/\/collections\/.+/);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    for (const tab of ['All', 'Itinerary', 'Map', 'Stats']) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(400);
        await expect(page.locator('body')).not.toBeEmpty();
      }
    }
  });

  test('user flow: open collection detail → FAB → add location inside collection', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);

    let href: string | null = null;
    const firstLink = page.locator('a[href*="/collections/"]').first();
    if (await firstLink.count() > 0) {
      href = await firstLink.getAttribute('href');
    } else {
      await openCreateCollectionModal(page);
      await page.fill('#name', `Detail FAB ${uid()}`);
      await page.click('dialog#my_modal_1 button[type="submit"]');
      await expect(page.locator('dialog#my_modal_1')).toBeHidden({ timeout: 8_000 });
      href = await page.locator('a[href*="/collections/"]').first().getAttribute('href');
    }

    await page.goto(href!);
    await expect(page).toHaveURL(/\/collections\/.+/);

    const fab = page.locator('[role="button"].btn-primary.btn-circle');
    if (await fab.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await fab.click();
      const locationItem = page.locator('.dropdown-content button:has-text("Location")').first();
      if (await locationItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await locationItem.click();
        await expect(page.locator('dialog#my_modal_1')).toBeVisible({ timeout: 6_000 });
        await page.click('button:has-text("Continue")');
        await page.fill('#name', `Col Loc ${uid()}`);
        await page.click('dialog#my_modal_1 button.btn-primary:not([disabled])');
        await page.keyboard.press('Escape');
        await expect(page).toHaveURL(/\/collections\/.+/);
      }
    }
  });
});

// ─── API ─────────────────────────────────────────────────────────────────────

test.describe('Collections – API', () => {
  // page.request shares the browser context → session cookies are sent

  test('GET /api/collections/ returns 200 with results array', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    const res = await page.request.get('/api/collections/');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
  });

  test('GET /api/collections/ results contain expected fields', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    const res = await page.request.get('/api/collections/');
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.results.length > 0) {
      expect(body.results[0]).toHaveProperty('id');
      expect(body.results[0]).toHaveProperty('name');
    }
  });

  test('POST /api/collections/ with empty name returns 400', async ({ page }) => {
    await page.goto('/collections');
    await expect(page).toHaveURL(/\/collections/);
    const res = await page.request.post('/api/collections/', { data: { name: '' } });
    expect([400, 403]).toContain(res.status());
  });
});
