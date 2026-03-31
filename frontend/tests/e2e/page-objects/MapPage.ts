import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MapPage extends BasePage {
  // ── Map container ─────────────────────────────────────────────────────────
  readonly mapContainer: Locator;
  readonly mapCanvas: Locator;

  // ── Controls ──────────────────────────────────────────────────────────────
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly fullscreenButton: Locator;
  readonly layerToggle: Locator;

  // ── Markers / clusters ────────────────────────────────────────────────────
  readonly markers: Locator;
  readonly clusterMarkers: Locator;
  readonly markerPopup: Locator;
  readonly popupTitle: Locator;
  readonly popupLink: Locator;

  // ── Basemap selector ──────────────────────────────────────────────────────
  readonly basemapSelector: Locator;

  constructor(page: Page) {
    super(page);

    this.mapContainer = page.locator('.maplibregl-map, .mapboxgl-map, [class*="maplibre"], canvas').first();
    this.mapCanvas = page.locator('canvas.maplibregl-canvas, canvas.mapboxgl-canvas').first();

    this.zoomInButton = page.locator('.maplibregl-ctrl-zoom-in, button[aria-label*="Zoom in"]').first();
    this.zoomOutButton = page.locator('.maplibregl-ctrl-zoom-out, button[aria-label*="Zoom out"]').first();
    this.fullscreenButton = page.locator('.maplibregl-ctrl-fullscreen, button[aria-label*="fullscreen" i]').first();
    this.layerToggle = page.locator('button').filter({ hasText: /layers?|basemap/i }).first();

    this.markers = page.locator('.maplibregl-marker, [class*="marker"]');
    this.clusterMarkers = page.locator('[class*="cluster"]');
    this.markerPopup = page.locator('.maplibregl-popup, .mapboxgl-popup, [class*="popup"]').first();
    this.popupTitle = this.markerPopup.locator('h2, h3, strong, .popup-title').first();
    this.popupLink = this.markerPopup.locator('a').first();

    this.basemapSelector = page.locator('select[name*="basemap"], button').filter({ hasText: /basemap|map\s*style/i }).first();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async gotoMap() {
    await this.goto('/map');
    await this.page.waitForLoadState('networkidle');
    await this.expectMapLoaded();
  }

  async expectMapLoaded() {
    await expect(this.mapContainer).toBeVisible({ timeout: 15_000 });
  }

  async zoomIn(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.zoomInButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async zoomOut(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.zoomOutButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async clickMarker(index = 0) {
    await this.markers.nth(index).click();
  }

  async expectPopupVisible() {
    await expect(this.markerPopup).toBeVisible({ timeout: 5000 });
  }

  async expectMarkersPresent(minCount = 1) {
    await expect(this.markers).toHaveCount(minCount, { timeout: 10_000 });
  }
}
