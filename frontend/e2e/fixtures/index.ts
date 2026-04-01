import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { LocationsPage } from '../pages/LocationsPage';
import { CollectionsPage } from '../pages/CollectionsPage';

type Fixtures = {
  loginPage: LoginPage;
  locationsPage: LocationsPage;
  collectionsPage: CollectionsPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  locationsPage: async ({ page }, use) => use(new LocationsPage(page)),
  collectionsPage: async ({ page }, use) => use(new CollectionsPage(page)),
});

export { expect };

/** Unique string for test isolation */
export const uid = () => `test_${Date.now()}`;
