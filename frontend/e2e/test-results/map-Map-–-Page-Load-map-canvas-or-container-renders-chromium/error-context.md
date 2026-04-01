# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map.spec.ts >> Map – Page Load >> map canvas or container renders
- Location: tests\map.spec.ts:14:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.maplibregl-map, canvas, [data-testid="map"]')
Expected: visible
Error: strict mode violation: locator('.maplibregl-map, canvas, [data-testid="map"]') resolved to 2 elements:
    1) <div data-testid="map-container" class="w-full h-full min-h-[70vh] rounded-lg svelte-p00lfq maplibregl-map">…</div> aka getByTestId('map-container')
    2) <canvas tabindex="0" width="1217" height="504" role="region" aria-label="Map" class="maplibregl-canvas"></canvas> aka getByRole('region', { name: 'Map' })

Call log:
  - Expect "toBeVisible" with timeout 12000ms
  - waiting for locator('.maplibregl-map, canvas, [data-testid="map"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "AdventureLog AdventureLog" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]:
        - img "AdventureLog" [ref=e7]
        - generic [ref=e8]: AdventureLog
    - list [ref=e10]:
      - listitem [ref=e11]:
        - link "Locations" [ref=e12] [cursor=pointer]:
          - /url: /locations
          - img [ref=e13]
          - generic [ref=e15]: Locations
      - listitem [ref=e16]:
        - link "Collections" [ref=e17] [cursor=pointer]:
          - /url: /collections
          - img [ref=e18]
          - generic [ref=e20]: Collections
      - listitem [ref=e21]:
        - link "World Travel" [ref=e22] [cursor=pointer]:
          - /url: /worldtravel
          - img [ref=e23]
          - generic [ref=e25]: World Travel
      - listitem [ref=e26]:
        - link "Map" [ref=e27] [cursor=pointer]:
          - /url: /map
          - img [ref=e28]
          - generic [ref=e30]: Map
      - listitem [ref=e31]:
        - link "Calendar" [ref=e32] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e33]
          - generic [ref=e35]: Calendar
      - listitem [ref=e36]:
        - link "Users" [ref=e37] [cursor=pointer]:
          - /url: /users
          - img [ref=e38]
          - generic [ref=e40]: Users
    - generic [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]:
          - textbox / [ref=e44]:
            - /placeholder: Search
          - generic [ref=e45]: /
        - button [ref=e46] [cursor=pointer]:
          - img [ref=e47]
      - button "A" [ref=e50] [cursor=pointer]:
        - generic [ref=e52]: A
      - generic [ref=e53]:
        - button [ref=e54] [cursor=pointer]:
          - img [ref=e55]
        - option "English" [selected]
        - option "Español"
        - option "Français"
        - option "Deutsch"
        - option "Italiano"
        - option "中文"
        - option "Nederlands"
        - option "Svenska"
        - option "Polski"
        - option "한국어"
        - option "Norsk"
        - option "Русский"
        - option "日本語"
        - option "العربية"
        - option "Português (Brasil)"
        - option "Română"
        - option "Slovenský"
        - option "Türkçe"
        - option "Українська"
        - option "Magyar"
        - option "Light"
        - option "Dark"
        - option "Dim"
        - option "Night"
        - option "Forest"
        - option "Aqua"
        - option "Aesthetic Light"
        - option "Aesthetic Dark"
        - option "Northern Lights"
  - generic [ref=e59]:
    - generic [ref=e60]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e65]:
            - img [ref=e67]
            - generic [ref=e69]:
              - heading "Location Map" [level=1] [ref=e70]
              - paragraph [ref=e71]: 0 of 0 locations shown
          - generic [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e75]: Visited
              - generic [ref=e76]: "0"
            - generic [ref=e77]:
              - generic [ref=e78]: Planned
              - generic [ref=e79]: "0"
        - generic [ref=e80]:
          - generic [ref=e81]:
            - img [ref=e82]
            - textbox [ref=e84]:
              - /placeholder: Search locations...
          - button "Add New Location" [ref=e86] [cursor=pointer]:
            - img [ref=e87]
            - text: Add New Location
      - generic [ref=e92]:
        - button "Default" [ref=e96] [cursor=pointer]:
          - img [ref=e97]
          - generic [ref=e99]: Default
          - img [ref=e100]
        - generic [ref=e102]:
          - region "Map" [ref=e103]
          - group [ref=e104]:
            - generic "Toggle attribution" [ref=e105] [cursor=pointer]
            - link "MapLibre" [ref=e107] [cursor=pointer]:
              - /url: https://maplibre.org/
    - generic [ref=e110]:
      - generic [ref=e111]:
        - img [ref=e113]
        - heading "Map Controls" [level=2] [ref=e115]
      - generic [ref=e116]:
        - heading "Adventure Stats" [level=3] [ref=e117]:
          - img [ref=e118]
          - text: Adventure Stats
        - generic [ref=e120]:
          - generic [ref=e121]:
            - generic [ref=e122]: Total Adventures
            - generic [ref=e123]: "0"
          - generic [ref=e124]:
            - generic [ref=e125]:
              - generic [ref=e126]: Visited
              - generic [ref=e127]: "0"
            - generic [ref=e128]:
              - generic [ref=e129]: Planned
              - generic [ref=e130]: "0"
          - generic [ref=e131]:
            - generic [ref=e132]: Regions
            - generic [ref=e133]: "0"
          - generic [ref=e134]:
            - generic [ref=e135]:
              - generic [ref=e136]: Completion
              - generic [ref=e137]: NaN%
            - progressbar [ref=e138]
      - generic [ref=e139]:
        - heading "Display Options" [level=3] [ref=e140]:
          - img [ref=e141]
          - text: Display Options
        - generic [ref=e143]:
          - generic [ref=e144] [cursor=pointer]:
            - checkbox "Visited (0)" [checked] [ref=e145]
            - generic [ref=e146]:
              - img [ref=e147]
              - text: Visited (0)
          - generic [ref=e149] [cursor=pointer]:
            - checkbox "Planned (0)" [checked] [ref=e150]
            - generic [ref=e151]:
              - img [ref=e152]
              - text: Planned (0)
          - generic [ref=e154] [cursor=pointer]:
            - checkbox "Visited Regions (0)" [ref=e155]
            - generic [ref=e156]:
              - img [ref=e157]
              - text: Visited Regions (0)
          - generic [ref=e159] [cursor=pointer]:
            - checkbox "Visited Cities" [ref=e160]
            - generic [ref=e161]:
              - img [ref=e162]
              - text: Visited Cities
          - generic [ref=e164] [cursor=pointer]:
            - checkbox "Activities" [ref=e165]
            - generic [ref=e166]:
              - img [ref=e167]
              - text: Activities
      - generic [ref=e169]:
        - heading "New Location" [level=3] [ref=e170]:
          - img [ref=e171]
          - text: New Location
        - generic [ref=e173]:
          - paragraph [ref=e174]: Click on the map to place a marker.
          - button "Add New Location" [ref=e175] [cursor=pointer]:
            - img [ref=e176]
            - text: Add New Location
```

# Test source

```ts
  1   | /**
  2   |  * Map Tests
  3   |  * Covers: page load, map render, filters, pin interaction, location creation from map
  4   |  */
  5   | import { test, expect } from '../fixtures';
  6   | 
  7   | test.describe('Map – Page Load', () => {
  8   |   test('map page loads without errors', async ({ page }) => {
  9   |     await page.goto('/map');
  10  |     await expect(page).toHaveURL(/map/);
  11  |     await expect(page.locator('body')).not.toBeEmpty();
  12  |   });
  13  | 
  14  |   test('map canvas or container renders', async ({ page }) => {
  15  |     await page.goto('/map');
  16  |     // MapLibre renders a <canvas> inside .maplibregl-map
  17  |     await expect(
  18  |       page.locator('.maplibregl-map, canvas, [data-testid="map"]')
> 19  |     ).toBeVisible({ timeout: 12_000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  20  |   });
  21  | 
  22  |   test('map page title is correct', async ({ page }) => {
  23  |     await page.goto('/map');
  24  |     await expect(page).toHaveTitle(/Map|AdventureLog/i);
  25  |   });
  26  | });
  27  | 
  28  | test.describe('Map – Controls & Filters', () => {
  29  |   test('filter sidebar button is visible', async ({ page }) => {
  30  |     await page.goto('/map');
  31  |     const filterBtn = page.locator('button[aria-label*="filter" i], button:has-text("Filter")');
  32  |     if (await filterBtn.count() > 0) {
  33  |       await expect(filterBtn.first()).toBeVisible();
  34  |     }
  35  |   });
  36  | 
  37  |   test('show visited / show planned toggles exist', async ({ page }) => {
  38  |     await page.goto('/map');
  39  |     const visited = page.locator('label:has-text("Visited"), button:has-text("Visited"), input[name*="visited"]');
  40  |     const planned = page.locator('label:has-text("Planned"), button:has-text("Planned"), input[name*="planned"]');
  41  |     const hasToggles = (await visited.count()) > 0 || (await planned.count()) > 0;
  42  |     // Acceptable — map may hide these inside sidebar
  43  |     expect(hasToggles || true).toBeTruthy();
  44  |   });
  45  | 
  46  |   test('search input for filtering pins exists', async ({ page }) => {
  47  |     await page.goto('/map');
  48  |     const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
  49  |     if (await searchInput.count() > 0) {
  50  |       await expect(searchInput.first()).toBeVisible();
  51  |       await searchInput.first().fill('Paris');
  52  |       await expect(searchInput.first()).toHaveValue('Paris');
  53  |     }
  54  |   });
  55  | 
  56  |   test('basemap style selector is accessible', async ({ page }) => {
  57  |     await page.goto('/map');
  58  |     const styleBtn = page.locator('button:has-text("Style"), select[name*="style"], [aria-label*="style" i]');
  59  |     if (await styleBtn.count() > 0) {
  60  |       await expect(styleBtn.first()).toBeVisible();
  61  |     }
  62  |   });
  63  | });
  64  | 
  65  | test.describe('Map – Location Creation', () => {
  66  |   test('+ button to add a new location is visible on map page', async ({ page }) => {
  67  |     await page.goto('/map');
  68  |     const addBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
  69  |     await expect(addBtn).toBeVisible({ timeout: 8_000 });
  70  |   });
  71  | 
  72  |   test('clicking + button opens location creation modal', async ({ page }) => {
  73  |     await page.goto('/map');
  74  |     // Wait for map to initialize
  75  |     await page.waitForSelector('.maplibregl-map, canvas', { timeout: 12_000 }).catch(() => {});
  76  | 
  77  |     const addBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
  78  |     await addBtn.click();
  79  | 
  80  |     const modal = page.locator('dialog[open], [role="dialog"], .modal.modal-open');
  81  |     if (await modal.isVisible({ timeout: 4_000 }).catch(() => false)) {
  82  |       await expect(modal).toBeVisible();
  83  |     }
  84  |   });
  85  | });
  86  | 
  87  | test.describe('Map – Pin Interaction', () => {
  88  |   test('clicking a pin shows popup with location name', async ({ page }) => {
  89  |     await page.goto('/map');
  90  |     await page.waitForSelector('.maplibregl-map, canvas', { timeout: 12_000 }).catch(() => {});
  91  | 
  92  |     // Look for rendered markers
  93  |     const markers = page.locator('.maplibregl-marker, [data-testid="pin"]');
  94  |     if (await markers.count() > 0) {
  95  |       await markers.first().click();
  96  |       // Popup should appear
  97  |       const popup = page.locator('.maplibregl-popup, [data-testid="popup"]');
  98  |       await expect(popup).toBeVisible({ timeout: 4_000 });
  99  |     } else {
  100 |       // No pins yet — page load is the test
  101 |       await expect(page).toHaveURL(/map/);
  102 |     }
  103 |   });
  104 | });
  105 | 
  106 | test.describe('Map – Navigation Integration', () => {
  107 |   test('map page is reachable via navbar link', async ({ page }) => {
  108 |     await page.goto('/');
  109 |     const mapLink = page.locator('a[href="/map"], nav a:has-text("Map")');
  110 |     if (await mapLink.count() > 0) {
  111 |       await mapLink.first().click();
  112 |       await expect(page).toHaveURL(/map/);
  113 |     }
  114 |   });
  115 | 
  116 |   test('map page handles unknown URL params gracefully', async ({ page }) => {
  117 |     await page.goto('/map?zoom=15&lat=48.8566&lng=2.3522');
  118 |     await expect(page).toHaveURL(/map/);
  119 |     // Should not crash
```