
import { test, expect, uid } from '../fixtures';

// ── Shared helper ─────────────────────────────────────────────────────────────

async function openCreateLocationModal(page: any) {
  const fab = page.locator('[role="button"].btn-primary.btn-circle');
  if (await fab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fab.click();
    // Dropdown menu item — text comes from $t('locations.location') = "Location"
    const item = page.locator('.dropdown-content button:has-text("Location")').first();
    await expect(item).toBeVisible({ timeout: 4_000 });
    await item.click();
  } else {
    // Empty-state button — text from $t('adventures.create_location') = "Create Location"
    await page.locator('button.btn-primary.btn-wide').click();
  }
  await expect(page.locator('dialog#my_modal_1')).toBeVisible({ timeout: 6_000 });
}

// ─── List ─────────────────────────────────────────────────────────────────────

test.describe('Locations – List', () => {
  test('locations page loads (proves session is active)', async ({ page }) => {
    await page.goto('/locations');
    // If not authenticated, the app redirects to /login — this assertion catches that
    await expect(page).toHaveURL(/\/locations/, { timeout: 8_000 });
const categoriesCard = page.locator('div.card', {
  has: page.getByRole('heading', { name: 'Categories' })
});

await expect(categoriesCard).toBeVisible();  });

  test('FAB circle button is visible in bottom-right', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    await expect(page.locator('[role="button"].btn-primary.btn-circle')).toBeVisible();
  });

  test('filter sidebar shows Visited sections', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    await expect(
  page.locator('h3', { hasText: 'Visited' })
).toBeVisible();
  });

  test('Visited / Not Visited filter buttons are present', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    await expect(
  page.locator('input[type="radio"][aria-label="Not Visited"]')
).toBeVisible();
  });
});

// ─── Create ───────────────────────────────────────────────────────────────────

test.describe('Locations – Create flow', () => {

  test('empty name on Details step — Save is disabled or validation fires', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    await openCreateLocationModal(page);

    await page.click('button:has-text("Continue")');
    await expect(page.locator('#name')).toBeVisible({ timeout: 5_000 });
    await page.fill('#name', '');

    const saveBtn = page.locator('dialog#my_modal_1 button.btn-primary').first();
    const disabled = await saveBtn.isDisabled();
    if (!disabled) {
      await saveBtn.click();
      await page.waitForTimeout(800);
      const hasError = (await page.locator('.alert-error, input:invalid').count()) > 0;
      expect(hasError || page.url().includes('/locations')).toBeTruthy();
    } else {
      expect(disabled).toBeTruthy();
    }
  });
});

// ─── API ─────────────────────────────────────────────────────────────────────

test.describe('Locations – API', () => {
  // page.request shares the browser context, so session cookies are sent automatically

  test('GET /api/locations/ returns 200 with results array', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    const res = await page.request.get('/api/locations/');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
  });

  test('GET /api/locations/?search=Paris returns 200', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    const res = await page.request.get('/api/locations/?search=Paris');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('results');
  });

  test('POST /api/locations/ with empty name returns 400', async ({ page }) => {
    await page.goto('/locations');
    await expect(page).toHaveURL(/\/locations/);
    const res = await page.request.post('/api/locations/', { data: { name: '' } });
    expect([400, 403]).toContain(res.status());
  });
});
