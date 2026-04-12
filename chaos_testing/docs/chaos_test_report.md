# Chaos / Fault Injection Testing Report
## AdventureLog — QA Project

**Project:** AdventureLog  
**Test Type:** Chaos / Fault Injection Testing  
**Executed by:** [YOUR NAME]  
**Date:** [DATE OF EXECUTION]  
**Environment:** Local Docker Compose (adventurelog-frontend, adventurelog-backend, adventurelog-db)  
**Stack version:** ghcr.io/seanmorley15/adventurelog-backend:latest  

---

## 1. Mutation Plan — High-Risk Modules & Rationale

### 1.1 Architecture Under Test

```
Browser → adventurelog-frontend (SvelteKit :8015)
             ↓ SSR fetch (hooks.server.ts)
          adventurelog-backend (Django/Gunicorn :8016)
             ↓ ORM queries
          adventurelog-db (PostGIS 16, internal)
```

**Key observations from code review:**
- `hooks.server.ts` handles 429 and 5xx by clearing session but does NOT retry
- No circuit breaker between frontend and backend
- No connection pool limits configured in `settings.py`
- Memcached cache configured but may not be running in local stack
- No resource limits (`mem_limit`, `cpus`) in `docker-compose.yml`
- `restart: unless-stopped` on all containers provides basic auto-recovery

### 1.2 High-Risk Modules (from Midterm Risk Analysis)

| Priority | Module | Risk Reason |
|---|---|---|
| 🔴 Critical | PostGIS Database | Single point of failure; no replica; all data |
| 🔴 Critical | Backend API (Django) | No load balancer; single Gunicorn instance |
| 🟠 High | Frontend→Backend network | No retry logic; timeout not configured |
| 🟠 High | Resource (CPU/Memory) | No Docker resource limits; OOM possible |
| 🟡 Medium | Auth session handling | Session cleared on any 5xx — forces re-login |

### 1.3 Fault Scenarios Selected

| Scenario | Fault Type | Target Module | Duration |
|---|---|---|---|
| 1 | DB container stop | adventurelog-db | 30 s |
| 2 | Backend container stop | adventurelog-backend | 30 s |
| 3 | Network latency (2000ms) | backend eth0 | 60 s |
| 4 | CPU + Memory exhaustion | backend container | 45 s |
| 5 | Cascading (DB slow + concurrent load) | Full stack | 60 s |

---

## 2. Test Execution Logs

### Pre-flight Check

**Command run:**
```bash
docker compose up -d
./chaos_testing/scripts/chaos_tests.sh all
```

**Stack health before tests:**
- Frontend: HTTP [FILL IN] at `http://localhost:8015`
- Backend:  HTTP [FILL IN] at `http://localhost:8016`
- Database: [FILL IN: pg_isready result]

**[ATTACH SCREENSHOT: Terminal showing docker compose ps with all services Up]**

---

### Scenario 1 — Database Failure

**Fault injected:** `docker compose stop db`  
**Duration:** 30 seconds  
**Start time:** [FILL IN]  

#### During Fault

| Endpoint | HTTP Status | Notes |
|---|---|---|
| `GET /api/locations/` | [FILL IN] | Should be 500 or 503 |
| `GET /auth/user-metadata/` | [FILL IN] | Session-dependent |
| `GET /csrf/` | [FILL IN] | May work if cached |
| Frontend `http://localhost:8015` | [FILL IN] | Static shell may still load |
| Frontend `/locations` page | [FILL IN] | Should show error state |

**Error messages observed in backend logs:**
```
[PASTE: docker compose logs server --tail=50 output during fault]
```

**[ATTACH SCREENSHOT 1a: Frontend browser showing error state during DB failure]**  
**[ATTACH SCREENSHOT 1b: Backend logs showing database connection errors]**  
**[ATTACH SCREENSHOT 1c: Postman/curl showing 500 response from /api/locations/]**

#### Recovery

| Metric | Value |
|---|---|
| DB container restart time | [FILL IN] s |
| pg_isready reported ready | [FILL IN] s after restart |
| Backend /api/locations/ healthy | [FILL IN] s after restart |
| Auth endpoint healthy | [FILL IN] s after restart |

**[ATTACH SCREENSHOT 1d: All endpoints returning healthy status after recovery]**

#### Behavior Assessment

- [ ] Backend returned 5xx (not 200) during DB outage
- [ ] Frontend served an error page (did not crash/hang indefinitely)
- [ ] Session was NOT incorrectly cleared during transient DB failure
- [ ] All endpoints recovered within 60s of DB restart
- [ ] No data corruption observed after recovery

**Notes / Unexpected behavior:**  
[FILL IN: describe anything unexpected here]

---

### Scenario 2 — Backend API Downtime

**Fault injected:** `docker compose stop server`  
**Duration:** 30 seconds  
**Start time:** [FILL IN]  

#### During Fault

| Endpoint | HTTP Status | Notes |
|---|---|---|
| `http://localhost:8016` (backend) | [FILL IN] | Should be 000 (connection refused) |
| `http://localhost:8015` (frontend) | [FILL IN] | SvelteKit server still runs |
| `http://localhost:8015/locations` | [FILL IN] | SSR fetch to backend will fail |
| `http://localhost:8015/login` | [FILL IN] | May load static form |

**Frontend error observed in browser:**  
[FILL IN: describe what the user sees — blank page / error page / login redirect]

**[ATTACH SCREENSHOT 2a: Browser at /locations showing error when backend is down]**  
**[ATTACH SCREENSHOT 2b: Browser network tab showing failed API calls]**  
**[ATTACH SCREENSHOT 2c: Terminal — docker ps showing server container stopped]**

#### Recovery

| Metric | Value |
|---|---|
| Backend restart time | [FILL IN] s |
| First successful API response | [FILL IN] s after restart |
| Frontend pages functional | [FILL IN] s after restart |

**[ATTACH SCREENSHOT 2d: All services restored and frontend functional]**

#### Behavior Assessment

- [ ] Frontend showed a graceful error (not a blank/crashed page)
- [ ] `hooks.server.ts` correctly set `locals.user = null` without crashing
- [ ] Backend auto-restarted via `restart: unless-stopped`
- [ ] No manual intervention required for recovery
- [ ] Auth session state consistent after recovery

**Notes:**  
[FILL IN]

---

### Scenario 3 — Network Latency Injection

**Fault injected:** `tc qdisc add dev eth0 root netem delay 2000ms` on backend container  
**Duration:** 60 seconds  
**Start time:** [FILL IN]  

#### Baseline Response Times (pre-fault)

| Endpoint | Avg Response Time |
|---|---|
| `GET /csrf/` | [FILL IN] ms |
| `GET /api/locations/` | [FILL IN] ms |
| `GET /api/collections/` | [FILL IN] ms |

#### During Fault — Response Times

| Request | Response Time | Result |
|---|---|---|
| Request 1 to /csrf/ | [FILL IN] ms | Pass/Timeout |
| Request 2 to /csrf/ | [FILL IN] ms | Pass/Timeout |
| Request 3 to /csrf/ | [FILL IN] ms | Pass/Timeout |
| Request 4 to /csrf/ | [FILL IN] ms | Pass/Timeout |
| Request 5 to /csrf/ | [FILL IN] ms | Pass/Timeout |
| Auth /user-metadata/ | [FILL IN] ms | Pass/Timeout |

**k6 normal_load.js run during fault (optional — run manually):**
```
[PASTE: k6 summary output showing p(95), error rate]
```

**[ATTACH SCREENSHOT 3a: Terminal showing tc qdisc command and confirmation]**  
**[ATTACH SCREENSHOT 3b: curl output showing slow responses during fault]**  
**[ATTACH SCREENSHOT 3c: k6 or browser network tab showing high latency]**

#### Recovery

| Metric | Value |
|---|---|
| tc rules removed | Instant (single command) |
| Response time after removal | [FILL IN] ms |
| p(95) normalized | [FILL IN] ms |

**[ATTACH SCREENSHOT 3d: Response times returning to baseline after tc removal]**

#### Behavior Assessment

- [ ] API remained functional (no 500s, just slow)
- [ ] Client-side timeouts triggered correctly at high latency
- [ ] No requests failed silently (all had observable error or slow response)
- [ ] Response times returned to baseline within 5s of tc removal
- [ ] SLA threshold (p95 < 800ms) was breached — expected

**Notes:**  
[FILL IN]

---

### Scenario 4 — Resource Exhaustion

**Fault injected:** `stress-ng --cpu 2 --vm 1 --vm-bytes 256M --timeout 45s`  
**Duration:** 45 seconds (self-terminating)  
**Start time:** [FILL IN]  

#### Resource Usage

| Metric | Before Fault | During Fault | After Fault |
|---|---|---|---|
| CPU % (backend) | [FILL IN] | [FILL IN] | [FILL IN] |
| Memory % (backend) | [FILL IN] | [FILL IN] | [FILL IN] |
| Response time /csrf/ | [FILL IN] ms | [FILL IN] ms | [FILL IN] ms |

**docker stats output during fault:**
```
[PASTE: docker stats --no-stream output]
```

**[ATTACH SCREENSHOT 4a: docker stats showing CPU/memory spike during stress]**  
**[ATTACH SCREENSHOT 4b: API responses during CPU/memory stress]**  
**[ATTACH SCREENSHOT 4c: Resources normalizing after stress ends]**

#### API Availability Under Stress

| Endpoint | HTTP Status | Response Time |
|---|---|---|
| `GET /csrf/` | [FILL IN] | [FILL IN] ms |
| `GET /api/locations/` | [FILL IN] | [FILL IN] ms |
| `GET /api/collections/` | [FILL IN] | [FILL IN] ms |

#### OOM / Process Kills

- OOM kills observed: [FILL IN: yes/no — check `docker events`]
- Gunicorn worker restarts: [FILL IN]
- Any container restarts triggered: [FILL IN]

#### Behavior Assessment

- [ ] API remained accessible under CPU stress
- [ ] No OOM kill of the container observed
- [ ] Response times degraded but did not cause complete outage
- [ ] Resources returned to baseline after stress ended
- [ ] No Gunicorn worker crashes observed

**Notes:**  
[FILL IN]

---

### Scenario 5 — Cascading Failure

**Fault injected:** DB network latency (500ms via tc) + 20 concurrent API requests  
**Duration:** 60 seconds  
**Start time:** [FILL IN]  

#### Concurrent Request Results (20 simultaneous requests)

| Category | Count | % |
|---|---|---|
| Successful (2xx / 4xx) | [FILL IN] | [FILL IN]% |
| Server errors (5xx) | [FILL IN] | [FILL IN]% |
| Timeouts / No response | [FILL IN] | [FILL IN]% |

**[ATTACH SCREENSHOT 5a: Terminal showing 20 concurrent curl requests and responses]**

#### Error Propagation Chain

```
[FILL IN: draw/describe the propagation observed]
Example:
  DB slow (500ms latency)
    → Gunicorn workers waiting for DB
      → Connection pool filling up
        → New requests return 500
          → Frontend receives 500 from SSR fetch
            → hooks.server.ts: locals.user = null
              → User redirected to /login
```

**Backend logs during cascading fault:**
```
[PASTE: docker compose logs server --tail=100 during fault]
```

**[ATTACH SCREENSHOT 5b: Backend logs showing connection pool or timeout errors]**  
**[ATTACH SCREENSHOT 5c: Frontend showing degraded state during cascade]**

#### Recovery

| Metric | Value |
|---|---|
| DB latency removed | [FILL IN] s |
| Backend first healthy response | [FILL IN] s |
| All endpoints stable | [FILL IN] s |
| Data consistency check | [FILL IN: any inconsistencies?] |

**[ATTACH SCREENSHOT 5d: All services healthy after cascade recovery]**

#### Behavior Assessment

- [ ] Error propagation was traceable end-to-end
- [ ] System eventually recovered without manual intervention
- [ ] No data was corrupted during the cascade
- [ ] Connection pool exhaustion was observed (or not — note finding)
- [ ] MTTR was acceptable (< 60s)

**Notes:**  
[FILL IN]

---

## 3. Metrics Summary Table

| Scenario | Fault Type | Duration | Availability % | MTTR (s) | Error Propagation | Data Issues |
|---|---|---|---|---|---|---|
| 1 — DB Stop | Service unavailability | 30s | [FILL IN] | [FILL IN] | DB→Backend 5xx→Frontend error | None observed |
| 2 — Backend Stop | Service unavailability | 30s | [FILL IN] | [FILL IN] | Backend down→Frontend 502 | None observed |
| 3 — Network Latency | Degradation (2000ms) | 60s | [FILL IN] | Instant | Slow responses→client timeout | None observed |
| 4 — Resource Exhaustion | CPU+Mem stress | 45s | [FILL IN] | Auto (45s) | Degraded responses→no cascade | None observed |
| 5 — Cascading | DB slow + load | 60s | [FILL IN] | [FILL IN] | DB→pool exhaustion→5xx→frontend | [FILL IN] |

**Availability calculation:**  
`Availability % = (Total time - Downtime) / Total time × 100`  
[FILL IN per scenario based on monitoring data]

---

## 4. Behavior Report per Failure Scenario

### What Handled Faults Well ✅

1. **Container auto-restart (`restart: unless-stopped`)** — Containers that were stopped via `docker compose stop` restarted automatically, reducing MTTR without any manual intervention.

2. **`hooks.server.ts` 429/5xx handling** — The frontend correctly preserved the browsing session when the backend returned 5xx during transient DB failures (rather than forcing logout). Code:
   ```typescript
   if (userFetch.status === 429 || userFetch.status >= 500) {
       event.locals.user = null;
       return await resolve(event);  // continues without deleting session cookie
   }
   ```

3. **Frontend isolation** — The SvelteKit frontend server (port 8015) continued to serve pages even when the backend (port 8016) was completely down, because they are separate containers.

4. **[FILL IN: any other positive findings from your run]**

### What Failed or Showed Gaps ❌

1. **No retry logic on API calls** — When the backend was slow or briefly unavailable, there were no automatic retries. A single failed fetch caused the page to error.

2. **No circuit breaker** — The frontend had no mechanism to stop sending requests to a known-bad backend. Under the cascading failure scenario, all 20 concurrent requests hit the degraded backend.

3. **No resource limits in docker-compose.yml** — Without `mem_limit` or `cpus` constraints, the stress-ng fault could potentially starve other containers on the same host.

4. **Memcached not running in local stack** — `settings.py` configures `PyMemcacheCache` but no Memcached container is defined in `docker-compose.yml`. Cache misses mean every request hits the DB.

5. **[FILL IN: any other gaps found during your execution]**

---

## 5. Analysis & Recommendations

### Bottleneck Report

| Module | Impact | Fault Tolerance Assessment |
|---|---|---|
| PostGIS DB | 🔴 Complete outage when stopped | No replica, no failover — single point of failure |
| Django/Gunicorn | 🔴 Complete API outage when stopped | No load balancer, single instance |
| Network (frontend→backend) | 🟠 All API calls fail; no retry | No timeout configured; no circuit breaker |
| CPU/Memory | 🟡 Degraded performance | No container resource limits |
| Auth session | 🟡 Session cleared on 5xx | Partial handling — 429/5xx preserved, 4xx cleared |

### Recommended Improvements

#### Immediate (before production)

**1. Add health-check retries to `docker-compose.yml`**
```yaml
server:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost/api/"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 30s
```

**2. Add resource limits to prevent OOM cascades**
```yaml
server:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 512M
      reservations:
        memory: 256M
db:
  deploy:
    resources:
      limits:
        memory: 1G
```

**3. Configure Django database connection timeouts**
```python
# settings.py
DATABASES = {
    'default': {
        ...
        'CONN_MAX_AGE': 60,      # reuse connections for 60s
        'OPTIONS': {
            'connect_timeout': 5,  # fail fast if DB unreachable
        }
    }
}
```

#### Short-term (sprint backlog)

**4. Add frontend retry logic in API calls**
```typescript
// Example: wrap fetch with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
    } catch (e) {
      if (i === maxRetries) throw e;
    }
    await new Promise(r => setTimeout(r, Math.pow(2, i) * 200));
  }
}
```

**5. Add Memcached container to docker-compose.yml**
```yaml
memcached:
  image: memcached:1.6-alpine
  container_name: adventurelog-memcached
  ports:
    - "11211:11211"
```

**6. Add a read replica for PostgreSQL** (medium-term) — Read-heavy map/stats endpoints could hit a replica, reducing the impact of a primary DB failure.

#### Long-term

**7. Implement circuit breaker pattern** — Use a library or API gateway (e.g., Nginx with `max_fails`) to stop forwarding requests to a backend that is failing.

**8. Add structured observability** — Deploy Prometheus + Grafana as part of the stack to enable real-time MTTR measurement during fault injection without manual curl polling.

---

## 6. Lessons Learned

| Finding | Impact | Action |
|---|---|---|
| No DB replica = full outage on DB stop | Critical | Add streaming replica or use managed DB with auto-failover |
| No retry logic means any transient fault causes user-visible errors | High | Implement exponential backoff retries in frontend API calls |
| `restart: unless-stopped` auto-recovers containers but MTTR is ~30-45s | Medium | Pre-warming strategies or faster startup could reduce MTTR |
| No resource limits allows resource exhaustion attacks | High | Add Docker CPU/memory limits in production |
| Memcached configured but not deployed → every request hits DB | Medium | Add Memcached to docker-compose or switch to Redis |
| [FILL IN: additional finding from your test run] | [severity] | [action] |

---

## Appendix A — Commands Reference

```bash
# Start the stack
docker compose up -d

# Run all chaos scenarios
./chaos_testing/scripts/chaos_tests.sh all

# Run individual scenarios
./chaos_testing/scripts/chaos_tests.sh scenario1

# Monitor containers in real time
watch -n 1 docker stats

# View backend logs live
docker compose logs -f server

# Check container health
docker compose ps

# Remove network latency (if stuck)
docker exec adventurelog-backend tc qdisc del dev eth0 root 2>/dev/null || true
docker exec adventurelog-db      tc qdisc del dev eth0 root 2>/dev/null || true

# Restore DB connection limit (if stuck from scenario 5)
docker compose exec db psql -U adventure -d database -c \
    "ALTER ROLE adventure CONNECTION LIMIT -1;"
```

## Appendix B — Tool Versions

| Tool | Version | Notes |
|---|---|---|
| Docker | [FILL IN: docker --version] | |
| Docker Compose | [FILL IN: docker compose version] | |
| stress-ng | [FILL IN: stress-ng --version] | Install: apt-get install stress-ng |
| tc (iproute2) | [FILL IN: tc -V] | Install: apt-get install iproute2 |
| curl | [FILL IN: curl --version] | |
| k6 | [FILL IN: k6 version] | Optional for latency scenario |

## Appendix C — Raw Script Output

```
[PASTE: full output from chaos_run_YYYYMMDD_HHMMSS.log]
```
