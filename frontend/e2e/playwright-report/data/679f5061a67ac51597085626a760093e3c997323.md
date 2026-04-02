# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collections.spec.ts >> Collections – Detail page >> user flow: navigate to collection detail → switch All / Itinerary / Map / Stats tabs
- Location: tests\collections.spec.ts:72:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button.btn-primary.btn-wide')

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
      - button "E" [ref=e50] [cursor=pointer]:
        - generic [ref=e52]: E
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
  - generic [ref=e58]:
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e63]:
          - generic [ref=e65]:
            - img [ref=e67]
            - generic [ref=e69]:
              - heading "My Collections" [level=1] [ref=e70]
              - paragraph [ref=e71]: 3 Collections
          - generic [ref=e72]:
            - button "My Collections 3" [ref=e73] [cursor=pointer]:
              - img [ref=e74]
              - generic [ref=e76]: My Collections
              - generic [ref=e77]: "3"
            - button "Shared 0" [ref=e78] [cursor=pointer]:
              - img [ref=e79]
              - generic [ref=e81]: Shared
              - generic [ref=e82]: "0"
            - button "Archived 0" [ref=e83] [cursor=pointer]:
              - img [ref=e84]
              - generic [ref=e86]: Archived
              - generic [ref=e87]: "0"
            - button "Invites 0" [ref=e88] [cursor=pointer]:
              - img [ref=e90]
              - generic [ref=e92]: Invites
              - generic [ref=e93]: "0"
        - generic [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]:
              - figure [ref=e98]:
                - generic [ref=e101]: 📚
              - generic [ref=e103]: 📁 Folder
              - generic [ref=e105]:
                - text: Private
                - generic "Private" [ref=e106]:
                  - img [ref=e107]
            - generic [ref=e109]:
              - link "Playwright Trip 1774683402674" [ref=e110] [cursor=pointer]:
                - /url: /collections/6be21ef3-0ae9-4379-aeda-9e0944702d7e
              - generic [ref=e112]:
                - img [ref=e113]
                - generic [ref=e115]: 0 Locations
              - generic [ref=e117]:
                - button "Open Details" [ref=e118] [cursor=pointer]:
                  - img [ref=e119]
                  - text: Open Details
                - button [ref=e122] [cursor=pointer]:
                  - img [ref=e123]
          - generic [ref=e125]:
            - generic [ref=e126]:
              - figure [ref=e127]:
                - generic [ref=e130]: 📚
              - generic [ref=e132]: 📁 Folder
              - generic [ref=e134]:
                - text: Private
                - generic "Private" [ref=e135]:
                  - img [ref=e136]
            - generic [ref=e138]:
              - link "Playwright Trip 1774644650133" [ref=e139] [cursor=pointer]:
                - /url: /collections/68d3ec7c-1689-4f25-9244-ae89d2c2dea8
              - generic [ref=e141]:
                - img [ref=e142]
                - generic [ref=e144]: 0 Locations
              - generic [ref=e146]:
                - button "Open Details" [ref=e147] [cursor=pointer]:
                  - img [ref=e148]
                  - text: Open Details
                - button [ref=e151] [cursor=pointer]:
                  - img [ref=e152]
          - generic [ref=e154]:
            - generic [ref=e155]:
              - figure [ref=e156]:
                - generic [ref=e159]: 📚
              - generic [ref=e161]: 📁 Folder
              - generic [ref=e163]:
                - text: Private
                - generic "Private" [ref=e164]:
                  - img [ref=e165]
            - generic [ref=e167]:
              - link "Playwright Trip 1774639154468" [ref=e168] [cursor=pointer]:
                - /url: /collections/32e53745-4f83-4cbe-b01c-7ede1cd3aa6c
              - generic [ref=e170]:
                - img [ref=e171]
                - generic [ref=e173]: 0 Locations
              - generic [ref=e175]:
                - button "Open Details" [ref=e176] [cursor=pointer]:
                  - img [ref=e177]
                  - text: Open Details
                - button [ref=e180] [cursor=pointer]:
                  - img [ref=e181]
      - generic [ref=e185]:
        - generic [ref=e186]:
          - img [ref=e188]
          - heading "Filters & Sort" [level=2] [ref=e190]
        - generic [ref=e191]:
          - heading "Status Filter" [level=3] [ref=e192]:
            - img [ref=e193]
            - text: Status Filter
          - generic [ref=e195]:
            - generic [ref=e196] [cursor=pointer]:
              - radio "All" [checked] [ref=e197]
              - generic [ref=e198]: All
            - generic [ref=e199] [cursor=pointer]:
              - radio "📁 Folder" [ref=e200]
              - generic [ref=e201]: 📁 Folder
            - generic [ref=e202] [cursor=pointer]:
              - radio "🚀 Upcoming" [ref=e203]
              - generic [ref=e204]: 🚀 Upcoming
            - generic [ref=e205] [cursor=pointer]:
              - radio "🎯 In Progress" [ref=e206]
              - generic [ref=e207]: 🎯 In Progress
            - generic [ref=e208] [cursor=pointer]:
              - radio "✓ Completed" [ref=e209]
              - generic [ref=e210]: ✓ Completed
        - generic [ref=e211]:
          - heading "Sort" [level=3] [ref=e212]:
            - img [ref=e213]
            - text: Sort
          - generic [ref=e215]:
            - generic [ref=e216]:
              - generic [ref=e218]: Order Direction
              - generic [ref=e219]:
                - button "Ascending" [ref=e220] [cursor=pointer]
                - button "Descending" [ref=e221] [cursor=pointer]
            - generic [ref=e222]:
              - generic [ref=e224]: Order By
              - generic [ref=e225]:
                - generic [ref=e226] [cursor=pointer]:
                  - radio "Updated" [checked] [ref=e227]
                  - generic [ref=e228]: Updated
                - generic [ref=e229] [cursor=pointer]:
                  - radio "Start Date" [ref=e230]
                  - generic [ref=e231]: Start Date
                - generic [ref=e232] [cursor=pointer]:
                  - radio "Name" [ref=e233]
                  - generic [ref=e234]: Name
    - button [ref=e237] [cursor=pointer]:
      - img [ref=e238]
```

# Test source

```ts
  1   | 
  2   | import { test, expect, uid } from '../fixtures';
  3   | 
  4   | // ── Shared helper ─────────────────────────────────────────────────────────────
  5   | 
  6   | async function openCreateCollectionModal(page: any) {
  7   |   const fab = page.locator('[role="button"].btn-primary.btn-circle');
  8   |   if (await fab.isVisible({ timeout: 3_000 }).catch(() => false)) {
  9   |     await fab.click();
  10  |     // Dropdown item — text from $t('adventures.collection') = "Collection"
  11  |     const item = page.locator('.dropdown-content button:has-text("Collection")').first();
  12  |     await expect(item).toBeVisible({ timeout: 4_000 });
  13  |     await item.click();
  14  |   } else {
  15  |     // Empty-state button — text from $t('collection.create') = "Create"
> 16  |     await page.locator('button.btn-primary.btn-wide').click();
      |                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  17  |   }
  18  |   await expect(page.locator('dialog#my_modal_1')).toBeVisible({ timeout: 6_000 });
  19  | }
  20  | 
  21  | // ─── List ─────────────────────────────────────────────────────────────────────
  22  | 
  23  | test.describe('Collections – List', () => {
  24  |   test('collections page loads (proves session is active)', async ({ page }) => {
  25  |     await page.goto('/collections');
  26  |     // If session is missing, the app redirects to /login — this catches it
  27  |     await expect(page).toHaveURL(/\/collections/, { timeout: 8_000 });
  28  |     await expect(
  29  |   page.getByRole('link', { name: 'Playwright Trip 1774683402674' })
  30  | ).toBeVisible();
  31  |   });
  32  | 
  33  |   test('DEBUG: auth state check', async ({ page, context }) => {
  34  |   const cookies = await context.cookies();
  35  |   console.log('=== COOKIES AT TEST START ===');
  36  |   console.log(JSON.stringify(cookies, null, 2));
  37  | 
  38  |   await page.goto('/collections');
  39  |   console.log('=== FINAL URL ===', page.url());
  40  | });
  41  | 
  42  |   test('FAB circle button is visible in bottom-right', async ({ page }) => {
  43  |     await page.goto('/collections');
  44  |     await expect(page).toHaveURL(/\/collections/);
  45  |     await expect(page.locator('[role="button"].btn-primary.btn-circle')).toBeVisible();
  46  |   });
  47  | 
  48  |   test('tab buttons My Collections / Shared / Archived / Invites are visible', async ({ page }) => {
  49  |     await page.goto('/collections');
  50  |     await expect(page).toHaveURL(/\/collections/);
  51  |     await expect(page.locator('button:has-text("My Collections")')).toBeVisible();
  52  |     await expect(page.locator('button:has-text("Shared")')).toBeVisible();
  53  |     await expect(page.locator('button:has-text("Archived")')).toBeVisible();
  54  |   });
  55  | 
  56  |   test('filter sidebar shows Status Filter and Sort sections', async ({ page }) => {
  57  |     await page.goto('/collections');
  58  |     await expect(page).toHaveURL(/\/collections/);
  59  |     const statusCard = page.locator('div.card', {
  60  |   has: page.locator('text=Status Filter')
  61  | });
  62  | 
  63  | await expect(statusCard).toBeVisible();
  64  |   });
  65  | });
  66  | 
  67  | 
  68  | 
  69  | // ─── Detail page ──────────────────────────────────────────────────────────────
  70  | 
  71  | test.describe('Collections – Detail page', () => {
  72  |   test('user flow: navigate to collection detail → switch All / Itinerary / Map / Stats tabs', async ({ page }) => {
  73  |     await page.goto('/collections');
  74  |     await expect(page).toHaveURL(/\/collections/);
  75  | 
  76  |     let firstLink = page.locator('a[href*="/collections/"]').first();
  77  |     if (await firstLink.count() === 0) {
  78  |       await openCreateCollectionModal(page);
  79  |       await page.fill('#name', `Nav Test ${uid()}`);
  80  |       await page.click('dialog#my_modal_1 button[type="submit"]');
  81  |       await expect(page.locator('dialog#my_modal_1')).toBeHidden({ timeout: 8_000 });
  82  |       firstLink = page.locator('a[href*="/collections/"]').first();
  83  |     }
  84  | 
  85  |     const href = await firstLink.getAttribute('href');
  86  |     await page.goto(href!);
  87  |     await expect(page).toHaveURL(/\/collections\/.+/);
  88  |     await expect(page.locator('h1, h2').first()).toBeVisible();
  89  | 
  90  |     for (const tab of ['All', 'Itinerary', 'Map', 'Stats']) {
  91  |       const tabBtn = page.locator(`button:has-text("${tab}")`).first();
  92  |       if (await tabBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
  93  |         await tabBtn.click();
  94  |         await page.waitForTimeout(400);
  95  |         await expect(page.locator('body')).not.toBeEmpty();
  96  |       }
  97  |     }
  98  |   });
  99  | 
  100 |   test('user flow: open collection detail → FAB → add location inside collection', async ({ page }) => {
  101 |     await page.goto('/collections');
  102 |     await expect(page).toHaveURL(/\/collections/);
  103 | 
  104 |     let href: string | null = null;
  105 |     const firstLink = page.locator('a[href*="/collections/"]').first();
  106 |     if (await firstLink.count() > 0) {
  107 |       href = await firstLink.getAttribute('href');
  108 |     } else {
  109 |       await openCreateCollectionModal(page);
  110 |       await page.fill('#name', `Detail FAB ${uid()}`);
  111 |       await page.click('dialog#my_modal_1 button[type="submit"]');
  112 |       await expect(page.locator('dialog#my_modal_1')).toBeHidden({ timeout: 8_000 });
  113 |       href = await page.locator('a[href*="/collections/"]').first().getAttribute('href');
  114 |     }
  115 | 
  116 |     await page.goto(href!);
```