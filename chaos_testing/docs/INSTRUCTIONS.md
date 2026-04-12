# Chaos Testing — Step-by-Step Instructions
## AdventureLog

---

## What Is Chaos / Fault Injection Testing (vs Other Tests)?

| Test type | What it breaks | Who breaks it | What you measure |
|---|---|---|---|
| Unit tests | Nothing — tests isolated logic | You (via assertions) | Code correctness |
| Integration tests | Nothing — tests real modules talking | You (via API calls) | Module interaction |
| E2E tests | Nothing — tests full user flows | You (via browser) | User experience |
| Performance tests | Nothing — measures speed under load | Load generator (k6) | Response time, throughput |
| **Chaos tests** | **The infrastructure itself** | **You (controlled fault injection)** | **Resilience, recovery time** |

Chaos testing asks: *"What happens when things fail in production — does the system recover gracefully or collapse?"*  
The other tests ask: *"Does the code do what I expect when everything works?"*

---

## Prerequisites

### 1. Install required tools

**On Windows (WSL2 / Git Bash):**
```bash
# Open WSL2 terminal
sudo apt-get update
sudo apt-get install -y iproute2 stress-ng curl
```

**On macOS:**
```bash
brew install iproute2mac
# stress-ng via MacPorts or use Docker-based stress (script handles this automatically)
```

**Verify Docker is running:**
```bash
docker --version
docker compose version
```

### 2. Ensure the AdventureLog stack is running

```bash
# From the AdventureLog repo root
docker compose up -d

# Wait ~45 seconds, then verify all three containers are Up
docker compose ps
```

Expected output:
```
NAME                      STATUS          PORTS
adventurelog-frontend     Up              0.0.0.0:8015->3000/tcp
adventurelog-backend      Up              0.0.0.0:8016->80/tcp
adventurelog-db           Up              5432/tcp
```

### 3. Verify stack is healthy before starting

```bash
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:8015
curl -s -o /dev/null -w "Backend:  %{http_code}\n" http://localhost:8016
```

Both should return non-zero HTTP codes (200, 301, etc. — not 000).

---

## File Placement

Place the chaos testing files in your repository:

```
AdventureLog/
└── chaos_testing/
    ├── scripts/
    │   └── chaos_tests.sh          ← the test runner (this file)
    ├── docs/
    │   └── chaos_test_report.md    ← report template (fill in after running)
    └── reports/                    ← auto-created by the script, contains results
```

Make the script executable:
```bash
chmod +x chaos_testing/scripts/chaos_tests.sh
```

---

## How to Run

### Run all 5 scenarios sequentially

```bash
# From the AdventureLog repo root
./chaos_testing/scripts/chaos_tests.sh all
```

Expected total runtime: ~5–7 minutes (plus 15s gaps between scenarios for stack stabilization).

### Run a single scenario

```bash
./chaos_testing/scripts/chaos_tests.sh scenario1   # DB failure
./chaos_testing/scripts/chaos_tests.sh scenario2   # Backend downtime
./chaos_testing/scripts/chaos_tests.sh scenario3   # Network latency
./chaos_testing/scripts/chaos_tests.sh scenario4   # CPU/Memory stress
./chaos_testing/scripts/chaos_tests.sh scenario5   # Cascading failure
```

### Monitor in a second terminal while running

Open a second terminal and run:
```bash
# Watch all container resource usage live
watch -n 2 docker stats

# Or watch container status
watch -n 1 docker compose ps

# Or tail backend logs live
docker compose logs -f server
```

---

## What to Do During Each Scenario

### Scenario 1 (DB Stop) — ~2 minutes
1. **Start the script** in Terminal 1
2. **Open your browser** to `http://localhost:8015/locations`
3. When the script says `INJECTING FAULT`, **refresh the browser**
4. **Take a screenshot** of what the browser shows (error page, blank page, etc.)
5. Open browser **DevTools → Network tab** — take a screenshot of failed requests
6. When the script says `RECOVERING`, watch the browser come back
7. **Take a screenshot** of successful recovery

### Scenario 2 (Backend Stop) — ~2 minutes
Same as Scenario 1 — watch the frontend at `http://localhost:8015`

### Scenario 3 (Network Latency) — ~3 minutes
1. Start the script
2. In another terminal, run repeated curl timing:
   ```bash
   while true; do
     curl -s -o /dev/null -w "$(date +%H:%M:%S) → %{time_total}s\n" http://localhost:8016/csrf/
     sleep 2
   done
   ```
3. **Take a screenshot** of the terminal showing slow responses (~2s each)
4. Optionally run k6 during fault:
   ```bash
   k6 run performance/k6/normal_load.js \
     -e BASE_URL=http://localhost:8016 \
     -e TEST_USERNAME=admin \
     -e TEST_PASSWORD=Admin1234!
   ```
5. Take screenshot of k6 output showing high p(95)

### Scenario 4 (Resource Exhaustion) — ~3 minutes
1. Start the script
2. In another terminal:
   ```bash
   watch -n 1 "docker stats --no-stream adventurelog-backend"
   ```
3. **Take a screenshot** when CPU% spikes during stress
4. Take another screenshot after stress ends showing recovery

### Scenario 5 (Cascading) — ~3 minutes
1. Start the script
2. Watch both terminals (backend logs + docker stats)
3. Note any 500 errors in the concurrent request results
4. **Take a screenshot** of backend logs showing errors

---

## After Running — Filling in the Report

Once the script completes, reports are in `chaos_testing/reports/`:

```
chaos_testing/reports/
├── chaos_run_20260412_120000.log    ← full console output
├── scenario1_results.txt            ← auto-generated data
├── scenario2_results.txt
├── scenario3_results.txt
├── scenario4_results.txt
└── scenario5_results.txt
```

1. **Open `chaos_test_report.md`** in your editor
2. For each scenario, copy values from the corresponding `scenarioN_results.txt`
3. Fill in every `[FILL IN]` placeholder
4. Attach screenshots where `[ATTACH SCREENSHOT]` markers appear
5. Fill in the metrics summary table (Section 3)
6. Calculate availability %:
   ```
   Availability % = ((fault_window - downtime_seconds) / fault_window) × 100
   Example: 30s window, 25s downtime → (5/30) × 100 = 83.3%
   ```

---

## Emergency Recovery Commands

If the script is interrupted and leaves the stack in a broken state:

```bash
# Restart all containers
docker compose restart

# Remove stuck network latency rules
docker exec adventurelog-backend tc qdisc del dev eth0 root 2>/dev/null || true
docker exec adventurelog-db      tc qdisc del dev eth0 root 2>/dev/null || true

# Restore DB connection limits (if Scenario 5 left them reduced)
docker compose exec db psql -U adventure -d database \
    -c "ALTER ROLE adventure CONNECTION LIMIT -1;"

# Kill any stuck stress-ng processes
docker compose exec server pkill stress-ng 2>/dev/null || true
docker compose exec server pkill python3  2>/dev/null || true

# Full reset
docker compose down && docker compose up -d
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `tc: command not found` in container | Script falls back to Python stress loop automatically |
| `stress-ng: command not found` | Script falls back to Python thread-based stress |
| `preflight_check` fails | Make sure `docker compose up -d` ran and wait 45s for migrations |
| Scenario 1 backend returns 200 during DB stop | DB queries may be cached; this is a finding — note it |
| Script exits early with error | Run `docker compose down && docker compose up -d`, wait 60s, retry |
| `tc qdisc del` error after script | Rule may already be deleted — ignore this error |
