"""
test_unit_mutations_improved.py
================================
Improved unit tests generated from mutation analysis.
Each test class is documented with which mutant(s) it kills.

Place at: backend/server/adventures/test_unit_mutations_improved.py

Run:
    docker compose exec server python /code/manage.py test \
        adventures.test_unit_mutations_improved --verbosity=2
"""

import datetime
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
# Kills LOC-04
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationCleanOwnerPathStillValidates(TestCase):
    """
    Kills LOC-04: inverted skip_shared_validation guard causes owner path
    to always return early — validation silently skipped for owners.
    """

    def setUp(self):
        self.user = make_user("loc04_user")

    def test_owner_path_raises_for_private_location_in_public_collection(self):
        location = Location.objects.create(
            user=self.user, name="Private Loc", is_public=False
        )
        collection = Collection.objects.create(
            user=self.user, name="Public Coll", is_public=True
        )
        collection.locations.add(location)

        with self.assertRaises(ValidationError):
            location.clean(skip_shared_validation=False)


# ─────────────────────────────────────────────────────────────────────────────
# Kills COL-04
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteStrRepresentation(TestCase):
    """
    Kills COL-04: __str__ returns 'Invite for unknown to unknown' instead of
    the real username and collection name.
    """

    def setUp(self):
        self.owner = make_user("col04_owner")
        self.guest = make_user("col04_guest")
        self.collection = Collection.objects.create(
            user=self.owner, name="Adventure Trip"
        )

    def test_str_shows_actual_username_and_collection(self):
        invite = CollectionInvite.objects.create(
            collection=self.collection,
            invited_user=self.guest,
        )
        expected = f"Invite for {self.guest.username} to {self.collection.name}"
        self.assertEqual(str(invite), expected)


# ─────────────────────────────────────────────────────────────────────────────
# Kills COL-05
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteSelfInviteExplicitMessage(TestCase):
    """
    Kills COL-05: raise ValidationError → pass means the explicit error
    message 'cannot invite yourself' is never raised. Tests that previously
    caught any ValidationError now pass even though the real guard is gone.
    """

    def setUp(self):
        self.owner = make_user("col05_owner")
        self.collection = Collection.objects.create(
            user=self.owner, name="Col05 Test"
        )

    def test_self_invite_raises_with_cannot_invite_yourself_message(self):
        invite = CollectionInvite(
            collection=self.collection,
            invited_user=self.owner,
        )
        try:
            invite.full_clean()
            self.fail("ValidationError was not raised for self-invite")
        except ValidationError as exc:
            self.assertIn(
                "cannot invite yourself",
                str(exc).lower(),
                msg="The error must specifically explain self-invite is forbidden.",
            )


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-01 and MAP-02
# ─────────────────────────────────────────────────────────────────────────────
class TestIsVisitedWithPastVisit(TestCase):
    """
    Kills MAP-01: <= → > means past dates return False instead of True.
    Kills MAP-02: return True → False inside the first if-branch.
    """

    def setUp(self):
        self.user = make_user("map01_user")
        self.location = Location.objects.create(
            user=self.user, name="Past Visited"
        )

    def test_past_visit_is_visited(self):
        yesterday = timezone.now().date() - datetime.timedelta(days=1)
        Visit.objects.create(
            location=self.location,
            start_date=yesterday,
            end_date=yesterday,
        )
        self.assertTrue(is_location_visited(self.location))


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-03
# ─────────────────────────────────────────────────────────────────────────────
class TestIsVisitedWithNoVisits(TestCase):
    """
    Kills MAP-03: final return False → True means all locations always visited.
    """

    def setUp(self):
        self.user = make_user("map03_user")
        self.location = Location.objects.create(
            user=self.user, name="Never Visited"
        )

    def test_no_visits_returns_false(self):
        self.assertFalse(is_location_visited(self.location))


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-04
# ─────────────────────────────────────────────────────────────────────────────
class TestIsVisitedWithTodayVisit(TestCase):
    """
    Kills MAP-04: start_date < current_date (strict) misses today's visit.
    """

    def setUp(self):
        self.user = make_user("map04_user")
        self.location = Location.objects.create(
            user=self.user, name="Visited Today"
        )

    def test_todays_visit_is_visited(self):
        today = timezone.now().date()
        Visit.objects.create(
            location=self.location,
            start_date=today,
            end_date=today,
        )
        self.assertTrue(is_location_visited(self.location))


# ─────────────────────────────────────────────────────────────────────────────
# Kills MAP-05 and reinforces MAP-01
# ─────────────────────────────────────────────────────────────────────────────
class TestIsVisitedWithFutureVisit(TestCase):
    """
    Kills MAP-05: and → or causes locations with only end_date set (no
    start_date) to incorrectly return True.
    Also kills MAP-01: future start_date > current_date still returns False.
    """

    def setUp(self):
        self.user = make_user("map05_user")
        self.location = Location.objects.create(
            user=self.user, name="Future Visit"
        )

    def test_future_visit_is_not_visited(self):
        future = timezone.now().date() + datetime.timedelta(days=30)
        Visit.objects.create(
            location=self.location,
            start_date=future,
            end_date=future,
        )
        self.assertFalse(is_location_visited(self.location))
