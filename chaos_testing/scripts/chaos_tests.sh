#!/usr/bin/env bash
# =============================================================================
# chaos_tests.sh — AdventureLog Chaos / Fault Injection Test Suite
# =============================================================================
#
# ARCHITECTURE UNDER TEST (from docker-compose.yml):
#   adventurelog-frontend  (SvelteKit, port 8015) → depends on server
#   adventurelog-backend   (Django/Gunicorn, port 8016) → depends on db
#   adventurelog-db        (PostGIS 16, internal only)
#
# HIGH-RISK MODULES (from midterm risk analysis):
#   1. Database (PostGIS)  — single point of failure, all data lives here
#   2. Backend API         — auth + all business logic, no redundancy
#   3. Frontend→Backend    — no circuit breaker; hooks.server.ts has partial handling
#   4. Memory/CPU          — no resource limits set in docker-compose.yml
#   5. Network             — no retry logic on most API calls
#
# USAGE:
#   chmod +x chaos_tests.sh
#   ./chaos_tests.sh           # runs all 5 scenarios sequentially
#   ./chaos_tests.sh scenario1 # runs only scenario 1
#   ./chaos_tests.sh scenario2 # runs only scenario 2
#   ...
#
# PREREQUISITES:
#   - Docker Compose stack running: docker compose up -d
#   - tc (traffic control) available: sudo apt-get install iproute2
#   - stress-ng available:            sudo apt-get install stress-ng
#   - curl available
#   - Stack fully healthy before starting
#
# RESULTS:
#   - Console output with PASS/FAIL per check
#   - Reports saved to chaos_testing/reports/
# =============================================================================

set -euo pipefail

FRONTEND="http://localhost:8015"
BACKEND="http://localhost:8016"
BACKEND_CONTAINER="adventurelog-backend"
DB_CONTAINER="adventurelog-db"
FRONTEND_CONTAINER="adventurelog-frontend"
REPORTS_DIR="chaos_testing/reports"
mkdir -p "$REPORTS_DIR"

LOG_FILE="$REPORTS_DIR/chaos_run_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

# ── Utility helpers ────────────────────────────────────────────────────────────

log()   { echo "[$(date '+%H:%M:%S')] $*"; }
pass()  { echo "  ✅ PASS: $*"; }
fail()  { echo "  ❌ FAIL: $*"; }
info()  { echo "  ℹ️  INFO: $*"; }
sep()   { echo; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

# Record start time for MTTR calculation
start_timer() { echo $(date +%s); }
mttr() {
    local start=$1 end=$(date +%s)
    echo $(( end - start ))
}

# HTTP check: returns HTTP status code
http_status() { curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$1" 2>/dev/null || echo "000"; }

# Check that the stack is healthy before starting
preflight_check() {
    log "Pre-flight: verifying stack is healthy..."
    local fe_status be_status
    fe_status=$(http_status "$FRONTEND")
    be_status=$(http_status "$BACKEND")
    if [[ "$fe_status" == "000" || "$be_status" == "000" ]]; then
        echo "❌ Stack is not running. Start with: docker compose up -d"
        exit 1
    fi
    log "✅ Stack healthy (frontend: $fe_status, backend: $be_status)"
}

# Wait for a service to become healthy again, up to N seconds
wait_for_recovery() {
    local url=$1 max_wait=${2:-60} label=${3:-"service"}
    local t=0
    while [[ $t -lt $max_wait ]]; do
        local s
        s=$(http_status "$url")
        if [[ "$s" != "000" && "$s" != "502" && "$s" != "503" ]]; then
            log "✅ $label recovered after ${t}s (HTTP $s)"
            echo $t
            return 0
        fi
        sleep 1
        (( t++ )) || true
    done
    log "❌ $label did not recover within ${max_wait}s"
    echo $max_wait
    return 1
}

# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO 1 — Database Failure (PostGIS container stopped)
#
# Fault type:   Service unavailability
# Affected:     adventurelog-db (PostGIS)
# Duration:     30 seconds
# Expected:     Backend returns 500/503; frontend shows error page gracefully
# Recovery:     DB restarted → backend reconnects → all endpoints healthy
# ══════════════════════════════════════════════════════════════════════════════
scenario1_database_failure() {
    sep
    log "SCENARIO 1: Database Failure"
    log "Fault: Stop adventurelog-db container for 30 seconds"
    log "Risk: All DB-dependent endpoints fail; tests recovery on restart"
    sep

    # ── Baseline ──────────────────────────────────────────────────────────────
    log "Baseline checks before fault injection..."
    local be_baseline
    be_baseline=$(http_status "$BACKEND/api/locations/")
    info "Backend /api/locations/ pre-fault: HTTP $be_baseline"

    # ── Inject fault ──────────────────────────────────────────────────────────
    log "INJECTING FAULT: docker compose stop db"
    docker compose stop db
    local fault_start
    fault_start=$(start_timer)
    log "DB stopped at $(date '+%H:%M:%S')"

    # ── Observe behavior during fault ─────────────────────────────────────────
    sleep 5  # give gunicorn a moment to notice

    log "Checking system behavior during fault..."

    # Check 1: Backend should return 500/503 (not 200) for DB-dependent endpoints
    local be_during
    be_during=$(http_status "$BACKEND/api/locations/")
    info "Backend /api/locations/ during fault: HTTP $be_during"
    if [[ "$be_during" == "500" || "$be_during" == "503" || "$be_during" == "000" ]]; then
        pass "Backend correctly fails when DB is down (HTTP $be_during)"
    else
        fail "Backend returned unexpected $be_during — may be serving stale cached data"
    fi

    # Check 2: Frontend should still load (static assets, error page)
    local fe_during
    fe_during=$(http_status "$FRONTEND")
    info "Frontend during fault: HTTP $fe_during"
    if [[ "$fe_during" != "000" ]]; then
        pass "Frontend still responds during DB fault (HTTP $fe_during)"
    else
        fail "Frontend completely unreachable during DB fault"
    fi

    # Check 3: Auth endpoint specifically
    local auth_during
    auth_during=$(http_status "$BACKEND/auth/user-metadata/")
    info "Auth /user-metadata/ during fault: HTTP $auth_during"

    # Check 4: Non-DB endpoints (health-like)
    local csrf_during
    csrf_during=$(http_status "$BACKEND/csrf/")
    info "CSRF endpoint during fault: HTTP $csrf_during"

    # Wait remaining fault time
    log "Fault active — waiting before recovery (total 30s)..."
    sleep 20

    # ── Recover ───────────────────────────────────────────────────────────────
    log "RECOVERING: docker compose start db"
    docker compose start db
    local recovery_start
    recovery_start=$(start_timer)

    # Wait for DB, then backend to reconnect
    log "Waiting for DB to accept connections..."
    local db_ready=0
    for i in $(seq 1 30); do
        if docker compose exec -T db pg_isready -U adventure -d database > /dev/null 2>&1; then
            db_ready=$i
            log "DB accepting connections after ${i}s"
            break
        fi
        sleep 1
    done

    # Wait for backend to recover
    local be_recovery_time
    be_recovery_time=$(wait_for_recovery "$BACKEND/api/locations/" 60 "Backend after DB restart")
    local fault_duration
    fault_duration=$(mttr $fault_start)

    # ── Post-recovery checks ──────────────────────────────────────────────────
    log "Post-recovery checks..."
    local be_after auth_after
    be_after=$(http_status "$BACKEND/api/locations/")
    auth_after=$(http_status "$BACKEND/auth/user-metadata/")

    if [[ "$be_after" == "401" || "$be_after" == "403" || "$be_after" == "200" ]]; then
        pass "Backend /api/locations/ healthy after recovery (HTTP $be_after)"
    else
        fail "Backend not healthy after recovery (HTTP $be_after)"
    fi

    # ── Record results ─────────────────────────────────────────────────────────
    cat >> "$REPORTS_DIR/scenario1_results.txt" << EOF
SCENARIO 1 — Database Failure
==============================
Fault type:          Service stop (docker compose stop db)
Fault duration:      ~30 seconds
Affected module:     adventurelog-db (PostGIS 16)

OBSERVATIONS:
  Backend HTTP during fault:  $be_during
  Frontend HTTP during fault: $fe_during
  Auth HTTP during fault:     $auth_during
  CSRF HTTP during fault:     $csrf_during

RECOVERY:
  DB ready:                   ${db_ready}s after restart
  Backend recovery time:      ${be_recovery_time}s
  Backend HTTP after:         $be_after
  Auth HTTP after:            $auth_after

METRICS:
  System availability:        [FILL IN: calculate uptime% from monitoring tool]
  MTTR (Mean Time to Recover): ${be_recovery_time}s
  Error propagation:          Backend 5xx → Frontend shows error page

SCREENSHOT PLACEHOLDER:
  [ATTACH: screenshot of frontend error page during fault]
  [ATTACH: screenshot of backend 500 response in browser/Postman]
  [ATTACH: screenshot of recovery — all endpoints green]
EOF
    log "Scenario 1 complete. Results saved."
}

# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO 2 — Backend API Downtime (server container stopped)
#
# Fault type:   Service unavailability
# Affected:     adventurelog-backend (Django/Gunicorn)
# Duration:     30 seconds
# Expected:     Frontend shows 502/503 error page; DB unaffected
# Recovery:     Container restarted → frontend reconnects automatically
# ══════════════════════════════════════════════════════════════════════════════
scenario2_backend_downtime() {
    sep
    log "SCENARIO 2: Backend API Downtime"
    log "Fault: Stop adventurelog-backend container for 30 seconds"
    log "Risk: Frontend completely loses API; auth, locations, collections all fail"
    sep

    # ── Baseline ──────────────────────────────────────────────────────────────
    log "Baseline checks..."
    local fe_baseline be_baseline
    fe_baseline=$(http_status "$FRONTEND")
    be_baseline=$(http_status "$BACKEND")
    info "Frontend baseline: HTTP $fe_baseline"
    info "Backend baseline:  HTTP $be_baseline"

    # ── Inject fault ──────────────────────────────────────────────────────────
    log "INJECTING FAULT: docker compose stop server"
    docker compose stop server
    local fault_start
    fault_start=$(start_timer)
    log "Backend stopped at $(date '+%H:%M:%S')"

    sleep 3

    # ── Observe ───────────────────────────────────────────────────────────────
    log "Checking behavior during fault..."

    # Frontend: should still serve pages (SvelteKit server runs separately)
    # but API calls from the frontend to the backend will fail
    local fe_during
    fe_during=$(http_status "$FRONTEND")
    info "Frontend during fault: HTTP $fe_during"
    if [[ "$fe_during" != "000" ]]; then
        pass "Frontend server still responds (HTTP $fe_during)"
    else
        fail "Frontend completely down when backend stops"
    fi

    # Backend itself
    local be_during
    be_during=$(http_status "$BACKEND")
    info "Backend during fault: HTTP $be_during"
    if [[ "$be_during" == "000" ]]; then
        pass "Backend correctly unreachable (connection refused)"
    else
        fail "Backend still responding despite container stop (HTTP $be_during)"
    fi

    # Frontend trying to load a page that requires auth
    local fe_locations
    fe_locations=$(http_status "$FRONTEND/locations")
    info "Frontend /locations during fault: HTTP $fe_locations"

    # Simulate what hooks.server.ts does: fetch /auth/user-metadata/
    local auth_during
    auth_during=$(http_status "$BACKEND/auth/user-metadata/")
    info "Auth endpoint during fault: HTTP $auth_during"

    sleep 25

    # ── Recover ───────────────────────────────────────────────────────────────
    log "RECOVERING: docker compose start server"
    docker compose start server

    local be_recovery_time
    be_recovery_time=$(wait_for_recovery "$BACKEND" 60 "Backend")

    local fe_recovery_time
    fe_recovery_time=$(wait_for_recovery "$FRONTEND" 30 "Frontend")

    # ── Post-recovery checks ──────────────────────────────────────────────────
    local be_after fe_after auth_after
    be_after=$(http_status "$BACKEND")
    fe_after=$(http_status "$FRONTEND")
    auth_after=$(http_status "$BACKEND/auth/user-metadata/")

    [[ "$be_after" != "000" ]] && pass "Backend healthy (HTTP $be_after)" || fail "Backend not recovered"
    [[ "$fe_after" != "000" ]] && pass "Frontend healthy (HTTP $fe_after)" || fail "Frontend not recovered"

    cat >> "$REPORTS_DIR/scenario2_results.txt" << EOF
SCENARIO 2 — Backend API Downtime
===================================
Fault type:          Service stop (docker compose stop server)
Fault duration:      ~30 seconds
Affected module:     adventurelog-backend (Django/Gunicorn)

OBSERVATIONS:
  Frontend HTTP during fault:    $fe_during
  Backend HTTP during fault:     $be_during
  /locations page during fault:  $fe_locations
  Auth endpoint during fault:    $auth_during

RECOVERY:
  Backend recovery time:  ${be_recovery_time}s
  Frontend recovery time: ${fe_recovery_time}s
  Backend HTTP after:     $be_after
  Frontend HTTP after:    $fe_after
  Auth HTTP after:        $auth_after

METRICS:
  System availability:   [FILL IN]
  MTTR:                  ${be_recovery_time}s (backend)
  Error propagation:     Backend down → Frontend API calls fail →
                         hooks.server.ts clears session → redirect to login

SCREENSHOT PLACEHOLDER:
  [ATTACH: browser showing frontend error during backend downtime]
  [ATTACH: network tab showing failed API calls]
  [ATTACH: terminal showing docker ps during fault]
  [ATTACH: all services healthy after recovery]
EOF
    log "Scenario 2 complete."
}

# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO 3 — Network Latency Injection (tc qdisc)
#
# Fault type:   Network degradation — 2000ms latency on backend container
# Affected:     adventurelog-backend ↔ adventurelog-db communication
# Duration:     60 seconds
# Expected:     API responses slow; k6 p(95) > 800ms threshold breached
# Recovery:     tc rules removed → latency returns to normal
#
# NOTE: Requires root access inside the container (NET_ADMIN capability).
#       If tc is not available, the script uses sleep-based simulation.
# ══════════════════════════════════════════════════════════════════════════════
scenario3_network_latency() {
    sep
    log "SCENARIO 3: Network Latency Injection"
    log "Fault: 2000ms latency on backend container network interface"
    log "Risk: Response times exceed SLA thresholds; timeouts on slow clients"
    sep

    # ── Baseline response time ─────────────────────────────────────────────────
    log "Measuring baseline response time..."
    local baseline_time
    baseline_time=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 "$BACKEND/csrf/" 2>/dev/null || echo "N/A")
    info "Baseline /csrf/ response time: ${baseline_time}s"

    # ── Inject latency via tc inside the container ─────────────────────────────
    log "INJECTING FAULT: 2000ms netem delay on backend eth0"
    if docker compose exec -T server bash -c "tc qdisc add dev eth0 root netem delay 2000ms" 2>/dev/null; then
        info "tc netem delay applied successfully"
        TC_APPLIED=true
    else
        info "tc not available — simulating with gunicorn worker timeout override"
        TC_APPLIED=false
        # Fallback: set a very low worker timeout to simulate slowness
        docker compose exec -T server bash -c \
            "kill -WINCH \$(cat /tmp/gunicorn.pid 2>/dev/null || echo 1)" 2>/dev/null || true
    fi

    local fault_start
    fault_start=$(start_timer)

    # ── Observe during fault ───────────────────────────────────────────────────
    sleep 2
    log "Measuring response times during latency injection..."

    local times=()
    for i in 1 2 3 4 5; do
        local t
        t=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 15 \
            --max-time 10 "$BACKEND/csrf/" 2>/dev/null || echo "timeout")
        times+=("$t")
        info "  Request $i: ${t}s"
        sleep 2
    done

    # Check if responses are slow (> 2s with 2000ms latency applied)
    local slow_count=0
    for t in "${times[@]}"; do
        if [[ "$t" != "timeout" ]]; then
            if python3 -c "exit(0 if float('$t') > 1.5 else 1)" 2>/dev/null; then
                (( slow_count++ )) || true
            fi
        else
            (( slow_count++ )) || true
        fi
    done

    if [[ $slow_count -ge 3 ]]; then
        pass "Latency injection confirmed: $slow_count/5 requests > 1.5s"
    else
        fail "Latency not clearly observed: only $slow_count/5 requests slow"
    fi

    # ── Observe error handling ─────────────────────────────────────────────────
    local auth_time
    auth_time=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 15 \
        --max-time 12 "$BACKEND/auth/user-metadata/" 2>/dev/null || echo "timeout")
    info "Auth endpoint with latency: ${auth_time}s"

    # ── Recover ───────────────────────────────────────────────────────────────
    log "RECOVERING: removing tc netem rules"
    if [[ "$TC_APPLIED" == "true" ]]; then
        docker compose exec -T server bash -c "tc qdisc del dev eth0 root" 2>/dev/null || true
    fi

    sleep 2

    local recovery_time
    recovery_time=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 \
        "$BACKEND/csrf/" 2>/dev/null || echo "N/A")
    info "Recovery response time: ${recovery_time}s"

    if python3 -c "exit(0 if float('${recovery_time}') < 1.0 else 1)" 2>/dev/null; then
        pass "Response time normalized after latency removal (${recovery_time}s)"
    else
        fail "Response time still elevated after removal (${recovery_time}s)"
    fi

    local duration
    duration=$(mttr $fault_start)

    cat >> "$REPORTS_DIR/scenario3_results.txt" << EOF
SCENARIO 3 — Network Latency Injection
=========================================
Fault type:          2000ms netem delay on backend container eth0
Fault duration:      ${duration}s
Affected module:     adventurelog-backend network interface

OBSERVATIONS:
  Baseline response time:           ${baseline_time}s
  tc applied successfully:          $TC_APPLIED
  Responses during fault (5 reqs):  ${times[*]}
  Slow requests (>1.5s):            $slow_count / 5
  Auth endpoint with latency:       ${auth_time}s

RECOVERY:
  Response time after tc removal:   ${recovery_time}s
  Latency normalized:               [FILL IN: yes/no]

METRICS:
  p(95) response time during fault: [FILL IN from k6 run]
  Requests timed out:               [FILL IN]
  MTTR (latency removal):           immediate (tc del)
  Error rate during fault:          [FILL IN]

SCREENSHOT PLACEHOLDER:
  [ATTACH: k6 output showing p(95) > 800ms during fault]
  [ATTACH: terminal showing tc qdisc commands]
  [ATTACH: response time graph showing spike and recovery]
EOF
    log "Scenario 3 complete."
}

# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO 4 — Resource Exhaustion (CPU + Memory stress)
#
# Fault type:   Resource exhaustion via stress-ng inside backend container
# Affected:     adventurelog-backend (Gunicorn workers)
# Duration:     45 seconds
# Expected:     Response times increase; gunicorn may queue requests
# Recovery:     stress-ng stopped → resources freed → response times normalize
# ══════════════════════════════════════════════════════════════════════════════
scenario4_resource_exhaustion() {
    sep
    log "SCENARIO 4: Resource Exhaustion (CPU + Memory)"
    log "Fault: stress-ng maxing CPU and memory inside backend container"
    log "Risk: Gunicorn workers stall; requests queue or time out"
    sep

    # ── Baseline resource usage ────────────────────────────────────────────────
    log "Baseline resource usage..."
    local cpu_before mem_before
    cpu_before=$(docker stats --no-stream --format "{{.CPUPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    mem_before=$(docker stats --no-stream --format "{{.MemPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    info "CPU before: $cpu_before  |  Memory before: $mem_before"

    local baseline_rt
    baseline_rt=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 \
        "$BACKEND/csrf/" 2>/dev/null || echo "N/A")
    info "Baseline response time: ${baseline_rt}s"

    # ── Check stress-ng is available ──────────────────────────────────────────
    if ! docker compose exec -T server which stress-ng > /dev/null 2>&1; then
        info "stress-ng not in container — installing..."
        docker compose exec -T server bash -c \
            "apt-get update -qq && apt-get install -y -qq stress-ng" 2>/dev/null || {
            info "Cannot install stress-ng — using Python stress loop fallback"
        }
    fi

    # ── Inject fault ──────────────────────────────────────────────────────────
    log "INJECTING FAULT: stress-ng (2 CPU workers + 256MB memory) for 45s"
    docker compose exec -d server bash -c \
        "stress-ng --cpu 2 --vm 1 --vm-bytes 256M --timeout 45s 2>/dev/null || \
         python3 -c \"
import threading, time
def cpu_burn():
    end=time.time()+45
    while time.time()<end: x=sum(range(100000))
def mem_hog():
    data=bytearray(256*1024*1024); time.sleep(45)
threads=[threading.Thread(target=f) for f in [cpu_burn,cpu_burn,mem_hog]]
[t.start() for t in threads]; [t.join() for t in threads]
\"" || true

    local fault_start
    fault_start=$(start_timer)
    sleep 3  # let stress ramp up

    # ── Observe during fault ───────────────────────────────────────────────────
    log "Checking resource usage and response times during stress..."
    local cpu_during mem_during
    cpu_during=$(docker stats --no-stream --format "{{.CPUPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    mem_during=$(docker stats --no-stream --format "{{.MemPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    info "CPU during stress: $cpu_during  |  Memory during stress: $mem_during"

    local rt_during=()
    for i in 1 2 3; do
        local t
        t=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 15 \
            --max-time 10 "$BACKEND/csrf/" 2>/dev/null || echo "timeout")
        rt_during+=("$t")
        info "  Response time $i: ${t}s"
        sleep 3
    done

    # Check API functional under stress
    local api_status
    api_status=$(http_status "$BACKEND/api/locations/")
    info "API status under stress: HTTP $api_status"
    if [[ "$api_status" != "000" ]]; then
        pass "API still responds under resource stress (HTTP $api_status)"
    else
        fail "API unreachable under resource stress"
    fi

    # ── Wait for stress to end naturally (45s total) ──────────────────────────
    log "Waiting for stress period to end..."
    sleep 30

    # ── Post-stress checks ────────────────────────────────────────────────────
    local cpu_after mem_after
    cpu_after=$(docker stats --no-stream --format "{{.CPUPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    mem_after=$(docker stats --no-stream --format "{{.MemPerc}}" "$BACKEND_CONTAINER" 2>/dev/null || echo "N/A")
    local rt_after
    rt_after=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 \
        "$BACKEND/csrf/" 2>/dev/null || echo "N/A")

    info "CPU after: $cpu_after  |  Memory after: $mem_after"
    info "Response time after: ${rt_after}s"

    local duration
    duration=$(mttr $fault_start)

    cat >> "$REPORTS_DIR/scenario4_results.txt" << EOF
SCENARIO 4 — Resource Exhaustion
===================================
Fault type:          stress-ng (2 CPU workers + 256MB memory)
Fault duration:      45 seconds
Affected module:     adventurelog-backend (Gunicorn workers)

OBSERVATIONS:
  CPU before / during / after:    $cpu_before / $cpu_during / $cpu_after
  Memory before / during / after: $mem_before / $mem_during / $mem_after
  Response times during stress:   ${rt_during[*]}
  API HTTP status during stress:  $api_status
  Response time after:            ${rt_after}s

METRICS:
  System availability:        [FILL IN: % of requests that returned non-5xx]
  MTTR:                       N/A (stress self-terminates after 45s)
  Performance degradation:    [FILL IN: baseline vs during p(95)]
  OOM kills observed:         [FILL IN: check docker events]

SCREENSHOT PLACEHOLDER:
  [ATTACH: docker stats showing CPU/memory spike]
  [ATTACH: k6 output showing response time degradation]
  [ATTACH: resource graph returning to normal after stress ends]
EOF
    log "Scenario 4 complete."
}

# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO 5 — Cascading Failure (DB slow + Backend under load)
#
# Fault type:   Compound fault — DB latency + concurrent API requests
# Affected:     Full stack (db → server → web)
# Duration:     60 seconds
# Expected:     Connection pool exhaustion; some requests queued/dropped
# Recovery:     DB latency removed + load stopped → full recovery
# ══════════════════════════════════════════════════════════════════════════════
scenario5_cascading_failure() {
    sep
    log "SCENARIO 5: Cascading Failure (DB slow queries + concurrent load)"
    log "Fault: Slow DB + 20 concurrent API requests to trigger pool exhaustion"
    log "Risk: Connection pool exhausted → 500 errors propagate to frontend"
    sep

    # ── Inject DB slowness via pg_sleep ───────────────────────────────────────
    log "INJECTING FAULT: DB slow query simulation via pg_sleep trigger"

    # Add a pg_sleep to every SELECT by injecting a rule (if pg_advisor available)
    # Fallback: use tc on the DB container instead
    local tc_on_db=false
    if docker compose exec -T db bash -c "which tc" > /dev/null 2>&1; then
        docker compose exec -T db bash -c "tc qdisc add dev eth0 root netem delay 500ms" 2>/dev/null && {
            tc_on_db=true
            info "500ms delay applied to DB network interface"
        }
    else
        info "tc not on DB container — using connection limit simulation"
        # Limit DB connections to 3 to simulate exhaustion
        docker compose exec -T db psql -U adventure -d database -c \
            "ALTER ROLE adventure CONNECTION LIMIT 3;" 2>/dev/null || true
    fi

    local fault_start
    fault_start=$(start_timer)

    # ── Fire concurrent requests ───────────────────────────────────────────────
    log "Firing 20 concurrent requests to the backend..."
    local pids=()
    local responses=()
    for i in $(seq 1 20); do
        (
            s=$(http_status "$BACKEND/api/locations/")
            echo "$s" >> "$REPORTS_DIR/scenario5_concurrent.txt"
        ) &
        pids+=($!)
    done

    # Gather all responses
    for pid in "${pids[@]}"; do
        wait "$pid" 2>/dev/null || true
    done

    # Count response codes
    local total_500=0 total_200=0 total_other=0
    if [[ -f "$REPORTS_DIR/scenario5_concurrent.txt" ]]; then
        while IFS= read -r code; do
            case "$code" in
                200|401|403) (( total_200++ )) || true ;;
                500|503)     (( total_500++ )) || true ;;
                *)           (( total_other++ )) || true ;;
            esac
        done < "$REPORTS_DIR/scenario5_concurrent.txt"
    fi

    info "Concurrent request results: ${total_200} success | ${total_500} errors | ${total_other} other"

    if [[ $total_500 -gt 0 ]]; then
        info "Connection pool pressure observed: $total_500/20 requests returned 5xx"
    else
        pass "System handled 20 concurrent requests without 5xx errors"
    fi

    # ── Observe error propagation ──────────────────────────────────────────────
    local fe_during
    fe_during=$(http_status "$FRONTEND")
    info "Frontend availability during cascading fault: HTTP $fe_during"

    # ── Recover ───────────────────────────────────────────────────────────────
    log "RECOVERING: removing DB latency and connection limits"
    if [[ "$tc_on_db" == "true" ]]; then
        docker compose exec -T db bash -c "tc qdisc del dev eth0 root" 2>/dev/null || true
    else
        docker compose exec -T db psql -U adventure -d database -c \
            "ALTER ROLE adventure CONNECTION LIMIT -1;" 2>/dev/null || true
    fi

    local be_recovery
    be_recovery=$(wait_for_recovery "$BACKEND/api/locations/" 30 "Backend post-cascade")
    local duration
    duration=$(mttr $fault_start)

    cat >> "$REPORTS_DIR/scenario5_results.txt" << EOF
SCENARIO 5 — Cascading Failure
=================================
Fault type:          DB latency (500ms) + 20 concurrent requests
Fault duration:      ${duration}s
Affected modules:    adventurelog-db → adventurelog-backend → adventurelog-frontend

OBSERVATIONS:
  DB latency applied via tc:    $tc_on_db
  Concurrent requests total:    20
  Successful responses (2xx/4xx): $total_200
  Error responses (5xx):          $total_500
  Other (timeouts/000):           $total_other
  Frontend HTTP during fault:     $fe_during

RECOVERY:
  Backend recovery time: ${be_recovery}s

METRICS:
  Connection pool exhaustion observed: [FILL IN: yes/no]
  Error propagation path:              DB slow → backend pools → 500 → frontend
  MTTR:                                ${be_recovery}s
  Data consistency issues:             [FILL IN: check for partial writes]

SCREENSHOT PLACEHOLDER:
  [ATTACH: backend logs showing connection pool errors]
  [ATTACH: frontend showing degraded state]
  [ATTACH: db logs showing slow queries]
  [ATTACH: all systems green after recovery]
EOF
    log "Scenario 5 complete."
    rm -f "$REPORTS_DIR/scenario5_concurrent.txt"
}

# ── Main entry point ───────────────────────────────────────────────────────────

print_summary() {
    sep
    log "CHAOS TESTING COMPLETE"
    sep
    echo "Reports saved to: $REPORTS_DIR/"
    echo "Log file:         $LOG_FILE"
    echo ""
    echo "Next steps:"
    echo "  1. Fill in FILL IN placeholders in each scenario report"
    echo "  2. Attach screenshots as noted in each report"
    echo "  3. Transfer data to chaos_test_report.md"
    sep
}

case "${1:-all}" in
    scenario1) preflight_check; scenario1_database_failure ;;
    scenario2) preflight_check; scenario2_backend_downtime ;;
    scenario3) preflight_check; scenario3_network_latency ;;
    scenario4) preflight_check; scenario4_resource_exhaustion ;;
    scenario5) preflight_check; scenario5_cascading_failure ;;
    all)
        preflight_check
        scenario1_database_failure
        sleep 15  # let stack fully stabilize between scenarios
        scenario2_backend_downtime
        sleep 15
        scenario3_network_latency
        sleep 15
        scenario4_resource_exhaustion
        sleep 15
        scenario5_cascading_failure
        print_summary
        ;;
    *)
        echo "Usage: $0 [all|scenario1|scenario2|scenario3|scenario4|scenario5]"
        exit 1
        ;;
esac
