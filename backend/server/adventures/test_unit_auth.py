"""
Unit Tests — Authentication
============================
Tests model-level and permission-level logic in isolation.
No HTTP requests, no live server, no allauth signup flow.

Uses Django TestCase + direct ORM object creation via get_user_model().

Run:
    cd backend/server
    python manage.py test adventures.test_unit_auth --verbosity=2
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from adventures.permissions import (
    IsOwnerOrReadOnly,
    IsOwnerOrSharedWithFullAccess,
)
from adventures.models import Location, Collection
from unittest.mock import MagicMock

User = get_user_model()


def make_user(username, email=None):
    """Create a saved user with a unique email."""
    return User.objects.create_user(
        username=username,
        email=email or f"{username}@test.com",
        password="TestPass123!",
    )


def make_request(user=None, method="GET"):
    """Build a minimal mock request for permission tests."""
    req = MagicMock()
    req.user = user
    req.method = method
    return req


# ─────────────────────────────────────────────────────────────────────────────
# 1. CustomUser — email uniqueness enforced at model level
# ─────────────────────────────────────────────────────────────────────────────
class TestUserEmailUniqueness(TestCase):
    """
    Verify that the CustomUser model enforces unique emails.
    Tests: users.models.CustomUser.email (unique=True)
    """

    def test_duplicate_email_raises_on_save(self):
        make_user("user_a", "shared@test.com")
        with self.assertRaises(Exception):
            # Django will raise IntegrityError (or ValidationError via full_clean)
            make_user("user_b", "shared@test.com")


# ─────────────────────────────────────────────────────────────────────────────
# 2. CustomUser — uuid is auto-generated and unique per user
# ─────────────────────────────────────────────────────────────────────────────
class TestUserUuidGeneration(TestCase):
    """
    Verify that every user receives a distinct UUID on creation.
    Tests: users.models.CustomUser.uuid (UUIDField, auto-populated)
    """

    def test_each_user_has_unique_uuid(self):
        u1 = make_user("uuid_user1")
        u2 = make_user("uuid_user2")
        self.assertIsNotNone(u1.uuid)
        self.assertIsNotNone(u2.uuid)
        self.assertNotEqual(u1.uuid, u2.uuid)


# ─────────────────────────────────────────────────────────────────────────────
# 3. IsOwnerOrReadOnly — owner can write, non-owner cannot
# ─────────────────────────────────────────────────────────────────────────────
class TestIsOwnerOrReadOnlyPermission(TestCase):
    """
    Verify the IsOwnerOrReadOnly permission class logic directly
    without going through a view or HTTP layer.
    Tests: adventures.permissions.IsOwnerOrReadOnly.has_object_permission
    """

    def setUp(self):
        self.owner = make_user("perm_owner")
        self.other = make_user("perm_other")
        self.perm = IsOwnerOrReadOnly()
        # Create a Location owned by self.owner
        self.location = Location.objects.create(user=self.owner, name="Owner's Place")

    def test_owner_can_write(self):
        req = make_request(user=self.owner, method="DELETE")
        self.assertTrue(
            self.perm.has_object_permission(req, None, self.location),
            "Owner must have write access.",
        )

    def test_non_owner_cannot_write(self):
        req = make_request(user=self.other, method="PATCH")
        self.assertFalse(
            self.perm.has_object_permission(req, None, self.location),
            "Non-owner must not have write access.",
        )

    def test_non_owner_can_read(self):
        req = make_request(user=self.other, method="GET")
        self.assertTrue(
            self.perm.has_object_permission(req, None, self.location),
            "Non-owner must have read (safe-method) access.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 4. IsOwnerOrSharedWithFullAccess — unauthenticated blocked on private object
# ─────────────────────────────────────────────────────────────────────────────
class TestIsOwnerOrSharedAnonymousBlocked(TestCase):
    """
    Verify that anonymous users are denied write access and read access
    to non-public objects by IsOwnerOrSharedWithFullAccess.
    Tests: adventures.permissions.IsOwnerOrSharedWithFullAccess.has_object_permission
    """

    def setUp(self):
        self.owner = make_user("shared_perm_owner")
        self.perm = IsOwnerOrSharedWithFullAccess()
        self.private_location = Location.objects.create(
            user=self.owner, name="Private", is_public=False
        )
        self.public_location = Location.objects.create(
            user=self.owner, name="Public", is_public=True
        )

    def _anon_request(self, method="GET"):
        req = MagicMock()
        req.user = MagicMock()
        req.user.is_authenticated = False
        req.method = method
        return req

    def test_anonymous_blocked_from_private(self):
        req = self._anon_request("GET")
        self.assertFalse(
            self.perm.has_object_permission(req, None, self.private_location),
            "Anonymous user must not read a private location.",
        )

    def test_anonymous_can_read_public(self):
        req = self._anon_request("GET")
        self.assertTrue(
            self.perm.has_object_permission(req, None, self.public_location),
            "Anonymous user must be able to read a public location.",
        )

    def test_anonymous_blocked_from_writing_public(self):
        req = self._anon_request("POST")
        self.assertFalse(
            self.perm.has_object_permission(req, None, self.public_location),
            "Anonymous user must not write even to a public location.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. CustomUser — default measurement_system is 'metric'
# ─────────────────────────────────────────────────────────────────────────────
class TestUserDefaultMeasurementSystem(TestCase):
    """
    Verify that newly created users default to 'metric' measurement system.
    Tests: users.models.CustomUser.measurement_system default value.
    This setting drives unit display in the frontend (km vs miles).
    """

    def test_default_measurement_system_is_metric(self):
        user = make_user("metric_user")
        self.assertEqual(
            user.measurement_system,
            "metric",
            "New users must default to metric measurement system.",
        )
