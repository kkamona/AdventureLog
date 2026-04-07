/**
 * bottleneck_analysis.js — Targeted Bottleneck Analysis
 * ========================================================
 * Isolates and stress-tests the three highest-risk endpoints identified
 * in the risk analysis, running each scenario independently so their
 * individual degradation curves can be measured and compared.
 *
 * High-risk modules (from midterm risk analysis):
 *
 *   1. Stats endpoint  — GET /api/stats/
 *      Risk: N+1 queries, Python-level iteration over all locations,
 *            no caching. Worst-case: O(n locations) DB queries per request.
 *
 *   2. Search endpoint — GET /api/search/?query=
 *      Risk: PostgreSQL full-text SearchVector across multiple models,
 *            no result caching, cross-table joins.
 *
 *   3. Location create — POST /api/locations/
 *      Risk: Triggers background geocoding, ORM write, M2M validation,
 *            signal dispatch. Write throughput limited by DB + geocoder.
 *
 * Each scenario uses ramping-arrival-rate executor to measure
 * max_rps (requests per second) each endpoint can sustain before
 * response times exceed the threshold.
 *
 * Run:
 *   k6 run k6/bottleneck_analysis.js \
 *     -e BASE_URL=http://localhost:8016 \
 *     -e TEST_USERNAME=admin \
 *     -e TEST_PASSWORD=Admin1234! \
 *     --out json=reports/bottleneck_results.json
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, authHeaders, login, randomSuffix } from './utils.js';

// ── Per-endpoint custom metrics ───────────────────────────────────────────────
const statsLatency        = new Trend('bottleneck_stats_ms',    true);
const searchLatency       = new Trend('bottleneck_search_ms',   true);
const locationWriteLatency = new Trend('bottleneck_write_ms',   true);
const statsErrors         = new Rate('bottleneck_stats_errors');
const searchErrors        = new Rate('bottleneck_search_errors');
const writeErrors         = new Rate('bottleneck_write_errors');

// ── Three independent scenarios on the same VU pool ──────────────────────────
export const options = {
  scenarios: {
    // Scenario A: ramp RPS on the stats endpoint until it breaks
    stress_stats: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '1m', target: 5  }, // 5 req/s
        { duration: '2m', target: 20 }, // 20 req/s
        { duration: '1m', target: 40 }, // 40 req/s — likely breaking point
        { duration: '1m', target: 5  }, // recovery
      ],
      exec: 'statsScenario',
    },
    // Scenario B: ramp RPS on search
    stress_search: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '1m', target: 5  },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 5  },
      ],
      exec: 'searchScenario',
      startTime: '6m', // start after stress_stats finishes
    },
    // Scenario C: ramp concurrent writes
    stress_writes: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5  },
        { duration: '2m', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 1  },
      ],
      exec: 'writeScenario',
      startTime: '12m', // start after stress_search finishes
    },
  },
  thresholds: {
    // Hard gates — test fails if ANY endpoint crosses these
    http_req_failed:          ['rate<0.05'],
    bottleneck_stats_ms:      ['p(95)<2000', 'p(99)<4000'],
    bottleneck_search_ms:     ['p(95)<2000', 'p(99)<4000'],
    bottleneck_write_ms:      ['p(95)<3000', 'p(99)<5000'],
    bottleneck_stats_errors:  ['rate<0.05'],
    bottleneck_search_errors: ['rate<0.05'],
    bottleneck_write_errors:  ['rate<0.05'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  const sessionid = login(
    __ENV.TEST_USERNAME || 'admin',
    __ENV.TEST_PASSWORD || 'Admin1234!'
  );
  console.log('✅ Bottleneck analysis setup complete');
  return { sessionid };
}

// ── Scenario A: Stats ─────────────────────────────────────────────────────────
export function statsScenario(data) {
  const headers = authHeaders(data.sessionid);
  const res = http.get(`${BASE_URL}/api/stats/`, { headers });
  statsLatency.add(res.timings.duration);
  const ok = check(res, {
    'stats status 200': (r) => r.status === 200,
    'stats under 2s':   (r) => r.timings.duration < 2000,
  });
  statsErrors.add(!ok);
}

// ── Scenario B: Search ────────────────────────────────────────────────────────
export function searchScenario(data) {
  const headers = authHeaders(data.sessionid);
  const terms = ['Paris', 'Tokyo', 'New York', 'Beach', 'Mountain', 'Hotel', 'Museum'];
  const term = terms[Math.floor(Math.random() * terms.length)];
  const res = http.get(`${BASE_URL}/api/search/?query=${term}`, { headers });
  searchLatency.add(res.timings.duration);
  const ok = check(res, {
    'search status 200': (r) => r.status === 200,
    'search under 2s':   (r) => r.timings.duration < 2000,
  });
  searchErrors.add(!ok);
}

// ── Scenario C: Write (Create Location) ───────────────────────────────────────
export function writeScenario(data) {
  const headers = authHeaders(data.sessionid);
  const payload = JSON.stringify({
    name: `Bottleneck Write ${randomSuffix()}`,
    is_public: false,
  });
  const res = http.post(`${BASE_URL}/api/locations/`, payload, { headers });
  locationWriteLatency.add(res.timings.duration);
  const ok = check(res, {
    'create status 201': (r) => r.status === 201,
    'create under 3s':   (r) => r.timings.duration < 3000,
  });
  writeErrors.add(!ok);
  sleep(0.2);
}

// Default export required by k6 (unused when all exec functions are named)
export default function () {}
