import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LocationPage extends BasePage {
  // ── List / header controls ────────────────────────────────────────────────
  readonly createLocationButton: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  readonly sortDropdown: Locator;

  // ── Location modal / form ─────────────────────────────────────────────────
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly visitStatusSelect: Locator;
  readonly ratingInput: Locator;
  readonly latInput: Locator;
  readonly lngInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  // ── Location cards ────────────────────────────────────────────────────────
  readonly locationCards: Locator;
  readonly firstCardMenu: Locator;
  readonly deleteOption: Locator;
  readonly editOption: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    // List controls
    this.createLocationButton = page
      .locator('button, a')
      .filter({ hasText: /new\s*location|add\s*location|create\s*location|\+\s*location/i })
      .first();
    this.searchInput = page.locator(
      'input[placeholder*="search" i], input[type="search"], input[name="search"]'
    ).first();
    this.filterDropdown = page.locator('button, select').filter({ hasText: /filter|status/i }).first();
    this.sortDropdown = page.locator('button, select').filter({ hasText: /sort/i }).first();

    // Modal / form
    this.modal = page.locator('dialog[open], [role="dialog"], .modal-box').first();
    this.nameInput = page.locator(
      'input[name="name"], input[placeholder*="name" i], input[id="name"]'
    ).first();
    this.descriptionInput = page.locator(
      'textarea[name="description"], textarea[placeholder*="description" i], .EasyMDEContainer textarea'
    ).first();
    this.dateInput = page.locator('input[type="date"], input[name="date"]').first();
    this.visitStatusSelect = page.locator('select[name="visit_status"], select[name="type"]').first();
    this.ratingInput = page.locator('input[name="rating"], input[type="number"][name*="rating"]').first();
    this.latInput = page.locator('input[name="latitude"], input[name="lat"]').first();
    this.lngInput = page.locator('input[name="longitude"], input[name="lng"]').first();
    this.saveButton = page.locator('button[type="submit"], button').filter({ hasText: /save|update|create/i }).first();
    this.cancelButton = page.locator('button').filter({ hasText: /cancel/i }).first();
    this.closeButton = page.locator('[aria-label="close"], button').filter({ hasText: /close|×|✕/i }).first();

    // Cards
    this.locationCards = page.locator('[data-testid="location-card"], .card').filter({ has: page.locator('.card-title, h2, h3') });
    this.firstCardMenu = this.locationCards.first().locator('button[aria-label*="menu"], button').filter({ hasText: /⋮|\.\.\.|\.\.\.|more/i });
    this.editOption = page.locator('[role="menuitem"], li, button').filter({ hasText: /edit/i }).first();
    this.deleteOption = page.locator('[role="menuitem"], li, button').filter({ hasText: /delete/i }).first();
    this.confirmDeleteButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).last();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async gotoLocations() {
    await this.goto('/locations');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.createLocationButton.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async fillLocationForm(data: {
    name: string;
    description?: string;
    date?: string;
    visitStatus?: string;
    rating?: string;
    lat?: string;
    lng?: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.date) await this.dateInput.fill(data.date);
    if (data.visitStatus) await this.visitStatusSelect.selectOption(data.visitStatus);
    if (data.rating) await this.ratingInput.fill(data.rating);
    if (data.lat) await this.latInput.fill(data.lat);
    if (data.lng) await this.lngInput.fill(data.lng);
  }

  async saveLocation() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createLocation(data: Parameters<typeof this.fillLocationForm>[0]) {
    await this.openCreateModal();
    await this.fillLocationForm(data);
    await this.saveLocation();
  }

  async searchLocations(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstCardMenu() {
    await this.firstCardMenu.click();
  }

  async deleteFirstLocation() {
    await this.openFirstCardMenu();
    await this.deleteOption.click();
    await this.confirmDeleteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async editFirstLocation() {
    await this.openFirstCardMenu();
    await this.editOption.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async expectLocationInList(name: string) {
    await expect(
      this.page.locator('.card, [data-testid="location-card"]').filter({ hasText: name })
    ).toBeVisible({ timeout: 8000 });
  }

  async expectLocationNotInList(name: string) {
    await expect(
      this.page.locator('.card, [data-testid="location-card"]').filter({ hasText: name })
    ).toHaveCount(0, { timeout: 8000 });
  }
}
