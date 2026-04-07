/**
 * utils.js — Shared helpers for all AdventureLog k6 performance tests
 *
 * Provides:
 *   - login()        : authenticates and returns a session cookie string
 *   - BASE_URL       : read from env, defaults to http://localhost:8016
 *   - THRESHOLDS     : standard p95 / error-rate gates used across scripts
 *   - randomSuffix() : generates unique strings to avoid data collisions
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8016';

/**
 * Standard thresholds applied to every test.
 * Adjust per-test if a specific scenario has looser/tighter gates.
 *
 * http_req_duration p(95) < 800ms  — 95% of requests complete within 800 ms
 * http_req_failed   < 1%           — fewer than 1% of requests must fail
 */
export const THRESHOLDS = {
  http_req_duration: ['p(95)<800'],
  http_req_failed: ['rate<0.01'],
};

/**
 * Authenticate with the Django backend using allauth headless login.
 * Returns the sessionid cookie value so callers can attach it to requests.
 *
 * Must be called inside a k6 setup() function (runs once before VUs start).
 *
 * @param {string} username
 * @param {string} password
 * @returns {string} sessionid cookie value
 */
export function login(username, password) {
  const http = require('k6/http');

  // Step 1: fetch a CSRF token (the Django backend requires it)
  const csrfRes = http.get(`${BASE_URL}/csrf/`);
  if (csrfRes.status !== 200) {
    throw new Error(`CSRF fetch failed: HTTP ${csrfRes.status}`);
  }
  const csrfToken = csrfRes.json('csrfToken');

  // Step 2: POST credentials to allauth headless login endpoint
  const loginRes = http.post(
    `${BASE_URL}/auth/browser/v1/auth/login`,
    JSON.stringify({ username, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        Cookie: `csrftoken=${csrfToken}`,
        Referer: BASE_URL,
      },
    }
  );

  if (loginRes.status !== 200) {
    throw new Error(
      `Login failed for "${username}": HTTP ${loginRes.status} — ${loginRes.body}`
    );
  }

  // Extract sessionid from Set-Cookie header
  const setCookie = loginRes.headers['Set-Cookie'] || '';
  const match = setCookie.match(/sessionid=([^;]+)/);
  if (!match) {
    throw new Error('Login succeeded but no sessionid cookie found in response');
  }
  return match[1];
}

/**
 * Build standard request headers including the session cookie.
 * @param {string} sessionid
 * @returns {Object} headers object
 */
export function authHeaders(sessionid) {
  return {
    'Content-Type': 'application/json',
    Cookie: `sessionid=${sessionid}`,
  };
}

/** Returns a short unique suffix for data isolation between VU iterations. */
export function randomSuffix() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
