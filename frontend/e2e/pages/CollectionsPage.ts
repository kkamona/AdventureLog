import { type Page } from '@playwright/test';

export class CollectionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/collections');
  }

  async openNewCollectionModal() {
    // The + button to create a new collection
    await this.page.click('button:has(svg), .btn-primary');
    // Wait for modal to appear
    await this.page.waitForSelector('dialog[open], .modal-open, [role="dialog"]', { timeout: 5_000 }).catch(() => {});
  }

  async switchToTab(tab: 'owned' | 'shared' | 'archived' | 'invites') {
    await this.page.click(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`);
  }

  async getCollectionCards() {
    return this.page.locator('.card').all();
  }
}
