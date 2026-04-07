/**
 * normal_load.js — Normal Load Test
 * ===================================
 * Simulates typical concurrent user traffic on AdventureLog.
 *
 * Scenario:    20 virtual users browsing for 3 minutes
 * Modules hit: Auth (session check), Locations (list + detail),
 *              Collections (list + detail), Map (pins), Stats
 *
 * Thresholds (pass/fail gates):
 *   p(95) response time < 800 ms
 *   error rate           < 1 %
 *
 * Run:
 *   k6 run k6/normal_load.js \
 *     -e BASE_URL=http://localhost:8016 \
 *     -e TEST_USERNAME=admin \
 *     -e TEST_PASSWORD=Admin1234! \
 *     --out json=reports/normal_load_results.json
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, authHeaders, login, randomSuffix } from './utils.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const locationListDuration   = new Trend('location_list_duration',   true);
const collectionListDuration = new Trend('collection_list_duration', true);
const mapPinsDuration        = new Trend('map_pins_duration',        true);
const statsDuration          = new Trend('stats_duration',           true);
const errorRate              = new Rate('custom_error_rate');

// ── Scenario configuration ────────────────────────────────────────────────────
export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    location_list_duration:   ['p(95)<800'],
    collection_list_duration: ['p(95)<800'],
    map_pins_duration:        ['p(95)<600'],  // tighter — map pins are lightweight
    stats_duration:           ['p(95)<1200'], // looser  — stats does DB aggregations
  },
};

// ── Setup: authenticate once, share sessionid with all VUs ───────────────────
export function setup() {
  const username = __ENV.TEST_USERNAME || 'admin';
  const password = __ENV.TEST_PASSWORD || 'Admin1234!';
  const sessionid = login(username, password);
  console.log(`✅ Setup complete — authenticated as "${username}"`);
  return { sessionid };
}

// ── Main VU function — runs repeatedly for the test duration ─────────────────
export default function (data) {
  const headers = authHeaders(data.sessionid);

  group('locations_list', () => {
    const res = http.get(`${BASE_URL}/api/locations/`, { headers });
    const ok = check(res, {
      'locations list 200': (r) => r.status === 200,
      'locations list has results': (r) => {
        try { return r.json('results') !== undefined; } catch { return false; }
      },
    });
    locationListDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('collections_list', () => {
    const res = http.get(`${BASE_URL}/api/collections/`, { headers });
    const ok = check(res, {
      'collections list 200': (r) => r.status === 200,
    });
    collectionListDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('map_pins', () => {
    const res = http.get(`${BASE_URL}/api/locations/pins/`, { headers });
    const ok = check(res, {
      'map pins 200': (r) => r.status === 200,
    });
    mapPinsDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('stats', () => {
    const res = http.get(`${BASE_URL}/api/stats/`, { headers });
    const ok = check(res, {
      'stats 200': (r) => r.status === 200,
    });
    statsDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  // Simulate user think time between page loads
  sleep(Math.random() * 2 + 1); // 1–3 s
}

// ── Teardown: print summary ───────────────────────────────────────────────────
export function teardown(data) {
  console.log('Normal load test complete.');
}
