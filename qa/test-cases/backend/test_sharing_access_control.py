"""
Sharing & Access Control Tests — AdventureLog v0.12.0
Risk Priority: HIGH (Score 12)

Tests cover:
- Decision table: owner/invited/uninvited/anonymous × public/private × HTTP method
- CollectionShared permission logic
- IsOwnerOrSharedWithFullAccess: collection-based access, direct sharing
- Privacy escalation via shared collections
- Invite accept/decline guard logic

No database required.
"""

import pytest


# ─────────────────────────────────────────────
# Shared Mocks
# ─────────────────────────────────────────────

class FakeUser:
    def __init__(self, uid, is_authenticated=True):
        self.id = uid
        self.is_authenticated = is_authenticated


class FakeCollection:
    def __init__(self, owner_id, shared_user_ids=None, is_public=False):
        self.user = FakeUser(owner_id)
        self._shared = [FakeUser(uid) for uid in (shared_user_ids or [])]
        self.is_public = is_public

    class _FilterProxy:
        def __init__(self, items, user):
            self._match = any(u.id == user.id for u in items)

        def exists(self):
            return self._match

    def shared_with_filter(self, user):
        return self._FilterProxy(self._shared, user)


class FakeLocation:
    def __init__(self, owner_id, is_public=False, collection=None, shared_collection_user_ids=None):
        self.user = FakeUser(owner_id)
        self.is_public = is_public
        self._collections = []
        if collection:
            self._collections = [collection]

    def has_public_collection(self):
        return any(c.is_public for c in self._collections)

    def shared_user_ids(self):
        ids = set()
        for c in self._collections:
            for u in c._shared:
                ids.add(u.id)
        return ids


SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


# ─────────────────────────────────────────────
# Decision Table: owner/shared/uninvited/anonymous × public/private × verb
# ─────────────────────────────────────────────

class TestAccessControlDecisionTable:
    """
    Full decision table for access control.
    Rows: user type (owner, shared, uninvited, anonymous)
    Cols: object visibility (public, private)
    Actions: read (GET), write (POST/PATCH/DELETE)
    """

    def _can_access(self, user, obj: FakeLocation, method: str) -> bool:
        """
        Simplified reimplementation of IsOwnerOrSharedWithFullAccess logic.
        """
        is_safe = method in SAFE_METHODS

        if not user or not user.is_authenticated:
            return is_safe and obj.is_public

        # Owner
        if obj.user.id == user.id:
            return True

        # Shared via collection
        if user.id in obj.shared_user_ids():
            return True

        # Public read
        if is_safe and obj.is_public:
            return True

        return False

    # ── Owner ──────────────────────────────────

    def test_owner_read_private(self):
        owner = FakeUser(1)
        loc = FakeLocation(owner_id=1, is_public=False)
        assert self._can_access(owner, loc, "GET") is True

    def test_owner_write_private(self):
        owner = FakeUser(1)
        loc = FakeLocation(owner_id=1, is_public=False)
        assert self._can_access(owner, loc, "DELETE") is True

    def test_owner_read_public(self):
        owner = FakeUser(1)
        loc = FakeLocation(owner_id=1, is_public=True)
        assert self._can_access(owner, loc, "GET") is True

    def test_owner_write_public(self):
        owner = FakeUser(1)
        loc = FakeLocation(owner_id=1, is_public=True)
        assert self._can_access(owner, loc, "PATCH") is True

    # ── Shared user ────────────────────────────

    def test_shared_user_read_private_via_collection(self):
        col = FakeCollection(owner_id=1, shared_user_ids=[2])
        loc = FakeLocation(owner_id=1, is_public=False, collection=col)
        loc._collections = [col]
        shared = FakeUser(2)
        assert self._can_access(shared, loc, "GET") is True

    def test_shared_user_write_private_via_collection(self):
        col = FakeCollection(owner_id=1, shared_user_ids=[2])
        loc = FakeLocation(owner_id=1, is_public=False, collection=col)
        loc._collections = [col]
        shared = FakeUser(2)
        assert self._can_access(shared, loc, "PATCH") is True

    # ── Uninvited authenticated user ───────────

    def test_uninvited_user_cannot_read_private(self):
        loc = FakeLocation(owner_id=1, is_public=False)
        stranger = FakeUser(99)
        assert self._can_access(stranger, loc, "GET") is False

    def test_uninvited_user_can_read_public(self):
        loc = FakeLocation(owner_id=1, is_public=True)
        stranger = FakeUser(99)
        assert self._can_access(stranger, loc, "GET") is True

    def test_uninvited_user_cannot_write_public(self):
        loc = FakeLocation(owner_id=1, is_public=True)
        stranger = FakeUser(99)
        assert self._can_access(stranger, loc, "DELETE") is False

    def test_uninvited_user_cannot_write_private(self):
        loc = FakeLocation(owner_id=1, is_public=False)
        stranger = FakeUser(99)
        assert self._can_access(stranger, loc, "POST") is False

    # ── Anonymous ──────────────────────────────

    def test_anonymous_can_read_public(self):
        loc = FakeLocation(owner_id=1, is_public=True)
        anon = FakeUser(None, is_authenticated=False)
        assert self._can_access(anon, loc, "GET") is True

    def test_anonymous_cannot_read_private(self):
        loc = FakeLocation(owner_id=1, is_public=False)
        anon = FakeUser(None, is_authenticated=False)
        assert self._can_access(anon, loc, "GET") is False

    def test_anonymous_cannot_write_public(self):
        loc = FakeLocation(owner_id=1, is_public=True)
        anon = FakeUser(None, is_authenticated=False)
        assert self._can_access(anon, loc, "POST") is False

    def test_anonymous_cannot_write_private(self):
        loc = FakeLocation(owner_id=1, is_public=False)
        anon = FakeUser(None, is_authenticated=False)
        assert self._can_access(anon, loc, "DELETE") is False


# ─────────────────────────────────────────────
# Sharing Escalation via Collections
# ─────────────────────────────────────────────

class TestPublicityEscalationViaCollection:
    """
    Tests the signal logic: when a location is added to a public
    collection, the location's is_public flag must be set to True.
    This prevents private data from being hidden inside public collections.
    """

    def _resolve_publicity(self, location_is_public: bool, collection_flags: list) -> bool:
        if not collection_flags:
            return location_is_public
        return any(collection_flags)

    def test_private_location_in_public_collection_becomes_public(self):
        result = self._resolve_publicity(False, [True])
        assert result is True

    def test_private_location_in_private_collection_stays_private(self):
        result = self._resolve_publicity(False, [False])
        assert result is False

    def test_public_location_all_private_collections_becomes_private(self):
        result = self._resolve_publicity(True, [False, False])
        assert result is False

    def test_location_with_no_collections_unchanged(self):
        assert self._resolve_publicity(True, []) is True
        assert self._resolve_publicity(False, []) is False


# ─────────────────────────────────────────────
# Invite Guard Logic
# ─────────────────────────────────────────────

class TestCollectionInviteGuard:
    """
    Tests the CollectionShared permission accept_invite / decline_invite guard.
    Only users with a pending invite for the collection may call these actions.
    """

    class FakeInviteCollection:
        def __init__(self, invited_user_ids):
            self._invited = set(invited_user_ids)

        class _InviteQuery:
            def __init__(self, exists):
                self._exists = exists

            def exists(self):
                return self._exists

        def filter_invited(self, user):
            return self._InviteQuery(user.id in self._invited)

    def _can_accept_or_decline(self, user, collection) -> bool:
        """Mirrors CollectionShared permission for accept/decline actions."""
        return collection.filter_invited(user).exists()

    def test_invited_user_can_accept(self):
        col = self.FakeInviteCollection(invited_user_ids=[5])
        user = FakeUser(5)
        assert self._can_accept_or_decline(user, col) is True

    def test_uninvited_user_cannot_accept(self):
        col = self.FakeInviteCollection(invited_user_ids=[5])
        user = FakeUser(99)
        assert self._can_accept_or_decline(user, col) is False

    def test_owner_without_invite_cannot_use_invite_action(self):
        """Owner is not in invites — action is for invitees only."""
        col = self.FakeInviteCollection(invited_user_ids=[])
        owner = FakeUser(1)
        assert self._can_accept_or_decline(owner, col) is False

    def test_multiple_invites_correct_user_passes(self):
        col = self.FakeInviteCollection(invited_user_ids=[2, 3, 4])
        assert self._can_accept_or_decline(FakeUser(3), col) is True
        assert self._can_accept_or_decline(FakeUser(9), col) is False


# ─────────────────────────────────────────────
# Collection Validation: user ownership of collections
# ─────────────────────────────────────────────

class TestCollectionOwnershipValidation:
    """
    Mirrors LocationSerializer.validate_collections():
    A user cannot assign a location to a collection they don't own
    or aren't shared with.
    """

    def _validate_collection_access(self, user_id, collection_owner_id,
                                     shared_user_ids) -> bool:
        """Returns True if user can add location to this collection."""
        if collection_owner_id == user_id:
            return True
        if user_id in shared_user_ids:
            return True
        return False

    def test_owner_can_add_to_own_collection(self):
        assert self._validate_collection_access(1, 1, []) is True

    def test_shared_user_can_add_to_shared_collection(self):
        assert self._validate_collection_access(2, 1, [2, 3]) is True

    def test_unrelated_user_cannot_add(self):
        assert self._validate_collection_access(99, 1, [2, 3]) is False

    def test_empty_shared_list_non_owner_rejected(self):
        assert self._validate_collection_access(5, 1, []) is False
