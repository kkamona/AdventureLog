/**
 * peak_load.js — Peak Load Test
 * ================================
 * Gradually ramps up to 100 concurrent users, holds, then ramps down.
 * Identifies at what load level response times degrade beyond thresholds.
 *
 * Ramp pattern:
 *   0 →  20 VU in 1 min  (warm-up)
 *  20 → 100 VU in 2 min  (build to peak)
 * 100 → 100 VU for 3 min (sustain peak)
 * 100 →   0 VU in 1 min  (cool-down)
 *
 * High-risk endpoints (from risk analysis):
 *   - POST /api/locations/    (write + geocode trigger)
 *   - GET  /api/locations/    (paginated list with ORM joins)
 *   - GET  /api/stats/        (aggregation queries — DB intensive)
 *   - GET  /api/search/       (PostgreSQL full-text search)
 *
 * Thresholds:
 *   p(95) overall < 1500 ms (relaxed for peak — some degradation expected)
 *   error rate    < 2 %
 *
 * Run:
 *   k6 run k6/peak_load.js \
 *     -e BASE_URL=http://localhost:8016 \
 *     -e TEST_USERNAME=admin \
 *     -e TEST_PASSWORD=Admin1234! \
 *     --out json=reports/peak_load_results.json
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, authHeaders, login, randomSuffix } from './utils.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const locationCreateDuration = new Trend('location_create_duration', true);
const searchDuration         = new Trend('search_duration',          true);
const statsDuration          = new Trend('stats_duration',           true);
const errorRate              = new Rate('peak_error_rate');

// ── Scenario configuration ────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '1m', target: 20  }, // warm-up
    { duration: '2m', target: 100 }, // ramp to peak
    { duration: '3m', target: 100 }, // sustain peak
    { duration: '1m', target: 0   }, // cool-down
  ],
  thresholds: {
    http_req_duration:       ['p(95)<1500'], // relaxed at peak
    http_req_failed:         ['rate<0.02'],  // 2% error budget
    location_create_duration:['p(95)<2000'], // writes are slower
    search_duration:         ['p(95)<1500'],
    stats_duration:          ['p(95)<2000'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  const sessionid = login(
    __ENV.TEST_USERNAME || 'admin',
    __ENV.TEST_PASSWORD || 'Admin1234!'
  );
  console.log('✅ Peak load test setup complete');
  return { sessionid };
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function (data) {
  const headers = authHeaders(data.sessionid);

  // READ: paginated location list (most common operation)
  group('location_list_read', () => {
    const res = http.get(`${BASE_URL}/api/locations/?page=1`, { headers });
    const ok = check(res, {
      'location list 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // READ: stats aggregation (high DB cost — key bottleneck candidate)
  group('stats_aggregation', () => {
    const res = http.get(`${BASE_URL}/api/stats/`, { headers });
    const ok = check(res, {
      'stats 200': (r) => r.status === 200,
    });
    statsDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.3);

  // READ: search (PostgreSQL full-text — CPU + I/O intensive)
  group('full_text_search', () => {
    const terms = ['Paris', 'Tokyo', 'London', 'Berlin', 'Rome'];
    const term = terms[Math.floor(Math.random() * terms.length)];
    const res = http.get(`${BASE_URL}/api/search/?query=${term}`, { headers });
    const ok = check(res, {
      'search 200': (r) => r.status === 200,
    });
    searchDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.3);

  // WRITE: create a location (triggers ORM write — 20% of VUs do this)
  if (Math.random() < 0.20) {
    group('location_create', () => {
      const payload = JSON.stringify({
        name: `Peak Test Location ${randomSuffix()}`,
        is_public: false,
      });
      const res = http.post(`${BASE_URL}/api/locations/`, payload, { headers });
      const ok = check(res, {
        'location created 201': (r) => r.status === 201,
      });
      locationCreateDuration.add(res.timings.duration);
      errorRate.add(!ok);
    });
  }

  sleep(Math.random() * 1.5 + 0.5); // 0.5–2 s think time
}
