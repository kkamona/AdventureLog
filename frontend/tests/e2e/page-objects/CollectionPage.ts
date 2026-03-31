import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CollectionPage extends BasePage {
  // ── List controls ─────────────────────────────────────────────────────────
  readonly createCollectionButton: Locator;
  readonly collectionCards: Locator;

  // ── Collection modal / form ───────────────────────────────────────────────
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly isPublicCheckbox: Locator;
  readonly linkInput: Locator;
  readonly statusSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── Card actions ──────────────────────────────────────────────────────────
  readonly firstCardMenuButton: Locator;
  readonly editMenuItem: Locator;
  readonly deleteMenuItem: Locator;
  readonly confirmDeleteButton: Locator;
  readonly shareMenuItem: Locator;
  readonly archiveMenuItem: Locator;

  // ── Sharing ───────────────────────────────────────────────────────────────
  readonly shareLinkButton: Locator;
  readonly shareUserInput: Locator;
  readonly shareSubmitButton: Locator;

  constructor(page: Page) {
    super(page);

    // List
    this.createCollectionButton = page
      .locator('button, a')
      .filter({ hasText: /new\s*collection|add\s*collection|create\s*collection|\+/i })
      .first();
    this.collectionCards = page.locator('[data-testid="collection-card"], .card').filter({
      has: page.locator('h2, h3, .card-title'),
    });

    // Modal
    this.modal = page.locator('dialog[open], [role="dialog"], .modal-box').first();
    this.nameInput = page.locator('input[name="name"], input[id="name"]').first();
    this.descriptionInput = page.locator(
      'textarea[name="description"], .EasyMDEContainer textarea'
    ).first();
    this.startDateInput = page.locator('input[name="start_date"], input[id="start_date"]').first();
    this.endDateInput = page.locator('input[name="end_date"], input[id="end_date"]').first();
    this.isPublicCheckbox = page.locator('input[type="checkbox"][name="is_public"], input[id="is_public"]').first();
    this.linkInput = page.locator('input[name="link"], input[placeholder*="link" i]').first();
    this.statusSelect = page.locator('select[name="status"]').first();
    this.saveButton = page
      .locator('button[type="submit"], button')
      .filter({ hasText: /save|update|create/i })
      .first();
    this.cancelButton = page.locator('button').filter({ hasText: /cancel/i }).first();

    // Card actions
    this.firstCardMenuButton = this.collectionCards
      .first()
      .locator('button')
      .filter({ hasText: /⋮|more|menu/i });
    this.editMenuItem = page.locator('[role="menuitem"], li, button').filter({ hasText: /edit/i }).first();
    this.deleteMenuItem = page.locator('[role="menuitem"], li, button').filter({ hasText: /delete/i }).first();
    this.confirmDeleteButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).last();
    this.shareMenuItem = page.locator('[role="menuitem"], li, button').filter({ hasText: /share/i }).first();
    this.archiveMenuItem = page
      .locator('[role="menuitem"], li, button')
      .filter({ hasText: /archive/i })
      .first();

    // Sharing
    this.shareLinkButton = page.locator('button').filter({ hasText: /copy\s*link|share\s*link/i }).first();
    this.shareUserInput = page.locator('input[placeholder*="username" i], input[name*="share" i]').first();
    this.shareSubmitButton = page.locator('button').filter({ hasText: /share|invite|add/i }).last();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async gotoCollections() {
    await this.goto('/collections');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoCollection(id: string) {
    await this.goto(`/collections/${id}`);
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.createCollectionButton.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async fillCollectionForm(data: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isPublic?: boolean;
    link?: string;
    status?: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.startDate) await this.startDateInput.fill(data.startDate);
    if (data.endDate) await this.endDateInput.fill(data.endDate);
    if (data.isPublic) {
      const checked = await this.isPublicCheckbox.isChecked();
      if (!checked) await this.isPublicCheckbox.click();
    }
    if (data.link) await this.linkInput.fill(data.link);
    if (data.status) await this.statusSelect.selectOption(data.status);
  }

  async saveCollection() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createCollection(data: Parameters<typeof this.fillCollectionForm>[0]) {
    await this.openCreateModal();
    await this.fillCollectionForm(data);
    await this.saveCollection();
  }

  async deleteFirstCollection() {
    await this.firstCardMenuButton.click();
    await this.deleteMenuItem.click();
    await this.confirmDeleteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async editFirstCollection() {
    await this.firstCardMenuButton.click();
    await this.editMenuItem.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async archiveFirstCollection() {
    await this.firstCardMenuButton.click();
    await this.archiveMenuItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectCollectionInList(name: string) {
    await expect(
      this.page.locator('.card, [data-testid="collection-card"]').filter({ hasText: name })
    ).toBeVisible({ timeout: 8000 });
  }

  async expectCollectionNotInList(name: string) {
    await expect(
      this.page.locator('.card, [data-testid="collection-card"]').filter({ hasText: name })
    ).toHaveCount(0);
  }
}
