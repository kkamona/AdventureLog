#!/usr/bin/env python3
"""
mutation_runner.py
==================
Applies each mutant one at a time, runs the Django unit test suite inside
the Docker container, records whether the mutant was KILLED or SURVIVED,
then restores the original file.

Usage (from repo root):
    python backend/server/mutation_testing/mutation_runner.py

Requirements:
    - Docker stack running: docker compose up -d db server
    - Unit test files already copied into the container
"""

import subprocess
import tempfile
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────────
CONTAINER   = "adventurelog-backend"
MANAGE_PY   = "/code/manage.py"
TEST_MODULES = [
    "adventures.test_unit_auth",
    "adventures.test_unit_locations",
    "adventures.test_unit_collections",
    "adventures.test_unit_map",
]
REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ── Mutant registry ────────────────────────────────────────────────────────────
MUTANTS = [
    # ── Authentication (5) ────────────────────────────────────────────────────
    {
        "id": "AUTH-01", "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Logical operator change (== → !=)",
        "original": "return obj.user == request.user",
        "mutant":   "return obj.user != request.user",
        "rationale": "Inverts ownership check — non-owners get write, owners denied.",
    },
    {
        "id": "AUTH-02", "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Return value modification (True → False)",
        "original": "return True\n        # obj.user is FK to User, compare with request.user",
        "mutant":   "return False\n        # obj.user is FK to User, compare with request.user",
        "rationale": "Safe-method guard returns False — all reads blocked.",
    },
    {
        "id": "AUTH-03", "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Logical operator change (and → or)",
        "original": "return request.method in permissions.SAFE_METHODS and getattr(obj, 'is_public', False)",
        "mutant":   "return request.method in permissions.SAFE_METHODS or getattr(obj, 'is_public', False)",
        "rationale": "Anonymous users can write to any public object — bypasses auth.",
    },
    {
        "id": "AUTH-04", "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Condition negation (not removed)",
        "original": "if not user or not user.is_authenticated:",
        "mutant":   "if user or not user.is_authenticated:",
        "rationale": "Authenticated users treated as anonymous — all auth checks broken.",
    },
    {
        "id": "AUTH-05", "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Return value modification (False → True)",
        "original": "        return False\n    \n    def has_permission",
        "mutant":   "        return True\n    \n    def has_permission",
        "rationale": "Default deny replaced with default allow — all access granted.",
    },
    # ── Locations (5) ─────────────────────────────────────────────────────────
    {
        "id": "LOC-01", "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Return value modification (__str__)",
        "original": "        return self.name\n    \nclass CollectionInvite",
        "mutant":   "        return ''\n    \nclass CollectionInvite",
        "rationale": "__str__ returns empty string — admin dropdowns and logs break.",
    },
    {
        "id": "LOC-02", "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Constant alteration (is_public default False → True)",
        "original": "    is_public = models.BooleanField(default=False)\n    longitude",
        "mutant":   "    is_public = models.BooleanField(default=True)\n    longitude",
        "rationale": "All new locations public by default — privacy breach.",
    },
    {
        "id": "LOC-03", "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (if self.pk → if not self.pk)",
        "original": "        if self.pk:  # Only check if the instance has been saved",
        "mutant":   "        if not self.pk:  # Only check if the instance has been saved",
        "rationale": "Validation runs on unsaved instances, skips saved ones.",
    },
    {
        "id": "LOC-04", "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (skip_shared_validation guard)",
        "original": "        if skip_shared_validation:\n            return",
        "mutant":   "        if not skip_shared_validation:\n            return",
        "rationale": "Inverts early-return — validation skips owners, runs only for shared users.",
    },
    {
        "id": "LOC-05", "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Condition negation in Collection.clean",
        "original": "        if self.is_public and self.pk:  # Only check if the instance has a primary key",
        "mutant":   "        if not self.is_public and self.pk:  # Only check if the instance has a primary key",
        "rationale": "Public-collection privacy check inverted.",
    },
    # ── Collections (5) ───────────────────────────────────────────────────────
    {
        "id": "COL-01", "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (== → !=) in CollectionInvite.clean",
        "original": "        if self.collection.user == self.invited_user:",
        "mutant":   "        if self.collection.user != self.invited_user:",
        "rationale": "Self-invite check inverted — owner can invite themselves, others blocked.",
    },
    {
        "id": "COL-02", "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (in → not in) for shared_with check",
        "original": "        if self.invited_user in self.collection.shared_with.all():",
        "mutant":   "        if self.invited_user not in self.collection.shared_with.all():",
        "rationale": "Already-shared check inverted — duplicate invites allowed.",
    },
    {
        "id": "COL-03", "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Constant alteration (is_archived default False → True)",
        "original": "    is_archived = models.BooleanField(default=False)\n    shared_with",
        "mutant":   "    is_archived = models.BooleanField(default=True)\n    shared_with",
        "rationale": "All new collections archived by default — invisible on creation.",
    },
    {
        "id": "COL-04", "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Return value modification (CollectionInvite __str__)",
        "original": "        return f\"Invite for {self.invited_user.username} to {self.collection.name}\"",
        "mutant":   "        return f\"Invite for unknown to unknown\"",
        "rationale": "Admin and log messages lose invite context.",
    },
    {
        "id": "COL-05", "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Function call removal (raise ValidationError → pass)",
        "original": "            raise ValidationError(\"You cannot invite yourself to your own collection.\")",
        "mutant":   "            pass  # raise ValidationError(\"You cannot invite yourself to your own collection.\")",
        "rationale": "Self-invite ValidationError suppressed — owner invites themselves silently.",
    },
    # ── Map (5) ───────────────────────────────────────────────────────────────
    {
        "id": "MAP-01", "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Logical operator change (<= → >) for date comparison",
        "original": "        if start_date and end_date and (start_date <= current_date):",
        "mutant":   "        if start_date and end_date and (start_date > current_date):",
        "rationale": "Only future visits marked as visited — all past visits ignored.",
    },
    {
        "id": "MAP-02", "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Return value modification (True → False) — first branch",
        "original": "            return True\n        elif start_date and not end_date",
        "mutant":   "            return False\n        elif start_date and not end_date",
        "rationale": "Visits with end_date never mark location as visited.",
    },
    {
        "id": "MAP-03", "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Return value modification (final False → True)",
        "original": "        \n    return False",
        "mutant":   "        \n    return True",
        "rationale": "All locations always reported as visited — map filter broken.",
    },
    {
        "id": "MAP-04", "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Logical operator change (<= → <) in second branch",
        "original": "        elif start_date and not end_date and (start_date <= current_date):",
        "mutant":   "        elif start_date and not end_date and (start_date < current_date):",
        "rationale": "Locations visited today not counted (off-by-one).",
    },
    {
        "id": "MAP-05", "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Logical operator change (and → or) in date check",
        "original": "        if start_date and end_date and (start_date <= current_date):",
        "mutant":   "        if start_date or end_date and (start_date <= current_date):",
        "rationale": "Operator precedence bug — partial date data triggers visited incorrectly.",
    },
]


# ── Docker helpers ─────────────────────────────────────────────────────────────

def docker_exec(cmd: str) -> tuple:
    """Run a command inside the server container."""
    result = subprocess.run(
        ["docker", "exec", CONTAINER, "bash", "-c", cmd],
        capture_output=True, text=True
    )
    return result.returncode, result.stdout, result.stderr


def read_file_from_container(path: str) -> str:
    rc, out, err = docker_exec(f"cat '{path}'")
    if rc != 0:
        raise RuntimeError(f"Cannot read {path}: {err}")
    return out


def write_file_to_container(path: str, content: str):
    """Write content to a file inside the container via docker cp."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tmp', delete=False,
                                     encoding='utf-8') as f:
        f.write(content)
        tmp = f.name
    try:
        subprocess.run(
            ["docker", "cp", tmp, f"{CONTAINER}:{path}"],
            check=True, capture_output=True
        )
    finally:
        os.unlink(tmp)


def run_tests() -> tuple:
    """
    Run unit tests inside the container.

    Key flags:
      --keepdb     Reuse the test database between runs instead of DROP+CREATE.
                   This avoids the "database is being accessed by other users"
                   error that occurs when gunicorn workers hold open connections
                   to the test DB at teardown time.
      --verbosity=1  Minimal output to keep logs readable.
      --noinput    No interactive prompts.
    """
    modules = " ".join(TEST_MODULES)
    cmd = (
        f"python {MANAGE_PY} test {modules} "
        f"--verbosity=1 --noinput --keepdb 2>&1"
    )
    rc, out, err = docker_exec(cmd)
    return rc == 0, out + err


# ── Main runner ────────────────────────────────────────────────────────────────

def run_mutation_testing():
    print("=" * 70)
    print("AdventureLog Mutation Testing Runner")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mutants: {len(MUTANTS)}")
    print("=" * 70)

    # Verify container is running
    result = subprocess.run(
        ["docker", "inspect", "--format", "{{.State.Running}}", CONTAINER],
        capture_output=True, text=True
    )
    if result.returncode != 0 or result.stdout.strip() != "true":
        print(f"❌ Container '{CONTAINER}' is not running. Start the stack first.")
        sys.exit(1)

    # Baseline — must pass before we start mutating
    print("\n── Baseline test run ──")
    baseline_passed, baseline_out = run_tests()
    if not baseline_passed:
        print("❌ BASELINE TESTS FAILED — fix tests before running mutations")
        print(baseline_out[-3000:])
        sys.exit(1)
    print("✅ Baseline: all tests pass\n")

    results = []
    file_cache = {}  # cache original file content per path

    for i, mutant in enumerate(MUTANTS, 1):
        mid   = mutant["id"]
        fpath = mutant["file"]
        print(f"[{i:02d}/{len(MUTANTS)}] {mid} — {mutant['type']}")

        # Cache original on first access
        if fpath not in file_cache:
            file_cache[fpath] = read_file_from_container(fpath)
        original_content = file_cache[fpath]

        if mutant["original"] not in original_content:
            print(f"  ⚠️  SKIP — pattern not found in {fpath}")
            results.append({**mutant, "status": "SKIPPED",
                            "reason": "original string not found in file"})
            continue

        # Apply mutation
        mutated = original_content.replace(mutant["original"], mutant["mutant"], 1)
        write_file_to_container(fpath, mutated)

        # Run tests against the mutant
        passed, test_out = run_tests()

        # Always restore original immediately after
        write_file_to_container(fpath, original_content)

        status = "SURVIVED" if passed else "KILLED"
        print(f"  {'✅ KILLED' if status == 'KILLED' else '❌ SURVIVED'}")

        results.append({
            **mutant,
            "status": status,
            "test_output_tail": test_out[-600:],
        })

    return results


def calculate_score(results):
    by_module = {}
    for r in results:
        m = r["module"]
        if m not in by_module:
            by_module[m] = {"created": 0, "killed": 0, "survived": 0, "skipped": 0}
        by_module[m]["created"] += 1
        by_module[m][r["status"].lower()] += 1

    for m, s in by_module.items():
        eff = s["created"] - s["skipped"]
        s["score"] = round(s["killed"] / eff * 100, 1) if eff > 0 else 0.0

    tc = sum(s["created"]  for s in by_module.values())
    tk = sum(s["killed"]   for s in by_module.values())
    ts = sum(s["survived"] for s in by_module.values())
    tsk = sum(s["skipped"] for s in by_module.values())
    eff = tc - tsk
    return by_module, {
        "created": tc, "killed": tk, "survived": ts, "skipped": tsk,
        "score": round(tk / eff * 100, 1) if eff > 0 else 0.0,
    }


def print_report(results, by_module, totals):
    print("\n" + "=" * 70)
    print("MUTATION TESTING REPORT")
    print("=" * 70)
    print(f"\n{'Module':<25} {'Created':>8} {'Killed':>8} {'Survived':>9} {'Score':>8}")
    print("-" * 65)
    for m, s in by_module.items():
        print(f"{m:<25} {s['created']:>8} {s['killed']:>8} {s['survived']:>9} {s['score']:>7.1f}%")
    print("-" * 65)
    print(f"{'OVERALL':<25} {totals['created']:>8} {totals['killed']:>8} "
          f"{totals['survived']:>9} {totals['score']:>7.1f}%")

    survived = [r for r in results if r["status"] == "SURVIVED"]
    if survived:
        print(f"\n── Surviving Mutants ({len(survived)}) — gaps in test coverage ──")
        for r in survived:
            print(f"  {r['id']:8}  {r['type']}")
            print(f"           {r['rationale']}")

    print(f"\n{'='*70}")
    eff = totals['created'] - totals['skipped']
    print(f"Mutation Score: {totals['score']:.1f}%  ({totals['killed']} killed / {eff} effective)")
    print("=" * 70)


def save_json_report(results, by_module, totals):
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": by_module,
        "totals": totals,
        "mutants": [{k: v for k, v in r.items() if k != "test_output_tail"}
                    for r in results],
    }
    path = REPORTS_DIR / f"mutation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n📄 JSON report saved: {path}")


if __name__ == "__main__":
    results = run_mutation_testing()
    by_module, totals = calculate_score(results)
    print_report(results, by_module, totals)
    save_json_report(results, by_module, totals)
