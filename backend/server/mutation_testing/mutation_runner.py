#!/usr/bin/env python3
"""
mutation_runner.py
==================
Applies each mutant one at a time, runs the Django unit test suite inside
the Docker container, records whether the mutant was KILLED (tests caught
the fault) or SURVIVED (tests missed it), then restores the original file.

Usage (from repo root):
    python backend/server/mutation_testing/mutation_runner.py

Requirements:
    - Docker stack running: docker compose up -d db server
    - Unit test files already copied into the container
    - Python 3.8+ on the host machine
"""

import subprocess
import shutil
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────

REPO_ROOT     = Path(__file__).resolve().parents[3]   # AdventureLog/
CONTAINER     = "adventurelog-backend"
MANAGE_PY     = "/code/manage.py"
TEST_MODULES  = [
    "adventures.test_unit_auth",
    "adventures.test_unit_locations",
    "adventures.test_unit_collections",
    "adventures.test_unit_map",
]
REPORTS_DIR   = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ── Mutant registry ────────────────────────────────────────────────────────────
# Each mutant specifies:
#   id       : unique identifier
#   module   : which quality-gate module it belongs to
#   file     : path inside the container (/code/...)
#   original : exact string to replace
#   mutant   : string to inject
#   type     : mutation operator applied
#   rationale: why this mutation is meaningful
#
# Source files mutated:
#   /code/adventures/permissions.py
#   /code/adventures/models.py
#   /code/adventures/utils/get_is_visited.py

MUTANTS = [

    # ══════════════════════════════════════════════════════════════════════════
    # MODULE: Authentication (5 mutants)
    # Target: adventures/permissions.py  — IsOwnerOrReadOnly
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "AUTH-01",
        "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Logical operator change (== → !=)",
        "original": "return obj.user == request.user",
        "mutant":   "return obj.user != request.user",
        "rationale": "Inverts ownership check — non-owners get write, owners denied.",
    },
    {
        "id": "AUTH-02",
        "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Return value modification (True → False)",
        "original": "return True\n        # obj.user is FK to User, compare with request.user",
        "mutant":   "return False\n        # obj.user is FK to User, compare with request.user",
        "rationale": "Safe-method guard returns False — all reads blocked.",
    },
    {
        "id": "AUTH-03",
        "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Logical operator change (and → or)",
        "original": "return request.method in permissions.SAFE_METHODS and getattr(obj, 'is_public', False)",
        "mutant":   "return request.method in permissions.SAFE_METHODS or getattr(obj, 'is_public', False)",
        "rationale": "Anonymous users can write to any public object — bypasses auth.",
    },
    {
        "id": "AUTH-04",
        "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Condition removal (not → removed)",
        "original": "if not user or not user.is_authenticated:",
        "mutant":   "if user or not user.is_authenticated:",
        "rationale": "Authenticated users treated as anonymous — all auth checks broken.",
    },
    {
        "id": "AUTH-05",
        "module": "Authentication",
        "file": "/code/adventures/permissions.py",
        "type": "Return value modification (False → True)",
        "original": "        return False\n    \n    def has_permission",
        "mutant":   "        return True\n    \n    def has_permission",
        "rationale": "Default deny replaced with default allow — all access granted.",
    },

    # ══════════════════════════════════════════════════════════════════════════
    # MODULE: Locations (5 mutants)
    # Target: adventures/models.py  — Location model
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "LOC-01",
        "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Return value modification (__str__)",
        "original": "        return self.name\n    \nclass CollectionInvite",
        "mutant":   "        return ''\n    \nclass CollectionInvite",
        "rationale": "__str__ returns empty string — admin dropdowns and logs break.",
    },
    {
        "id": "LOC-02",
        "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Constant alteration (False → True for is_public default)",
        "original": "    is_public = models.BooleanField(default=False)\n    longitude",
        "mutant":   "    is_public = models.BooleanField(default=True)\n    longitude",
        "rationale": "All new locations public by default — privacy breach.",
    },
    {
        "id": "LOC-03",
        "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (if self.pk → if not self.pk)",
        "original": "        if self.pk:  # Only check if the instance has been saved",
        "mutant":   "        if not self.pk:  # Only check if the instance has been saved",
        "rationale": "Validation runs on unsaved instances (wrong state), skips saved ones.",
    },
    {
        "id": "LOC-04",
        "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Condition removal (skip_shared_validation guard)",
        "original": "        if skip_shared_validation:\n            return",
        "mutant":   "        if not skip_shared_validation:\n            return",
        "rationale": "Inverts early-return — validation runs only for shared users, never for owners.",
    },
    {
        "id": "LOC-05",
        "module": "Locations",
        "file": "/code/adventures/models.py",
        "type": "Logical operator change (== → !=) in Collection.clean",
        "original": "        if self.is_public and self.pk:  # Only check if the instance has a primary key",
        "mutant":   "        if not self.is_public and self.pk:  # Only check if the instance has a primary key",
        "rationale": "Public-collection privacy check inverted — private collections validated, not public ones.",
    },

    # ══════════════════════════════════════════════════════════════════════════
    # MODULE: Collections (5 mutants)
    # Target: adventures/models.py  — CollectionInvite.clean, Collection defaults
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "COL-01",
        "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Condition negation (== → !=) in CollectionInvite.clean",
        "original": "        if self.collection.user == self.invited_user:",
        "mutant":   "        if self.collection.user != self.invited_user:",
        "rationale": "Self-invite check inverted — owner can invite themselves, others blocked.",
    },
    {
        "id": "COL-02",
        "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Condition removal (in → not in) for shared_with check",
        "original": "        if self.invited_user in self.collection.shared_with.all():",
        "mutant":   "        if self.invited_user not in self.collection.shared_with.all():",
        "rationale": "Already-shared check inverted — duplicate invites allowed, new ones blocked.",
    },
    {
        "id": "COL-03",
        "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Constant alteration (is_archived default False → True)",
        "original": "    is_archived = models.BooleanField(default=False)\n    shared_with",
        "mutant":   "    is_archived = models.BooleanField(default=True)\n    shared_with",
        "rationale": "All new collections archived by default — invisible to users on creation.",
    },
    {
        "id": "COL-04",
        "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Return value modification (__str__ Collection)",
        "original": "        return f\"Invite for {self.invited_user.username} to {self.collection.name}\"",
        "mutant":   "        return f\"Invite for unknown to unknown\"",
        "rationale": "CollectionInvite __str__ loses context — admin and logs show wrong info.",
    },
    {
        "id": "COL-05",
        "module": "Collections",
        "file": "/code/adventures/models.py",
        "type": "Function call removal (raise ValidationError removed)",
        "original": "            raise ValidationError(\"You cannot invite yourself to your own collection.\")",
        "mutant":   "            pass  # raise ValidationError(\"You cannot invite yourself to your own collection.\")",
        "rationale": "Self-invite ValidationError suppressed — owner can invite themselves silently.",
    },

    # ══════════════════════════════════════════════════════════════════════════
    # MODULE: Map (5 mutants)
    # Target: adventures/utils/get_is_visited.py — is_location_visited()
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": "MAP-01",
        "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Logical operator change (<= → >) for date comparison",
        "original": "        if start_date and end_date and (start_date <= current_date):",
        "mutant":   "        if start_date and end_date and (start_date > current_date):",
        "rationale": "Only future visits marked as visited — all past visits show as unvisited.",
    },
    {
        "id": "MAP-02",
        "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Return value modification (True → False)",
        "original": "            return True\n        elif start_date and not end_date",
        "mutant":   "            return False\n        elif start_date and not end_date",
        "rationale": "Visits with end_date never mark location as visited.",
    },
    {
        "id": "MAP-03",
        "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Return value modification (final False → True)",
        "original": "        \n    return False",
        "mutant":   "        \n    return True",
        "rationale": "All locations always reported as visited — map visited filter broken.",
    },
    {
        "id": "MAP-04",
        "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Logical operator change (<= → <) for strict date comparison",
        "original": "        elif start_date and not end_date and (start_date <= current_date):",
        "mutant":   "        elif start_date and not end_date and (start_date < current_date):",
        "rationale": "Locations visited today not counted (today's visits missed).",
    },
    {
        "id": "MAP-05",
        "module": "Map",
        "file": "/code/adventures/utils/get_is_visited.py",
        "type": "Condition removal (and → or) in date check",
        "original": "        if start_date and end_date and (start_date <= current_date):",
        "mutant":   "        if start_date or end_date and (start_date <= current_date):",
        "rationale": "Short-circuit logic broken — partial date data triggers visited status incorrectly.",
    },
]


# ── Docker helpers ─────────────────────────────────────────────────────────────

def docker_exec(cmd: str) -> tuple[int, str, str]:
    """Run a command inside the server container. Returns (returncode, stdout, stderr)."""
    result = subprocess.run(
        ["docker", "exec", CONTAINER, "bash", "-c", cmd],
        capture_output=True, text=True
    )
    return result.returncode, result.stdout, result.stderr


def read_file_from_container(path: str) -> str:
    """Read the current content of a file inside the container."""
    rc, out, err = docker_exec(f"cat {path}")
    if rc != 0:
        raise RuntimeError(f"Cannot read {path}: {err}")
    return out


def write_file_to_container(path: str, content: str):
    """Write content to a file inside the container using a heredoc."""
    # Write via python inside container to avoid shell escaping issues
    escaped = content.replace("'", "'\\''")
    rc, _, err = docker_exec(f"python3 -c \"open('{path}','w').write(open('{path}').read())\"")
    # Use a temp file approach instead
    import tempfile, os
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(content)
        tmp = f.name
    subprocess.run(["docker", "cp", tmp, f"{CONTAINER}:{path}"], check=True)
    os.unlink(tmp)


def run_tests() -> tuple[bool, str]:
    """Run unit tests inside container. Returns (all_passed, output)."""
    cmd = (
        f"python {MANAGE_PY} test "
        + " ".join(TEST_MODULES)
        + " --verbosity=1 --noinput 2>&1"
    )
    rc, out, err = docker_exec(cmd)
    combined = out + err
    passed = rc == 0
    return passed, combined


# ── Main runner ────────────────────────────────────────────────────────────────

def run_mutation_testing():
    print("=" * 70)
    print("AdventureLog Mutation Testing Runner")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mutants: {len(MUTANTS)}")
    print("=" * 70)

    # Verify container is running
    rc, out, _ = subprocess.run(
        ["docker", "inspect", "--format", "{{.State.Running}}", CONTAINER],
        capture_output=True, text=True
    ).returncode, *["", ""]
    rc = subprocess.run(
        ["docker", "inspect", "--format", "{{.State.Running}}", CONTAINER],
        capture_output=True, text=True
    ).returncode
    if rc != 0:
        print(f"❌ Container '{CONTAINER}' is not running. Start the stack first.")
        sys.exit(1)

    # Verify baseline tests pass before mutating
    print("\n── Baseline test run (must pass before mutations) ──")
    baseline_passed, baseline_out = run_tests()
    if not baseline_passed:
        print("❌ BASELINE TESTS FAILED — fix tests before running mutations")
        print(baseline_out[-2000:])
        sys.exit(1)
    print("✅ Baseline: all tests pass\n")

    results = []
    file_cache = {}  # original content per file path

    for i, mutant in enumerate(MUTANTS, 1):
        mid   = mutant["id"]
        fpath = mutant["file"]
        print(f"[{i:02d}/{len(MUTANTS)}] {mid} — {mutant['type']}")

        # Cache original file content
        if fpath not in file_cache:
            file_cache[fpath] = read_file_from_container(fpath)
        original_content = file_cache[fpath]

        # Apply mutation
        if mutant["original"] not in original_content:
            print(f"  ⚠️  SKIP — original string not found in {fpath}")
            results.append({**mutant, "status": "SKIPPED",
                            "reason": "original string not found"})
            continue

        mutated_content = original_content.replace(mutant["original"],
                                                    mutant["mutant"], 1)
        write_file_to_container(fpath, mutated_content)

        # Run tests against mutant
        passed, test_output = run_tests()

        # Restore original
        write_file_to_container(fpath, original_content)

        status = "SURVIVED" if passed else "KILLED"
        icon   = "✅ KILLED" if status == "KILLED" else "❌ SURVIVED"
        print(f"  {icon}")

        results.append({
            **mutant,
            "status": status,
            "test_output_tail": test_output[-800:],
        })

    return results


def calculate_score(results):
    by_module = {}
    for r in results:
        m = r["module"]
        if m not in by_module:
            by_module[m] = {"created": 0, "killed": 0, "survived": 0, "skipped": 0}
        by_module[m]["created"] += 1
        if r["status"] == "KILLED":
            by_module[m]["killed"] += 1
        elif r["status"] == "SURVIVED":
            by_module[m]["survived"] += 1
        else:
            by_module[m]["skipped"] += 1

    for m, s in by_module.items():
        effective = s["created"] - s["skipped"]
        s["score"] = round(s["killed"] / effective * 100, 1) if effective > 0 else 0.0

    total_created  = sum(s["created"]  for s in by_module.values())
    total_killed   = sum(s["killed"]   for s in by_module.values())
    total_survived = sum(s["survived"] for s in by_module.values())
    total_skipped  = sum(s["skipped"]  for s in by_module.values())
    effective_total = total_created - total_skipped
    overall_score = round(total_killed / effective_total * 100, 1) if effective_total > 0 else 0.0

    return by_module, {
        "created": total_created, "killed": total_killed,
        "survived": total_survived, "skipped": total_skipped,
        "score": overall_score,
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
        print(f"\n── Surviving Mutants ({len(survived)}) ──")
        for r in survived:
            print(f"  {r['id']}  {r['type']}")
            print(f"    File:     {r['file']}")
            print(f"    Rationale:{r['rationale']}")

    print(f"\n{'='*70}")
    print(f"Mutation Score: {totals['score']:.1f}%  "
          f"({totals['killed']} killed / {totals['created'] - totals['skipped']} effective mutants)")
    print("=" * 70)


def save_json_report(results, by_module, totals):
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {m: s for m, s in by_module.items()},
        "totals": totals,
        "mutants": [
            {k: v for k, v in r.items() if k != "test_output_tail"}
            for r in results
        ],
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
