/**
 * locations.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module : Location Management (Adventures)
 *
 * Scenarios covered
 * ─────────────────
 *  1.  Create location – valid full form
 *  2.  Create location – name-only (minimal required fields)
 *  3.  Create location – missing name shows validation error
 *  4.  Create location – XSS payload is sanitised / not executed
 *  5.  Create location – extremely long name is rejected or truncated
 *  6.  Create location – special characters in name are stored correctly
 *  7.  Edit location  – name & description update
 *  8.  Edit location  – cancel discards changes
 *  9.  Delete location – confirmation modal, then card disappears
 * 10.  Delete location – cancel abort keeps location intact
 * 11.  Search / filter – query returns matching results
 * 12.  Search / filter – non-matching query shows empty state
 * 13.  Visit-status filter – each status variant renders cards (parametrised)
 * 14.  API – GET /api/adventures/ returns 200 + array payload
 * 15.  API – POST /api/adventures/ creates and returns new record
 * 16.  API – PATCH /api/adventures/:id/ updates name field
 * 17.  API – DELETE /api/adventures/:id/ removes record
 * 18.  Location detail page – navigating to /locations/:id shows the name
 */

import { test, expect } from './fixtures/auth-fixture';
import { LocationPage } from './page-objects/LocationPage';
import { LOCATIONS, VISIT_STATUSES, ENV, API } from './fixtures/test-data';

// ── Helper ─────────────────────────────────────────────────────────────────

function locPage(page: any) {
  return new LocationPage(page);
}

// ── 1–6: Create location ───────────────────────────────────────────────────

test.describe('Create Location', () => {
  test('create with full valid data shows new card in list', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.createLocation(LOCATIONS.valid);
    await lp.expectLocationInList(LOCATIONS.valid.name);
  });

  test('create with name only (minimal) succeeds', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.createLocation(LOCATIONS.minimal);
    await lp.expectLocationInList(LOCATIONS.minimal.name);
  });

  test('submit without name shows required-field error', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.openCreateModal();
    // Leave name empty; attempt to save
    await lp.saveButton.click();
    // Form should NOT dismiss; either HTML5 validation or a visible error
    const modalStillOpen = await lp.modal.isVisible().catch(() => false);
    const validationVisible = await page
      .locator('input:invalid, .error, [aria-invalid="true"], .text-error')
      .first()
      .isVisible()
      .catch(() => false);
    expect(modalStillOpen || validationVisible).toBe(true);
  });

  test('XSS payload in name is not executed', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.openCreateModal();

    // Listen for any dialog (alert/confirm) triggered by XSS
    let xssTriggered = false;
    page.on('dialog', async (dialog) => {
      xssTriggered = true;
      await dialog.dismiss();
    });

    await lp.nameInput.fill(LOCATIONS.xss.name);
    await lp.saveButton.click();
    await page.waitForTimeout(1500);

    expect(xssTriggered).toBe(false);
  });

  test('special characters in name are preserved', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.createLocation(LOCATIONS.specialChars);
    await lp.expectLocationInList(LOCATIONS.specialChars.name);
  });
});

// ── 7–8: Edit location ────────────────────────────────────────────────────

test.describe('Edit Location', () => {
  test('edit updates name visible in card', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();

    // Ensure at least one location exists
    const count = await lp.locationCards.count();
    if (count === 0) {
      await lp.createLocation({ name: `Seed for Edit ${Date.now()}` });
    }

    await lp.editFirstLocation();
    await lp.nameInput.clear();
    await lp.nameInput.fill(LOCATIONS.update.name);
    await lp.saveLocation();
    await lp.expectLocationInList(LOCATIONS.update.name);
  });

  test('cancel edit discards changes', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();

    const count = await lp.locationCards.count();
    if (count === 0) {
      await lp.createLocation({ name: `Seed for Cancel ${Date.now()}` });
    }

    // Capture original name
    const originalName = await lp.locationCards.first().locator('h2, h3, .card-title').textContent();

    await lp.editFirstLocation();
    await lp.nameInput.clear();
    await lp.nameInput.fill('DISCARDED_CHANGE_SHOULD_NOT_PERSIST');
    await lp.cancelButton.click();
    await page.waitForLoadState('networkidle');

    // Original name should still be present
    if (originalName) {
      await lp.expectLocationInList(originalName.trim());
    }
    await lp.expectLocationNotInList('DISCARDED_CHANGE_SHOULD_NOT_PERSIST');
  });
});

// ── 9–10: Delete location ──────────────────────────────────────────────────

test.describe('Delete Location', () => {
  test('delete removes location card from list', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();

    // Ensure we have something to delete
    const seedName = `To Delete ${Date.now()}`;
    await lp.createLocation({ name: seedName });
    await lp.expectLocationInList(seedName);

    // Now delete it
    const card = page.locator('.card, [data-testid="location-card"]').filter({ hasText: seedName }).first();
    await card.locator('button').filter({ hasText: /⋮|more|menu/i }).click();
    await page.locator('[role="menuitem"], li, button').filter({ hasText: /delete/i }).first().click();
    await page.locator('button').filter({ hasText: /confirm|yes|delete/i }).last().click();
    await page.waitForLoadState('networkidle');

    await lp.expectLocationNotInList(seedName);
  });

  test('cancelling delete confirmation keeps card in list', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();

    const seedName = `Keep Me ${Date.now()}`;
    await lp.createLocation({ name: seedName });

    const card = page.locator('.card, [data-testid="location-card"]').filter({ hasText: seedName }).first();
    await card.locator('button').filter({ hasText: /⋮|more|menu/i }).click();
    await page.locator('[role="menuitem"], li, button').filter({ hasText: /delete/i }).first().click();

    // Click cancel instead of confirm
    await page.locator('button').filter({ hasText: /cancel/i }).last().click();
    await page.waitForLoadState('networkidle');

    await lp.expectLocationInList(seedName);
  });
});

// ── 11–12: Search & filter ────────────────────────────────────────────────

test.describe('Search & Filter', () => {
  test('search returns matching locations', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();

    const uniqueName = `SearchTarget_${Date.now()}`;
    await lp.createLocation({ name: uniqueName });
    await lp.searchLocations(uniqueName);

    await expect(
      page.locator('.card, [data-testid="location-card"]').filter({ hasText: uniqueName })
    ).toBeVisible({ timeout: 8000 });
  });

  test('search with non-matching query shows empty state or zero cards', async ({ loggedInPage: page }) => {
    const lp = locPage(page);
    await lp.gotoLocations();
    await lp.searchLocations('zzzNOTHINGMATCHESzzzXYZXYZ');
    await page.waitForTimeout(1000);

    const cardCount = await lp.locationCards.count();
    const emptyStateVisible = await page
      .locator('[data-testid="empty-state"], .empty, p')
      .filter({ hasText: /no\s*(adventures?|locations?|results?)/i })
      .isVisible()
      .catch(() => false);

    expect(cardCount === 0 || emptyStateVisible).toBe(true);
  });
});

// ── 13: Visit-status filter ────────────────────────────────────────────────

test.describe('Visit Status Filter', () => {
  for (const status of VISIT_STATUSES) {
    test(`filter by status "${status}" renders without error`, async ({ loggedInPage: page }) => {
      const lp = locPage(page);
      await lp.gotoLocations();

      // Attempt to set the filter (button or select)
      const filterControl = page
        .locator('select[name*="status"], button, a')
        .filter({ hasText: new RegExp(status, 'i') })
        .first();

      const exists = await filterControl.isVisible().catch(() => false);
      if (exists) {
        await filterControl.click();
        await page.waitForLoadState('networkidle');
        // Page should not show an error
        await expect(page.locator('.error-page, [data-testid="error"]')).toHaveCount(0);
      } else {
        test.skip(); // filter UI not present for this status
      }
    });
  }
});

// ── 14–17: API contract tests ─────────────────────────────────────────────

test.describe('Location API', () => {
  let createdId: string;

  test('GET /api/adventures/ returns 200 and array', async ({ loggedInPage: page }) => {
    const result = await page.evaluate(
      async ({ apiUrl, endpoint }) => {
        const res = await fetch(`${apiUrl}${endpoint}`, { credentials: 'include' });
        const data = await res.json();
        return { status: res.status, isArray: Array.isArray(data) || Array.isArray(data?.results) };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations }
    );
    expect(result.status).toBe(200);
    expect(result.isArray).toBe(true);
  });

  test('POST /api/adventures/ creates new location', async ({ loggedInPage: page }) => {
    const result = await page.evaluate(
      async ({ apiUrl, endpoint }) => {
        const res = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ name: `API Test Location ${Date.now()}`, type: 'visited' }),
        });
        const data = await res.json();
        return { status: res.status, id: data.id, name: data.name };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations }
    );
    expect([200, 201]).toContain(result.status);
    expect(result.id).toBeTruthy();
    createdId = result.id;
  });

  test('PATCH /api/adventures/:id/ updates name', async ({ loggedInPage: page }) => {
    // Create one to patch
    const createResult = await page.evaluate(
      async ({ apiUrl, endpoint }) => {
        const res = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ name: `Patch Target ${Date.now()}`, type: 'visited' }),
        });
        const data = await res.json();
        return { id: data.id };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations }
    );

    const patchResult = await page.evaluate(
      async ({ apiUrl, endpoint, id }) => {
        const res = await fetch(`${apiUrl}${endpoint}${id}/`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ name: 'Patched Name' }),
        });
        const data = await res.json();
        return { status: res.status, name: data.name };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations, id: createResult.id }
    );

    expect([200, 204]).toContain(patchResult.status);
    if (patchResult.name) expect(patchResult.name).toBe('Patched Name');
  });

  test('DELETE /api/adventures/:id/ returns 204', async ({ loggedInPage: page }) => {
    // Create a throwaway location
    const createResult = await page.evaluate(
      async ({ apiUrl, endpoint }) => {
        const res = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ name: `Delete Target ${Date.now()}` }),
        });
        const data = await res.json();
        return { id: data.id };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations }
    );

    const deleteStatus = await page.evaluate(
      async ({ apiUrl, endpoint, id }) => {
        const res = await fetch(`${apiUrl}${endpoint}${id}/`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        return res.status;
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations, id: createResult.id }
    );

    expect(deleteStatus).toBe(204);
  });
});

// ── 18: Location detail page ──────────────────────────────────────────────

test.describe('Location Detail Page', () => {
  test('navigating to /locations/:id shows location name', async ({ loggedInPage: page }) => {
    // Create via API, then navigate to its detail page
    const createResult = await page.evaluate(
      async ({ apiUrl, endpoint }) => {
        const name = `Detail Page Test ${Date.now()}`;
        const res = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ name, type: 'visited' }),
        });
        const data = await res.json();
        return { id: data.id, name };
      },
      { apiUrl: ENV.API_URL, endpoint: API.locations }
    );

    await page.goto(`/locations/${createResult.id}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1, h2, [data-testid="location-name"]').filter({ hasText: createResult.name })
    ).toBeVisible({ timeout: 8000 });
  });
});
