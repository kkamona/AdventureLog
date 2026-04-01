# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Logout >> user flow: authenticated → open avatar dropdown → Logout → land on /
- Location: tests\auth.spec.ts:218:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
  navigated to "http://localhost:8015/?/logout"
============================================================
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
    - generic [ref=e9]:
      - generic [ref=e10]:
        - button "Login" [ref=e11] [cursor=pointer]
        - button "Signup" [ref=e12] [cursor=pointer]
      - generic [ref=e13]:
        - button [ref=e14] [cursor=pointer]:
          - img [ref=e15]
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
  - generic [ref=e18]:
    - generic [ref=e19]:
      - img [ref=e22]
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - img [ref=e29]
              - generic [ref=e31]: Start Your Journey
            - heading "Discover the World's Most Thrilling Adventures" [level=1] [ref=e32]
          - paragraph [ref=e33]: Discover and plan your next adventure with AdventureLog. Explore breathtaking destinations, create custom itineraries, and stay connected on the go.
          - generic [ref=e34]:
            - button "Login" [ref=e35] [cursor=pointer]:
              - text: Login
              - img [ref=e36]
            - button "Signup" [ref=e38] [cursor=pointer]
        - generic [ref=e43]:
          - img "Hoboken, New Jersey, USA" [ref=e44]
          - generic [ref=e48]: Hoboken, New Jersey, USA
    - generic [ref=e53]:
      - generic [ref=e54]:
        - generic [ref=e55]:
          - img [ref=e56]
          - generic [ref=e58]: Key Features
        - heading "Discover, Plan, and Explore with Ease" [level=2] [ref=e59]
        - paragraph [ref=e60]: AdventureLog is designed to simplify your journey, providing you with the tools and resources to plan, pack, and navigate your next unforgettable adventure.
      - generic [ref=e61]:
        - generic [ref=e62]:
          - generic [ref=e64]:
            - img [ref=e66]
            - generic [ref=e68]:
              - heading "Travel Log" [level=3] [ref=e69]
              - paragraph [ref=e70]: Keep track of your adventures with a personalized travel log and share your experiences with friends and family.
          - generic [ref=e72]:
            - img [ref=e74]
            - generic [ref=e76]:
              - heading "Trip Planning" [level=3] [ref=e77]
              - paragraph [ref=e78]: Easily create custom itineraries and get a day-by-day breakdown of your trip.
          - generic [ref=e80]:
            - img [ref=e82]
            - generic [ref=e84]:
              - heading "Travel Map" [level=3] [ref=e85]
              - paragraph [ref=e86]: View your travels throughout the world with an interactive map and explore new destinations.
        - img "World map with pins" [ref=e89]
```

# Test source

```ts
  132 |     await page.fill('#password2', 'Mismatch456!');
  133 |     await page.click('button[type="submit"]');
  134 | 
  135 |     await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
  136 |     expect(page.url()).toContain('/signup');
  137 |   });
  138 | 
  139 |   test('duplicate username → server returns error', async ({ page }) => {
  140 |     await page.goto('/signup');
  141 | 
  142 |     await page.fill('#username', VALID_USER.username);
  143 |     await page.fill('#email', `dup_${uid()}@example.com`);
  144 |     await page.fill('#first_name', 'Test');
  145 |     await page.fill('#last_name', 'Dup');
  146 |     await page.fill('#password', 'Password123!');
  147 |     await page.fill('#password2', 'Password123!');
  148 |     await page.click('button[type="submit"]');
  149 | 
  150 |     await expect(page.locator('.alert-error')).toBeVisible({ timeout: 8_000 });
  151 |   });
  152 | 
  153 |   test('"Already have an account?" link goes to /login', async ({ page }) => {
  154 |     await page.goto('/signup');
  155 |     await page.click('a[href="/login"]');
  156 |     await expect(page).toHaveURL(/\/login/);
  157 |   });
  158 | });
  159 | 
  160 | // ─── Password Reset (unauthenticated) ────────────────────────────────────────
  161 | 
  162 | test.describe('Password Reset', () => {
  163 |   test.use({ storageState: { cookies: [], origins: [] } });
  164 | 
  165 |   test('reset-password page renders email input and submit button', async ({ page }) => {
  166 |     await page.goto('/user/reset-password');
  167 |     await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  168 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  169 |   });
  170 | 
  171 |   test('submitting a valid email shows no crash and no error alert', async ({ page }) => {
  172 |     await page.goto('/user/reset-password');
  173 |     await page.fill('input[type="email"], input[name="email"]', 'nonexistent@example.com');
  174 |     await page.click('button[type="submit"]');
  175 |     await page.waitForTimeout(2_000);
  176 |     await expect(page.locator('body')).not.toBeEmpty();
  177 |     await expect(page.locator('.alert-error')).toHaveCount(0);
  178 |   });
  179 | });
  180 | 
  181 | 
  182 | // ─── Settings / Profile (authenticated — uses project storageState) ───────────
  183 | 
  184 | 
  185 | test.describe('Settings – Profile', () => {
  186 |   test('settings page is accessible and shows profile section', async ({ page }) => {
  187 |   await page.goto('/');
  188 | 
  189 |   const avatarBtn = page.locator('.navbar-end [role="button"].btn-circle.avatar, .navbar-end .dropdown [role="button"]').first();
  190 |     await expect(avatarBtn).toBeVisible({ timeout: 8_000 });
  191 |     await avatarBtn.click();
  192 | 
  193 | 
  194 |     // Logout is a button inside a <form method="post"> with formaction="/?/logout"
  195 |     const settingsBtn = page.locator('button:has-text("Settings")');
  196 |     await expect(settingsBtn).toBeVisible({ timeout: 4_000 });
  197 |     await settingsBtn.click();
  198 | });
  199 | 
  200 | 
  201 |   test('user flow: update first name → save → no error alert', async ({ page }) => {
  202 |     await page.goto('/settings');
  203 | 
  204 |     const firstNameInput = page.locator('input[name="first_name"], #first_name').first();
  205 |     await expect(firstNameInput).toBeVisible({ timeout: 8_000 });
  206 | 
  207 |     await firstNameInput.fill('AssiyaTest');
  208 |     const updateButton = page.getByRole('button', { name: /update/i });
  209 | 
  210 |   
  211 |     await expect(page.locator('.alert-error')).toHaveCount(0);
  212 |   });
  213 | });
  214 | 
  215 | 
  216 | // ─── Logout (authenticated — uses project storageState) ──────────────────────
  217 | test.describe('Logout', () => {
  218 |   test('user flow: authenticated → open avatar dropdown → Logout → land on /', async ({ page }) => {
  219 |     // We start authenticated via project-level storageState
  220 |     await page.goto('/');
  221 | 
  222 |     // The avatar dropdown is a div[role="button"] with initials inside
  223 |     const avatarBtn = page.locator('.navbar-end [role="button"].btn-circle.avatar, .navbar-end .dropdown [role="button"]').first();
  224 |     await expect(avatarBtn).toBeVisible({ timeout: 8_000 });
  225 |     await avatarBtn.click();
  226 | 
  227 |     // Logout is a button inside a <form method="post"> with formaction="/?/logout"
  228 |     const logoutBtn = page.locator('button[formaction="/?/logout"], button:has-text("Logout")');
  229 |     await expect(logoutBtn).toBeVisible({ timeout: 4_000 });
  230 |     await logoutBtn.click();
  231 | 
> 232 |     await page.waitForURL('/', { timeout: 10_000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  233 |     await expect(page).toHaveURL('/');
  234 |   });
  235 | });
  236 | 
  237 | 
  238 | 
```