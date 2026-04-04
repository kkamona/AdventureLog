"""
Unit Tests — Collections
=========================
Tests Collection model validation, default field values,
and archive/public flag logic — no HTTP, no live server.

Run:
    cd backend/server
    python manage.py test adventures.test_unit_collections --verbosity=2
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from adventures.models import Collection, Location, CollectionInvite
from adventures.serializers import CollectionSerializer

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. Collection — is_public and is_archived default to False
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionDefaults(TestCase):
    """
    Verify that a new Collection is private and not archived by default.
    Tests: adventures.models.Collection.is_public / is_archived defaults
    """

    def setUp(self):
        self.user = make_user("coll_defaults_user")

    def test_new_collection_is_private_and_not_archived(self):
        c = Collection.objects.create(user=self.user, name="My Trip")
        self.assertFalse(c.is_public, "Collection must be private by default.")
        self.assertFalse(c.is_archived, "Collection must not be archived by default.")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Collection — str representation returns the collection name
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionStrRepresentation(TestCase):
    """
    Verify Collection.__str__ returns the collection name.
    Tests: adventures.models.Collection.__str__
    """

    def setUp(self):
        self.user = make_user("coll_str_user")

    def test_str_returns_name(self):
        c = Collection.objects.create(user=self.user, name="Paris 2025")
        self.assertEqual(str(c), "Paris 2025")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Collection — shared_with M2M: owner cannot share with themselves
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionSharingOtherUser(TestCase):
    """
    Verify that shared_with can hold a different user and that the M2M
    relationship is queryable, while the owner is NOT in shared_with.
    Tests: adventures.models.Collection.shared_with M2M
    """

    def setUp(self):
        self.owner = make_user("coll_share_owner")
        self.guest = make_user("coll_share_guest")

    def test_shared_with_contains_guest_not_owner(self):
        c = Collection.objects.create(user=self.owner, name="Shared Trip")
        c.shared_with.add(self.guest)
        self.assertIn(self.guest, c.shared_with.all())
        self.assertNotIn(self.owner, c.shared_with.all())


# ─────────────────────────────────────────────────────────────────────────────
# 4. CollectionInvite — duplicate invite raises ValidationError
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteDuplicateBlocked(TestCase):
    """
    Verify that inviting the same user to the same collection twice
    raises a ValidationError (enforced in CollectionInvite.clean).
    Tests: adventures.models.CollectionInvite.clean
    """

    def setUp(self):
        self.owner = make_user("invite_owner")
        self.guest = make_user("invite_guest")
        self.collection = Collection.objects.create(user=self.owner, name="Invite Test")

    def test_duplicate_invite_raises(self):
        # First invite is fine
        invite1 = CollectionInvite(
            collection=self.collection, invited_user=self.guest
        )
        invite1.full_clean()
        invite1.save()

        # Second invite to the same user should raise
        invite2 = CollectionInvite(
            collection=self.collection, invited_user=self.guest
        )
        with self.assertRaises(ValidationError):
            invite2.full_clean()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Collection — already-shared user cannot be invited again
# ─────────────────────────────────────────────────────────────────────────────
class TestCollectionInviteAlreadySharedBlocked(TestCase):
    """
    Verify that inviting a user who is already in shared_with raises
    ValidationError (enforced in CollectionInvite.clean).
    Tests: adventures.models.CollectionInvite.clean (shared_with check)
    """

    def setUp(self):
        self.owner = make_user("shared_invite_owner")
        self.guest = make_user("shared_invite_guest")
        self.collection = Collection.objects.create(user=self.owner, name="Already Shared")
        self.collection.shared_with.add(self.guest)

    def test_invite_already_shared_user_raises(self):
        invite = CollectionInvite(
            collection=self.collection, invited_user=self.guest
        )
        with self.assertRaises(ValidationError):
            invite.full_clean()
