/**
 * Centralised test data derived from .env configuration.
 *
 * Frontend : http://localhost:8015
 * Backend  : http://localhost:8016
 * Admin    : admin / admin
 */

export const ENV = {
  BASE_URL: process.env.BASE_URL ?? 'http://localhost:8015',
  API_URL: process.env.API_URL ?? 'http://localhost:8016',
} as const;

// ── Credentials ────────────────────────────────────────────────────────────

export const ADMIN_USER = {
  username: process.env.DJANGO_ADMIN_USERNAME ?? 'admin',
  password: process.env.DJANGO_ADMIN_PASSWORD ?? 'admin',
  email: process.env.DJANGO_ADMIN_EMAIL ?? 'admin@example.com',
} as const;

export const INVALID_CREDENTIALS = [
  { username: 'admin', password: 'wrongpassword', label: 'wrong password' },
  { username: 'nonexistent_user', password: 'admin', label: 'non-existent user' },
  { username: '', password: 'admin', label: 'empty username' },
  { username: 'admin', password: '', label: 'empty password' },
  { username: '  ', password: '  ', label: 'whitespace only' },
];

export const REGISTRATION_DATA = {
  valid: {
    username: `e2e_user_${Date.now()}`,
    firstName: 'E2E',
    lastName: 'Tester',
    email: `e2e_${Date.now()}@test.example.com`,
    password: 'SecureP@ssw0rd!',
    passwordConfirm: 'SecureP@ssw0rd!',
  },
  passwordMismatch: {
    username: `e2e_mismatch_${Date.now()}`,
    email: `mismatch_${Date.now()}@test.example.com`,
    password: 'Password123!',
    passwordConfirm: 'DifferentPassword456!',
  },
  weakPassword: {
    username: `e2e_weak_${Date.now()}`,
    email: `weak_${Date.now()}@test.example.com`,
    password: '123',
    passwordConfirm: '123',
  },
  duplicateUsername: {
    username: 'admin', // always exists
    email: `dup_${Date.now()}@test.example.com`,
    password: 'SecureP@ssw0rd!',
    passwordConfirm: 'SecureP@ssw0rd!',
  },
};

// ── Location test data ─────────────────────────────────────────────────────

export const LOCATIONS = {
  valid: {
    name: `E2E Location ${Date.now()}`,
    description: 'Created by Playwright E2E test',
    visitStatus: 'visited',
    rating: '4',
    lat: '48.8566',
    lng: '2.3522',
  },
  minimal: {
    name: `Minimal Location ${Date.now()}`,
  },
  update: {
    name: `Updated Location ${Date.now()}`,
    description: 'Updated by E2E test',
  },
  xss: {
    name: '<script>alert("xss")</script>',
    description: '<img src=x onerror=alert(1)>',
  },
  longName: {
    name: 'A'.repeat(300),
  },
  specialChars: {
    name: `Café & Résturant "Le Monde" – Ñoño 日本語`,
  },
};

export const VISIT_STATUSES = ['visited', 'planned', 'featured'];

// ── Collection test data ───────────────────────────────────────────────────

export const COLLECTIONS = {
  valid: {
    name: `E2E Trip ${Date.now()}`,
    description: 'A test trip created by Playwright',
    startDate: '2025-06-01',
    endDate: '2025-06-15',
    isPublic: false,
  },
  publicTrip: {
    name: `Public Trip ${Date.now()}`,
    description: 'A public test trip',
    isPublic: true,
  },
  minimalTrip: {
    name: `Minimal Trip ${Date.now()}`,
  },
  update: {
    name: `Updated Trip ${Date.now()}`,
    description: 'Updated description',
  },
  invalidDates: {
    name: `Bad Dates Trip ${Date.now()}`,
    startDate: '2025-06-15',
    endDate: '2025-06-01', // end before start
  },
};

// ── API endpoints ──────────────────────────────────────────────────────────

export const API = {
  login: '/auth/login/',
  logout: '/auth/logout/',
  userMetadata: '/auth/user-metadata/',
  register: '/auth/_allauth/app/v1/auth/signup',
  locations: '/api/adventures/',
  collections: '/api/collections/',
  map: '/api/adventures/all_adventures/',
} as const;
