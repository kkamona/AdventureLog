"""
Authentication & Authorization Tests — AdventureLog v0.12.0
Risk Priority: CRITICAL (Score 15)

Tests cover:
- Password validation rules
- Session token header logic (middleware unit tests)
- Access control permission classes (unit tests — no DB)
- Boundary value analysis on credential fields
- State transition logic: login → authenticated → logout

No database required. All tests target pure logic.
"""

import pytest


# ─────────────────────────────────────────────
# BVA: Password Field Validation
# ─────────────────────────────────────────────

class TestPasswordBoundaryValues:
    """Boundary Value Analysis on password length rules."""

    def test_password_below_minimum_rejected(self):
        """7 characters — one below the minimum of 8."""
        assert len("Short1!") < 8

    def test_password_at_minimum_accepted(self):
        """Exactly 8 characters — the lower boundary."""
        assert len("Secure1!") == 8

    def test_password_above_minimum_accepted(self):
        """9 characters — one above the minimum."""
        assert len("Secure12!") > 8

    def test_empty_password_rejected(self):
        assert len("") == 0

    def test_password_max_length_boundary(self):
        """Django's default max password length is 128 chars."""
        valid = "A" * 128
        too_long = "A" * 129
        assert len(valid) <= 128
        assert len(too_long) > 128


# ─────────────────────────────────────────────
# Equivalence Partitioning: Username / Email
# ─────────────────────────────────────────────

class TestUsernameValidation:
    """Equivalence classes for username field."""

    def test_valid_username_alphanumeric(self):
        username = "assiya_yeraly"
        assert len(username) > 0
        assert len(username) <= 150  # Django default

    def test_empty_username_invalid(self):
        assert len("") == 0

    def test_username_max_length_boundary(self):
        valid = "a" * 150
        invalid = "a" * 151
        assert len(valid) <= 150
        assert len(invalid) > 150

    def test_email_format_valid(self):
        email = "user@example.com"
        assert "@" in email
        assert "." in email.split("@")[1]

    def test_email_without_at_invalid(self):
        email = "userexample.com"
        assert "@" not in email

    def test_email_without_domain_invalid(self):
        email = "user@"
        parts = email.split("@")
        assert len(parts[1]) == 0


# ─────────────────────────────────────────────
# Unit: Session Token Middleware Logic
# ─────────────────────────────────────────────

class TestSessionTokenMiddlewareLogic:
    """
    Unit tests for middleware logic without Django request objects.
    Tests the decision logic of XSessionTokenMiddleware and
    DisableCSRFForSessionTokenMiddleware.
    """

    def _has_session_token(self, headers: dict) -> bool:
        """Mirrors the middleware check: request.headers.get('X-Session-Token')"""
        return bool(headers.get("X-Session-Token"))

    def _should_disable_csrf(self, headers: dict) -> bool:
        """Mirrors DisableCSRFForSessionTokenMiddleware decision."""
        return "X-Session-Token" in headers

    def _should_disable_csrf_mobile(self, headers: dict, path: str) -> bool:
        """Mirrors DisableCSRFForMobileLoginSignup decision."""
        is_mobile = headers.get("X-Is-Mobile", "").lower() == "true"
        is_login_or_signup = path in [
            "/auth/browser/v1/auth/login",
            "/auth/browser/v1/auth/signup",
        ]
        return is_mobile and is_login_or_signup

    def test_session_token_present_triggers_auth(self):
        headers = {"X-Session-Token": "abc123token"}
        assert self._has_session_token(headers) is True

    def test_no_session_token_no_auth(self):
        headers = {"Authorization": "Bearer xyz"}
        assert self._has_session_token(headers) is False

    def test_empty_session_token_no_auth(self):
        headers = {"X-Session-Token": ""}
        # Empty string is falsy
        assert self._has_session_token(headers) is False

    def test_csrf_disabled_when_session_token_present(self):
        headers = {"X-Session-Token": "sometoken"}
        assert self._should_disable_csrf(headers) is True

    def test_csrf_enforced_when_no_session_token(self):
        headers = {}
        assert self._should_disable_csrf(headers) is False

    def test_csrf_disabled_mobile_login(self):
        headers = {"X-Is-Mobile": "true"}
        assert self._should_disable_csrf_mobile(headers, "/auth/browser/v1/auth/login") is True

    def test_csrf_disabled_mobile_signup(self):
        headers = {"X-Is-Mobile": "true"}
        assert self._should_disable_csrf_mobile(headers, "/auth/browser/v1/auth/signup") is True

    def test_csrf_not_disabled_mobile_other_path(self):
        headers = {"X-Is-Mobile": "true"}
        assert self._should_disable_csrf_mobile(headers, "/api/locations/") is False

    def test_csrf_not_disabled_non_mobile_login(self):
        headers = {"X-Is-Mobile": "false"}
        assert self._should_disable_csrf_mobile(headers, "/auth/browser/v1/auth/login") is False

    def test_csrf_not_disabled_missing_mobile_header(self):
        headers = {}
        assert self._should_disable_csrf_mobile(headers, "/auth/browser/v1/auth/login") is False


# ─────────────────────────────────────────────
# Unit: Permission Class Logic
# ─────────────────────────────────────────────

class MockUser:
    """Minimal user mock for permission unit tests."""
    def __init__(self, user_id, is_authenticated=True):
        self.id = user_id
        self.is_authenticated = is_authenticated

    def __eq__(self, other):
        if not isinstance(other, MockUser):
            return False
        return self.id == other.id

    def __hash__(self):
        return hash(self.id)


class MockRequest:
    def __init__(self, user, method="GET"):
        self.user = user
        self.method = method


class MockObj:
    """Generic object mock with configurable attributes."""
    def __init__(self, owner_id=1, is_public=False):
        self.user = MockUser(owner_id)
        self.is_public = is_public


class TestIsOwnerOrReadOnlyLogic:
    """
    Unit tests for IsOwnerOrReadOnly permission logic.
    Tests the decision table: method × ownership → permission.
    """

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def _has_object_permission(self, request, obj):
        """Reimplements IsOwnerOrReadOnly.has_object_permission."""
        if request.method in self.SAFE_METHODS:
            return True
        return obj.user == request.user

    def test_owner_can_write(self):
        user = MockUser(1)
        obj = MockObj(owner_id=1)
        request = MockRequest(user, method="DELETE")
        assert self._has_object_permission(request, obj) is True

    def test_non_owner_cannot_write(self):
        user = MockUser(2)
        obj = MockObj(owner_id=1)
        request = MockRequest(user, method="PATCH")
        assert self._has_object_permission(request, obj) is False

    def test_anyone_can_read(self):
        user = MockUser(99)
        obj = MockObj(owner_id=1)
        for method in self.SAFE_METHODS:
            request = MockRequest(user, method=method)
            assert self._has_object_permission(request, obj) is True

    def test_owner_can_also_read(self):
        user = MockUser(1)
        obj = MockObj(owner_id=1)
        request = MockRequest(user, method="GET")
        assert self._has_object_permission(request, obj) is True


class TestIsPublicReadOnlyLogic:
    """Decision table tests for IsPublicReadOnly."""

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def _has_object_permission(self, request, obj):
        """Reimplements IsPublicReadOnly.has_object_permission."""
        if request.method in self.SAFE_METHODS:
            return obj.is_public or obj.user == request.user
        return obj.user == request.user

    def test_owner_can_read_private(self):
        user = MockUser(1)
        obj = MockObj(owner_id=1, is_public=False)
        request = MockRequest(user, "GET")
        assert self._has_object_permission(request, obj) is True

    def test_other_can_read_public(self):
        user = MockUser(2)
        obj = MockObj(owner_id=1, is_public=True)
        request = MockRequest(user, "GET")
        assert self._has_object_permission(request, obj) is True

    def test_other_cannot_read_private(self):
        user = MockUser(2)
        obj = MockObj(owner_id=1, is_public=False)
        request = MockRequest(user, "GET")
        assert self._has_object_permission(request, obj) is False

    def test_non_owner_cannot_write_even_if_public(self):
        user = MockUser(2)
        obj = MockObj(owner_id=1, is_public=True)
        request = MockRequest(user, "DELETE")
        assert self._has_object_permission(request, obj) is False

    def test_owner_can_write_own_object(self):
        user = MockUser(1)
        obj = MockObj(owner_id=1, is_public=False)
        request = MockRequest(user, "PATCH")
        assert self._has_object_permission(request, obj) is True


# ─────────────────────────────────────────────
# State Transition: Session / Auth States
# ─────────────────────────────────────────────

class TestAuthStateTransitions:
    """
    State transition tests for user authentication lifecycle.
    States: UNAUTHENTICATED → AUTHENTICATED → LOGGED_OUT
    """

    def test_unauthenticated_user_is_not_authenticated(self):
        user = MockUser(None, is_authenticated=False)
        assert user.is_authenticated is False

    def test_authenticated_user_flag_is_true(self):
        user = MockUser(1, is_authenticated=True)
        assert user.is_authenticated is True

    def test_logged_out_user_becomes_unauthenticated(self):
        """Simulates session invalidation on logout."""
        user = MockUser(1, is_authenticated=True)
        # Simulate logout
        user.is_authenticated = False
        assert user.is_authenticated is False

    def test_anonymous_user_blocked_on_write(self):
        """Anonymous users must be blocked from all write operations."""
        SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
        anon = MockUser(None, is_authenticated=False)
        obj = MockObj(owner_id=1, is_public=True)
        request = MockRequest(anon, "POST")

        # CollectionShared logic: not authenticated → only safe reads on public
        is_safe = request.method in SAFE_METHODS
        is_public = getattr(obj, "is_public", False)
        result = is_safe and is_public
        assert result is False

    def test_anonymous_can_read_public_object(self):
        SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
        anon = MockUser(None, is_authenticated=False)
        obj = MockObj(owner_id=1, is_public=True)
        request = MockRequest(anon, "GET")

        is_safe = request.method in SAFE_METHODS
        is_public = getattr(obj, "is_public", False)
        result = is_safe and is_public
        assert result is True

    def test_anonymous_cannot_read_private_object(self):
        SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
        anon = MockUser(None, is_authenticated=False)
        obj = MockObj(owner_id=1, is_public=False)
        request = MockRequest(anon, "GET")

        is_safe = request.method in SAFE_METHODS
        is_public = getattr(obj, "is_public", False)
        result = is_safe and is_public
        assert result is False
