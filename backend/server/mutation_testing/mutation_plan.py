"""
MUTATION TESTING PLAN — AdventureLog Backend
=============================================

1. SCOPE & RATIONALE
---------------------
Mutation testing deliberately introduces small, controlled code faults
("mutants") into the production source, then re-runs the existing unit
test suite. A mutant is KILLED if at least one test fails; it SURVIVES
if all tests still pass (revealing a gap in coverage).

Modules selected from the midterm risk analysis (highest business risk):
  • Authentication  — permission logic controls who can read/write all data
  • Locations       — core domain model; validation and privacy defaults
  • Collections     — invite/sharing logic; complex M2M validation
  • Map             — is_visited utility; drives the visited/unvisited filter

Source files mutated:
  adventures/permissions.py         — IsOwnerOrReadOnly, IsOwnerOrSharedWithFullAccess
  adventures/models.py              — Location, Collection, CollectionInvite
  adventures/utils/get_is_visited.py — is_location_visited()

Test suite exercised:
  adventures.test_unit_auth         (5 tests)
  adventures.test_unit_locations    (5 tests)
  adventures.test_unit_collections  (5 tests)
  adventures.test_unit_map          (5 tests)
  Total: 20 tests

2. MUTATION OPERATORS USED
---------------------------
  A. Logical operator change  — == → !=,  and → or,  <= → >,  <= → <
  B. Condition negation       — if X → if not X
  C. Constant alteration      — default=False → default=True
  D. Return value modification— return True → return False, return self.name → return ''
  E. Function call removal    — raise ValidationError(...) → pass

3. MUTANT CATALOGUE (20 mutants, 5 per module)
-----------------------------------------------

── MODULE: Authentication ────────────────────────────────────────────────────

AUTH-01 | Logical operator change (== → !=)
  File:     adventures/permissions.py
  Location: IsOwnerOrReadOnly.has_object_permission()
  Original: return obj.user == request.user
  Mutant:   return obj.user != request.user
  Effect:   Non-owners granted write access; owners denied their own objects.
  Expected: KILLED by test_non_owner_cannot_write, test_owner_can_write

AUTH-02 | Return value modification (True → False)
  File:     adventures/permissions.py
  Location: IsOwnerOrReadOnly.has_object_permission() — safe-method branch
  Original: return True  [when method in SAFE_METHODS]
  Mutant:   return False
  Effect:   All read requests blocked (GET, HEAD, OPTIONS return False).
  Expected: KILLED by test_non_owner_can_read

AUTH-03 | Logical operator change (and → or)
  File:     adventures/permissions.py
  Location: IsOwnerOrSharedWithFullAccess — anonymous check
  Original: return request.method in permissions.SAFE_METHODS and getattr(obj, 'is_public', False)
  Mutant:   return request.method in permissions.SAFE_METHODS or getattr(obj, 'is_public', False)
  Effect:   All safe-method requests from anonymous users pass, regardless of is_public.
  Expected: KILLED by test_anonymous_blocked_from_private

AUTH-04 | Condition negation (not removed)
  File:     adventures/permissions.py
  Location: IsOwnerOrSharedWithFullAccess — authentication guard
  Original: if not user or not user.is_authenticated:
  Mutant:   if user or not user.is_authenticated:
  Effect:   Authenticated users treated as anonymous.
  Expected: KILLED by test_anonymous_blocked_from_writing_public

AUTH-05 | Return value modification (False → True)
  File:     adventures/permissions.py
  Location: IsOwnerOrSharedWithFullAccess._has_direct_sharing_access() fallback
  Original: return False  [default deny]
  Mutant:   return True
  Effect:   Default deny becomes default allow — all access granted.
  Expected: KILLED by test_non_owner_denied_read_on_private (map tests)

── MODULE: Locations ─────────────────────────────────────────────────────────

LOC-01 | Return value modification (__str__ → '')
  File:     adventures/models.py
  Location: Location.__str__()
  Original: return self.name
  Mutant:   return ''
  Effect:   All string representations of locations return empty string.
  Expected: KILLED by test_str_returns_name

LOC-02 | Constant alteration (is_public default False → True)
  File:     adventures/models.py
  Location: Location.is_public field definition
  Original: is_public = models.BooleanField(default=False)
  Mutant:   is_public = models.BooleanField(default=True)
  Effect:   All newly created locations are public — privacy breach at creation.
  Expected: KILLED by test_new_location_is_private_by_default

LOC-03 | Condition negation (if self.pk → if not self.pk)
  File:     adventures/models.py
  Location: Location.clean() — saved-instance guard
  Original: if self.pk:
  Mutant:   if not self.pk:
  Effect:   Validation runs on unsaved instances (wrong), skips saved ones (dangerous).
  Expected: KILLED by test_public_collection_with_private_location_raises

LOC-04 | Condition negation (skip_shared_validation guard)
  File:     adventures/models.py
  Location: Location.clean() — early return for shared users
  Original: if skip_shared_validation: return
  Mutant:   if not skip_shared_validation: return
  Effect:   Validation runs only for shared users, always skips for owners.
  Expected: SURVIVED — no test currently exercises skip_shared_validation=False path explicitly

LOC-05 | Condition negation (is_public check in Collection.clean)
  File:     adventures/models.py
  Location: Collection.clean() — public collection validation guard
  Original: if self.is_public and self.pk:
  Mutant:   if not self.is_public and self.pk:
  Effect:   Private collections now raise ValidationError; public ones bypass it.
  Expected: KILLED by test_public_collection_with_private_location_raises

── MODULE: Collections ───────────────────────────────────────────────────────

COL-01 | Condition negation (== → !=) in CollectionInvite.clean
  File:     adventures/models.py
  Location: CollectionInvite.clean() — self-invite guard
  Original: if self.collection.user == self.invited_user:
  Mutant:   if self.collection.user != self.invited_user:
  Effect:   Owner can invite themselves; all other users blocked from being invited.
  Expected: KILLED by test_duplicate_invite_raises (guest != owner so invite now blocked)

COL-02 | Condition negation (in → not in) for shared_with check
  File:     adventures/models.py
  Location: CollectionInvite.clean() — already-shared guard
  Original: if self.invited_user in self.collection.shared_with.all():
  Mutant:   if self.invited_user not in self.collection.shared_with.all():
  Effect:   Already-shared users can be re-invited; new users blocked.
  Expected: KILLED by test_invite_already_shared_user_raises

COL-03 | Constant alteration (is_archived default False → True)
  File:     adventures/models.py
  Location: Collection.is_archived field
  Original: is_archived = models.BooleanField(default=False)
  Mutant:   is_archived = models.BooleanField(default=True)
  Effect:   All new collections created in archived state — invisible to users.
  Expected: KILLED by test_new_collection_is_private_and_not_archived

COL-04 | Return value modification (CollectionInvite __str__)
  File:     adventures/models.py
  Location: CollectionInvite.__str__()
  Original: return f"Invite for {self.invited_user.username} to {self.collection.name}"
  Mutant:   return f"Invite for unknown to unknown"
  Effect:   Admin and log messages lose invite context.
  Expected: SURVIVED — no test asserts CollectionInvite.__str__ content

COL-05 | Function call removal (raise ValidationError → pass)
  File:     adventures/models.py
  Location: CollectionInvite.clean() — self-invite ValidationError
  Original: raise ValidationError("You cannot invite yourself to your own collection.")
  Mutant:   pass  # raise suppressed
  Effect:   Owner can silently invite themselves with no error raised.
  Expected: KILLED by test_duplicate_invite_raises (indirectly — clean() no longer raises for first check)

── MODULE: Map ───────────────────────────────────────────────────────────────

MAP-01 | Logical operator change (<= → >) in is_location_visited
  File:     adventures/utils/get_is_visited.py
  Location: is_location_visited() — primary date comparison
  Original: if start_date and end_date and (start_date <= current_date):
  Mutant:   if start_date and end_date and (start_date > current_date):
  Effect:   Only future visits mark a location as visited — all past visits ignored.
  Expected: SURVIVED — no test calls is_location_visited() directly; integration test does

MAP-02 | Return value modification (True → False) — first branch
  File:     adventures/utils/get_is_visited.py
  Location: is_location_visited() — return True inside first if
  Original: return True  [after primary date check]
  Mutant:   return False
  Effect:   Visits with end_date never mark location as visited.
  Expected: SURVIVED — unit tests don't create Visit objects; integration tests do

MAP-03 | Return value modification (final False → True)
  File:     adventures/utils/get_is_visited.py
  Location: is_location_visited() — final return
  Original: return False
  Mutant:   return True
  Effect:   All locations always reported as visited, regardless of visit history.
  Expected: SURVIVED — unit tests don't create Visit objects

MAP-04 | Logical operator change (<= → <) in second date branch
  File:     adventures/utils/get_is_visited.py
  Location: is_location_visited() — elif branch (no end_date)
  Original: elif start_date and not end_date and (start_date <= current_date):
  Mutant:   elif start_date and not end_date and (start_date < current_date):
  Effect:   Locations visited today not counted as visited (off-by-one).
  Expected: SURVIVED — unit tests don't create Visit objects

MAP-05 | Logical operator change (and → or) in date check
  File:     adventures/utils/get_is_visited.py
  Location: is_location_visited() — first if condition
  Original: if start_date and end_date and (start_date <= current_date):
  Mutant:   if start_date or end_date and (start_date <= current_date):
  Effect:   Python operator precedence causes incorrect short-circuit evaluation.
  Expected: SURVIVED — unit tests don't create Visit objects


4. EXPECTED MUTATION SCORE (pre-run estimate)
---------------------------------------------
Based on test coverage analysis:

  Module           Expected Killed  Expected Survived  Expected Score
  Authentication        5                 0               100.0%
  Locations             4                 1               80.0%   (LOC-04 survives)
  Collections           4                 1               80.0%   (COL-04 survives)
  Map                   1                 4               20.0%   (MAP-01..05 survive — no Visit ORM in unit tests)
  OVERALL              14                 6               70.0%

NOTE: Map module score is expected to be low because is_location_visited()
is only exercised end-to-end (with Visit rows in the DB) by integration
tests (tests_integration.py Test2_VisitMarksLocationAsVisited). The unit
tests don't create Visit objects. This is an identified gap — see Section 6.


5. HOW TO RUN
-------------
Step 1: Start the Docker stack
    docker compose up -d db server
    # Wait ~45 seconds for migrations

Step 2: Copy unit test files into the container
    docker cp backend/server/adventures/test_unit_auth.py        adventurelog-backend:/code/adventures/
    docker cp backend/server/adventures/test_unit_locations.py   adventurelog-backend:/code/adventures/
    docker cp backend/server/adventures/test_unit_collections.py adventurelog-backend:/code/adventures/
    docker cp backend/server/adventures/test_unit_map.py         adventurelog-backend:/code/adventures/

Step 3: Copy the mutation runner
    docker cp backend/server/mutation_testing/mutation_runner.py adventurelog-backend:/code/mutation_runner.py

Step 4: Run the mutation runner (from repo root)
    python backend/server/mutation_testing/mutation_runner.py

    The runner will:
    a. Verify the baseline tests pass (exits if they don't)
    b. For each mutant: apply → run tests → restore → record result
    c. Print a summary table
    d. Save a JSON report to mutation_testing/reports/


6. GAPS IDENTIFIED & RECOMMENDED IMPROVEMENTS
----------------------------------------------
See mutation_analysis.py for the full analysis table.

Key gaps:
  A. is_location_visited() has 0% unit test coverage — 4 map mutants survive
     FIX: Add unit tests that create Visit objects with past/future/today dates
          and assert is_location_visited() returns True/False correctly.

  B. Location.clean(skip_shared_validation=True) path not tested
     FIX: Add a test that calls location.clean(skip_shared_validation=False)
          with a public collection containing a private location, and asserts
          that it does NOT raise.

  C. CollectionInvite.__str__ not asserted anywhere
     FIX: Add assertEqual(str(invite), "Invite for guest to My Trip") assertion.
"""

# This file is documentation only — no executable code.
# The mutation runner is in mutation_runner.py
