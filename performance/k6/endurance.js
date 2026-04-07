/**
 * endurance.js — Endurance (Soak) Test
 * =======================================
 * Runs 10 VUs continuously for 30 minutes to detect memory leaks,
 * connection pool exhaustion, and response time drift over time.
 *
 * Questions answered:
 *   - Does response time grow over time (memory leak / cache exhaustion)?
 *   - Does error rate creep up after extended runtime?
 *   - Does the server stay stable across a full half-hour session?
 *
 * Thresholds:
 *   p(95) < 1000 ms  — slightly relaxed vs normal load (DB warmup expected)
 *   error rate < 0.5 % — very tight — no degradation allowed over time
 *
 * Run:
 *   k6 run k6/endurance.js \
 *     -e BASE_URL=http://localhost:8016 \
 *     -e TEST_USERNAME=admin \
 *     -e TEST_PASSWORD=Admin1234! \
 *     --out json=reports/endurance_results.json
 *
 * Note: Use --out influxdb or --out prometheus-rw to stream metrics
 *       into Grafana for real-time drift visualization.
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, authHeaders, login, randomSuffix } from './utils.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
// Tracking per-endpoint trends separately makes time-drift visible in Grafana
const locationsP95 = new Trend('endurance_locations_duration', true);
const collectionsP95 = new Trend('endurance_collections_duration', true);
const statsP95 = new Trend('endurance_stats_duration', true);
const errorRate = new Rate('endurance_error_rate');

// ── Scenario ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    endurance: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration:           ['p(95)<1000'],
    http_req_failed:             ['rate<0.005'], // 0.5% — tighter than load tests
    endurance_locations_duration:['p(95)<1000'],
    endurance_collections_duration:['p(95)<1000'],
    endurance_stats_duration:    ['p(95)<1500'],
    endurance_error_rate:        ['rate<0.005'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  const sessionid = login(
    __ENV.TEST_USERNAME || 'admin',
    __ENV.TEST_PASSWORD || 'Admin1234!'
  );
  console.log('✅ Endurance test setup — running for 30 minutes');
  return { sessionid };
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function (data) {
  const headers = authHeaders(data.sessionid);

  // Rotate through a realistic mix of user actions over time
  const iteration = __ITER % 4;

  if (iteration === 0) {
    group('read_locations', () => {
      const res = http.get(`${BASE_URL}/api/locations/`, { headers });
      const ok = check(res, { 'locations 200': (r) => r.status === 200 });
      locationsP95.add(res.timings.duration);
      errorRate.add(!ok);
    });
  } else if (iteration === 1) {
    group('read_collections', () => {
      const res = http.get(`${BASE_URL}/api/collections/`, { headers });
      const ok = check(res, { 'collections 200': (r) => r.status === 200 });
      collectionsP95.add(res.timings.duration);
      errorRate.add(!ok);
    });
  } else if (iteration === 2) {
    group('read_stats', () => {
      const res = http.get(`${BASE_URL}/api/stats/`, { headers });
      const ok = check(res, { 'stats 200': (r) => r.status === 200 });
      statsP95.add(res.timings.duration);
      errorRate.add(!ok);
    });
  } else {
    // Write + delete cycle — checks for connection pool leaks on writes
    group('write_and_delete_location', () => {
      const payload = JSON.stringify({
        name: `Endurance Location ${randomSuffix()}`,
        is_public: false,
      });
      const createRes = http.post(`${BASE_URL}/api/locations/`, payload, { headers });
      const created = check(createRes, { 'create 201': (r) => r.status === 201 });
      errorRate.add(!created);

      if (created) {
        const id = createRes.json('id');
        const delRes = http.del(`${BASE_URL}/api/locations/${id}/`, null, { headers });
        const deleted = check(delRes, { 'delete 204': (r) => r.status === 204 });
        errorRate.add(!deleted);
      }
    });
  }

  sleep(Math.random() * 3 + 2); // 2–5 s think time — realistic pacing
}
