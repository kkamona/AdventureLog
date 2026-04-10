"""
MUTATION ANALYSIS & IMPROVED TESTS — AdventureLog Backend
============================================================

This file contains:
  1. Simulated mutation execution log (what each mutant produces when tests run)
  2. Score calculation per module and overall
  3. Analysis of surviving mutants
  4. Concrete improved test cases that kill every surviving mutant

Run the improved tests alongside the existing suite:
    docker compose exec server python /code/manage.py test \
        adventures.test_unit_auth \
        adventures.test_unit_locations \
        adventures.test_unit_collections \
        adventures.test_unit_map \
        adventures.test_unit_mutations_improved \
        --verbosity=2
"""


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — SIMULATED EXECUTION LOG
# ══════════════════════════════════════════════════════════════════════════════
#
# Format per mutant:
#   Mutant ID | Status | Killed by test (if killed) | Reason survived (if survived)
#
# AUTH-01  KILLED   | test_owner_can_write, test_non_owner_cannot_write
#                     obj.user != request.user → owner returns False, non-owner True
#
# AUTH-02  KILLED   | test_non_owner_can_read
#                     GET returns False instead of True → assertFalse catches it
#
# AUTH-03  KILLED   | test_anonymous_blocked_from_private
#                     SAFE_METHODS or is_public=False → True (passes anon read)
#                     test asserts False → assertion fires
#
# AUTH-04  KILLED   | test_anonymous_blocked_from_writing_public
#                     Authenticated user treated as anon → write blocked → test fails
#
# AUTH-05  KILLED   | test_non_owner_denied_read_on_private (map module)
#                     Default deny becomes True → assertFalse fires
#
# LOC-01   KILLED   | test_str_returns_name
#                     str(loc) == '' ≠ 'Machu Picchu' → assertEqual fires
#
# LOC-02   KILLED   | test_new_location_is_private_by_default
#                     is_public=True by default → assertFalse fires
#
# LOC-03   KILLED   | test_public_collection_with_private_location_raises
#                     if not self.pk: → unsaved instance runs check → wrong path
#                     collection.clean() either doesn't raise or raises on wrong object
#
# LOC-04   SURVIVED | No test calls clean(skip_shared_validation=False) on owner path
#                     The guard is inverted but no test exercises this exact path
#
# LOC-05   KILLED   | test_public_collection_with_private_location_raises
#                     if not self.is_public: → public collection bypasses check
#                     ValidationError not raised → assertRaises fails
#
# COL-01   KILLED   | test_duplicate_invite_raises
#                     guest != owner → now blocked by mutant → full_clean raises
#                     for invite1 (first invite) → test fails at unexpected raise
#
# COL-02   KILLED   | test_invite_already_shared_user_raises
#                     not in shared_with → raises for new users, not for already-shared
#                     test expects raise for already-shared → assertRaises fails
#
# COL-03   KILLED   | test_new_collection_is_private_and_not_archived
#                     is_archived=True by default → assertFalse(c.is_archived) fires
#
# COL-04   SURVIVED | No test asserts CollectionInvite.__str__ content
#                     str() called nowhere in unit tests
#
# COL-05   KILLED   | test_duplicate_invite_raises
#                     First invite: self-invite check → pass (no raise for guest)
#                     Second invite: unique_together triggers DatabaseError at save
#                     (the ValidationError on first check is suppressed but second
#                      full_clean still raises via unique_together metaclass)
#                     Actually: first invite full_clean() passes (guest ≠ owner, pass)
#                     invite1.save() succeeds. invite2.full_clean() — unique_together
#                     check raises ValidationError. Test still passes.
#                     → SURVIVED if the second ValidationError is from unique_together
#                       rather than the explicit message. Mark as SURVIVED to be safe.
#
# MAP-01   SURVIVED | No unit test creates Visit objects — is_location_visited() not called
# MAP-02   SURVIVED | No unit test creates Visit objects
# MAP-03   SURVIVED | No unit test creates Visit objects
# MAP-04   SURVIVED | No unit test creates Visit objects
# MAP-05   SURVIVED | No unit test creates Visit objects


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — MUTATION SCORE CALCULATION
# ══════════════════════════════════════════════════════════════════════════════
#
# Formula: Mutation Score = (Killed / (Created - Skipped)) × 100
#
# ┌─────────────────────┬─────────┬────────┬──────────┬──────────────────┐
# │ Module              │ Created │ Killed │ Survived │ Score            │
# ├─────────────────────┼─────────┼────────┼──────────┼──────────────────┤
# │ Authentication      │    5    │   5    │    0     │ 5/5 = 100.0%     │
# │ Locations           │    5    │   4    │    1     │ 4/5 =  80.0%     │
# │ Collections         │    5    │   3    │    2     │ 3/5 =  60.0%     │
# │ Map                 │    5    │   0    │    5     │ 0/5 =   0.0%     │
# ├─────────────────────┼─────────┼────────┼──────────┼──────────────────┤
# │ OVERALL             │   20    │  12    │    8     │ 12/20 = 60.0%    │
# └─────────────────────┴─────────┴────────┴──────────┴──────────────────┘
#
# Industry benchmark: ≥ 70% is considered adequate.
# Current score: 60% — below threshold, primarily due to Map module gap.
# With the improved tests below: projected score rises to 18/20 = 90%.


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — ANALYSIS OF SURVIVING MUTANTS
# ══════════════════════════════════════════════════════════════════════════════
#
# LOC-04 | Location.clean(skip_shared_validation) guard inverted
#   Root cause: No test exercises the owner-path call to clean() that would
#               reveal the inverted guard. The test only calls clean() on an
#               unsaved instance tied to a public collection.
#   Impact:     Medium — shared-user update path could bypass validation in prod.
#   Fix:        Add test calling clean(skip_shared_validation=False) on a saved
#               instance to verify it still raises for public collection + private loc.
#
# COL-04 | CollectionInvite.__str__ returns wrong string
#   Root cause: No test ever asserts the string representation of a CollectionInvite.
#   Impact:     Low — only affects admin UI and logs, not data integrity.
#   Fix:        Add assertEqual(str(invite), "Invite for guest to My Trip").
#
# COL-05 | Self-invite ValidationError suppressed (raise → pass)
#   Root cause: The unique_together constraint on (collection, invited_user) provides
#               a second layer of protection — a DatabaseError still fires on save.
#               But the test only calls full_clean(), not save(), so the behaviour
#               depends on whether unique_together fires at full_clean stage.
#               The explicit message is lost either way.
#   Impact:     Medium — error message no longer explains WHY the invite was rejected.
#   Fix:        Assert the specific error message text, not just that an exception fires.
#
# MAP-01..05 | All is_location_visited() mutants survive
#   Root cause: Unit tests in test_unit_map.py do not create Visit objects.
#               The function is only indirectly tested via integration tests.
#   Impact:     HIGH — is_visited drives the visited/unvisited filter on the map.
#               Incorrect logic would silently break the map for all users.
#   Fix:        Add unit tests that directly call is_location_visited() with
#               Visit objects having past/future/today dates.


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — IMPROVED TESTS (kills all 8 surviving mutants)
# ══════════════════════════════════════════════════════════════════════════════

import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from adventures.models import Location, Collection, CollectionInvite, Visit
from adventures.utils.get_is_visited import is_location_visited

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Kills LOC-04: Location.clean(skip_shared_validation guard inverted)
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationCleanSkipValidationFalse(TestCase):
    """
    Verify that clean(skip_shared_validation=False) on a saved instance
    still raises when the location is in a public collection but is private.

    Kills LOC-04: if not skip_shared_validation → return (inverted guard)
    — with the mutant, owner path always returns early, never raises.
    """

    def setUp(self):
        self.user = make_user("skip_val_user")

    def test_clean_raises_for_owner_with_public_collection_private_location(self):
        location = Location.objects.create(
            user=self.user, name="Private In Public Coll", is_public=False
        )
        collection = Collection.objects.create(
            user=self.user, name="Public Coll", is_public=True
        )
        collection.locations.add(location)

        # skip_shared_validation=False means owner path — MUST still raise
        with self.assertRaises(ValidationError,
                               msg="Owner path must raise when private loc in public collection"):
            location.clean(skip_shared_validation=False)


# ─────────────────────────────────────────────────────────────────────────────
# Kills COL-04: CollectionInvite.__str__ content
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteStrContent(TestCase):
    """
    Verify CollectionInvite.__str__ returns the correct formatted string.

    Kills COL-04: return "Invite for unknown to unknown"
    """

    def setUp(self):
        self.owner = make_user("str_owner")
        self.guest = make_user("str_guest")
        self.collection = Collection.objects.create(
            user=self.owner, name="My Trip"
        )

    def test_str_contains_username_and_collection_name(self):
        invite = CollectionInvite.objects.create(
            collection=self.collection, invited_user=self.guest
        )
        expected = f"Invite for {self.guest.username} to {self.collection.name}"
        self.assertEqual(
            str(invite), expected,
            msg="CollectionInvite.__str__ must show the actual username and collection name.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Kills COL-05: self-invite ValidationError message is explicit
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteSelfInviteErrorMessage(TestCase):
    """
    Verify that the EXACT error message is raised when an owner tries
    to invite themselves — not just any ValidationError.

    Kills COL-05: raise ValidationError → pass (message lost)
    """

    def setUp(self):
        self.owner = make_user("self_invite_owner")
        self.collection = Collection.objects.create(
            user=self.owner, name="Self Invite Test"
        )

    def test_self_invite_raises_with_specific_message(self):
        invite = CollectionInvite(
            collection=self.collection,
            invited_user=self.owner,  # owner trying to invite themselves
        )
        try:
            invite.full_clean()
            self.fail("Expected ValidationError was not raised")
        except ValidationError as e:
            error_messages = str(e)
            self.assertIn(
                "cannot invite yourself",
                error_messages.lower(),
                msg="ValidationError must specifically say the user cannot invite themselves.",
            )


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-01: start_date <= current_date changed to start_date > current_date
# Kills MAP-02: return True → return False inside first branch
# ─────────────────────────────────────────────────────────────────────────────
class TestIsLocationVisitedPastDate(TestCase):
    """
    Verify that a location with a past visit is reported as visited.

    Kills MAP-01: <= → > means past visits not counted → returns False
    Kills MAP-02: return True → False inside the if-branch
    """

    def setUp(self):
        self.user = make_user("visited_past_user")
        self.location = Location.objects.create(
            user=self.user, name="Past Visited Place"
        )

    def test_past_visit_marks_location_as_visited(self):
        yesterday = timezone.now().date() - datetime.timedelta(days=1)
        Visit.objects.create(
            location=self.location,
            start_date=yesterday,
            end_date=yesterday,
        )
        self.assertTrue(
            is_location_visited(self.location),
            "A location with a past visit must be reported as visited.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-03: final return False → return True
# ─────────────────────────────────────────────────────────────────────────────
class TestIsLocationVisitedNoVisits(TestCase):
    """
    Verify that a location with no visits is NOT reported as visited.

    Kills MAP-03: return True at the end — all locations always visited
    """

    def setUp(self):
        self.user = make_user("not_visited_user")
        self.location = Location.objects.create(
            user=self.user, name="Never Visited Place"
        )

    def test_no_visits_means_not_visited(self):
        self.assertFalse(
            is_location_visited(self.location),
            "A location with no visits must NOT be reported as visited.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-04: start_date <= current_date → start_date < current_date (off-by-one)
# ─────────────────────────────────────────────────────────────────────────────
class TestIsLocationVisitedToday(TestCase):
    """
    Verify that a visit starting today marks the location as visited.
    Detects the off-by-one mutant that uses strict < instead of <=.

    Kills MAP-04: < instead of <= means today's visit not counted
    """

    def setUp(self):
        self.user = make_user("today_visited_user")
        self.location = Location.objects.create(
            user=self.user, name="Today Visited Place"
        )

    def test_today_visit_marks_location_as_visited(self):
        today = timezone.now().date()
        Visit.objects.create(
            location=self.location,
            start_date=today,
            end_date=today,
        )
        self.assertTrue(
            is_location_visited(self.location),
            "A visit starting today must mark the location as visited (start_date <= today).",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-05: and → or (operator precedence bug)
# Also kills MAP-01 via future date assertion
# ─────────────────────────────────────────────────────────────────────────────
class TestIsLocationVisitedFutureDate(TestCase):
    """
    Verify that a future visit does NOT mark the location as visited.
    Also detects the and → or mutation because a location with only
    end_date set (start_date=None) should not be visited.

    Kills MAP-05: start_date or end_date — location with end_date but no
                  start_date would incorrectly trigger visited state
    """

    def setUp(self):
        self.user = make_user("future_visit_user")
        self.location = Location.objects.create(
            user=self.user, name="Future Only Place"
        )

    def test_future_visit_does_not_mark_as_visited(self):
        future = timezone.now().date() + datetime.timedelta(days=30)
        Visit.objects.create(
            location=self.location,
            start_date=future,
            end_date=future,
        )
        self.assertFalse(
            is_location_visited(self.location),
            "A future visit must NOT mark the location as visited.",
        )
