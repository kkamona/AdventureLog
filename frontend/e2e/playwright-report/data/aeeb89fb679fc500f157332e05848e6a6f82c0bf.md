# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map.spec.ts >> Map – API >> GET /api/adventures/?simplified=true returns pin data
- Location: tests\map.spec.ts:125:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [200, 400]
```

# Test source

```ts
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
  120 |     await expect(page.locator('body')).not.toBeEmpty();
  121 |   });
  122 | });
  123 | 
  124 | test.describe('Map – API', () => {
  125 |   test('GET /api/adventures/?simplified=true returns pin data', async ({ request }) => {
  126 |     const res = await request.get('/api/adventures/?simplified=true');
> 127 |     expect([200, 400]).toContain(res.status()); // simplified may not be a valid param
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  128 |     if (res.status() === 200) {
  129 |       const body = await res.json();
  130 |       expect(typeof body).toBe('object');
  131 |     }
  132 |   });
  133 | 
  134 |   test('GET /api/adventures/ returns adventures with location data', async ({ request }) => {
  135 |     const res = await request.get('/api/adventures/');
  136 |     expect(res.status()).toBe(200);
  137 |     const body = await res.json();
  138 |     expect(body).toHaveProperty('results');
  139 |     expect(Array.isArray(body.results)).toBe(true);
  140 |   });
  141 | });
  142 | 
```