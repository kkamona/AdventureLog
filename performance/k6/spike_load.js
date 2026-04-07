/**
 * spike_load.js — Spike Load Test
 * ==================================
 * Sends a sudden burst of traffic to test system resilience.
 * Models a viral event or traffic spike — goes from 5 to 200 VUs instantly.
 *
 * Pattern:
 *    5 VU baseline for 30 s
 *    5 → 200 VU in 10 s  (spike)
 *  200 VU held for 1 min  (stress at spike level)
 *  200 →   5 VU in 10 s  (rapid drop)
 *    5 VU for 30 s        (recovery observation)
 *
 * Key questions answered:
 *   - Does the server return errors (500/503) under the spike?
 *   - How long does recovery take after the spike drops?
 *   - Which endpoint degrades first?
 *
 * Thresholds (deliberately loose — spike tests expect some degradation):
 *   p(95) < 3000 ms  — some slowness acceptable during spike
 *   error rate < 5 % — server must not collapse entirely
 *
 * Run:
 *   k6 run k6/spike_load.js \
 *     -e BASE_URL=http://localhost:8016 \
 *     -e TEST_USERNAME=admin \
 *     -e TEST_PASSWORD=Admin1234! \
 *     --out json=reports/spike_load_results.json
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, authHeaders, login } from './utils.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const spikeErrors      = new Counter('spike_error_count');
const recoveryDuration = new Trend('recovery_response_duration', true);
const errorRate        = new Rate('spike_error_rate');

// ── Scenario ──────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 5   }, // baseline
    { duration: '10s', target: 200 }, // spike — instant ramp
    { duration: '1m',  target: 200 }, // hold at spike
    { duration: '10s', target: 5   }, // drop
    { duration: '30s', target: 5   }, // recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // loose during spike
    http_req_failed:   ['rate<0.05'],  // 5% error budget
    spike_error_rate:  ['rate<0.05'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  const sessionid = login(
    __ENV.TEST_USERNAME || 'admin',
    __ENV.TEST_PASSWORD || 'Admin1234!'
  );
  console.log('✅ Spike test setup complete');
  return { sessionid };
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function (data) {
  const headers = authHeaders(data.sessionid);

  // Focus on the most-read endpoints — these will saturate first under a spike
  group('spike_location_list', () => {
    const res = http.get(`${BASE_URL}/api/locations/`, { headers });
    const ok = check(res, {
      'not 5xx': (r) => r.status < 500,
      'not timeout': (r) => r.timings.duration < 5000,
    });
    if (!ok) spikeErrors.add(1);
    errorRate.add(!ok);
  });

  sleep(0.2);

  group('spike_map_pins', () => {
    const res = http.get(`${BASE_URL}/api/locations/pins/`, { headers });
    const ok = check(res, {
      'pins not 5xx': (r) => r.status < 500,
    });
    if (!ok) spikeErrors.add(1);
    recoveryDuration.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(0.2);

  group('spike_collections_list', () => {
    const res = http.get(`${BASE_URL}/api/collections/`, { headers });
    const ok = check(res, {
      'collections not 5xx': (r) => r.status < 500,
    });
    if (!ok) spikeErrors.add(1);
    errorRate.add(!ok);
  });

  // Very short think time — simulates bursty concurrent access
  sleep(Math.random() * 0.5);
}
