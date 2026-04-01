import { type Page, expect } from '@playwright/test';

export class LocationsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/locations');
  }

  /** Opens the "New Location" modal via the + FAB */
  async openNewLocationModal() {
    await this.page.click('button[aria-label="New Location"], button:has(svg[class*="plus"]), a[href*="new"]');
  }

  /** Clicks the first card's action menu */
  async openFirstCardMenu() {
    await this.page.locator('[data-testid="location-card"], .card').first().hover();
    await this.page.locator('[data-testid="location-card"], .card').first().locator('button').last().click();
  }

  async searchFor(query: string) {
    await this.page.fill('input[type="search"], input[placeholder*="earch"]', query);
  }

  async getLocationCards() {
    return this.page.locator('[data-testid="location-card"], .card').all();
  }
}
