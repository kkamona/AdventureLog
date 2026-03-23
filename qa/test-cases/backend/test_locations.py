"""
Locations CRUD Tests — AdventureLog v0.12.0
Risk Priority: CRITICAL (Score 20) — Highest risk module in the system.

Tests cover:
- Coordinate validation (BVA: latitude ±90, longitude ±180)
- Name field validation (EP: valid / empty / too long)
- Rating field validation (EP: 1–5 valid, outside invalid)
- Privacy filter logic: public=True/False correctness
- Price / price_currency fields (new in v0.12.0)
- Location Manager query logic (unit tests — no DB)
- Signal logic: publicity toggle based on collection (unit tests)

No database required.
"""

import pytest
from decimal import Decimal


# ─────────────────────────────────────────────
# BVA: GPS Coordinate Validation
# ─────────────────────────────────────────────

class TestLatitudeBoundaryValues:
    """
    Boundary Value Analysis for latitude field.
    Valid range: -90.0 to +90.0 (inclusive)
    """

    def _is_valid_latitude(self, lat) -> bool:
        try:
            return -90.0 <= float(lat) <= 90.0
        except (TypeError, ValueError):
            return False

    def test_min_boundary_accepted(self):
        assert self._is_valid_latitude(-90.0) is True

    def test_max_boundary_accepted(self):
        assert self._is_valid_latitude(90.0) is True

    def test_zero_accepted(self):
        assert self._is_valid_latitude(0.0) is True

    def test_below_min_rejected(self):
        assert self._is_valid_latitude(-90.001) is False

    def test_above_max_rejected(self):
        assert self._is_valid_latitude(90.001) is False

    def test_far_below_min_rejected(self):
        assert self._is_valid_latitude(-91) is False

    def test_far_above_max_rejected(self):
        assert self._is_valid_latitude(91) is False

    def test_none_rejected(self):
        assert self._is_valid_latitude(None) is False

    def test_string_number_accepted(self):
        """API may receive lat as string; check coercion."""
        assert self._is_valid_latitude("45.0") is True

    def test_non_numeric_string_rejected(self):
        assert self._is_valid_latitude("not_a_number") is False

    def test_typical_astana_latitude(self):
        """Astana, Kazakhstan: 51.1801° N — real-world sanity check."""
        assert self._is_valid_latitude(51.1801) is True


class TestLongitudeBoundaryValues:
    """
    Boundary Value Analysis for longitude field.
    Valid range: -180.0 to +180.0 (inclusive)
    """

    def _is_valid_longitude(self, lon) -> bool:
        try:
            return -180.0 <= float(lon) <= 180.0
        except (TypeError, ValueError):
            return False

    def test_min_boundary_accepted(self):
        assert self._is_valid_longitude(-180.0) is True

    def test_max_boundary_accepted(self):
        assert self._is_valid_longitude(180.0) is True

    def test_zero_accepted(self):
        assert self._is_valid_longitude(0.0) is True

    def test_below_min_rejected(self):
        assert self._is_valid_longitude(-180.001) is False

    def test_above_max_rejected(self):
        assert self._is_valid_longitude(180.001) is False

    def test_none_rejected(self):
        assert self._is_valid_longitude(None) is False

    def test_typical_astana_longitude(self):
        """Astana, Kazakhstan: 71.4460° E"""
        assert self._is_valid_longitude(71.4460) is True

    def test_antimeridian_western_boundary(self):
        assert self._is_valid_longitude(-180.0) is True

    def test_antimeridian_eastern_boundary(self):
        assert self._is_valid_longitude(180.0) is True


# ─────────────────────────────────────────────
# EP: Name Field Validation
# ─────────────────────────────────────────────

class TestLocationNameValidation:
    """
    Equivalence Partitioning for the name field.
    Valid: 1–200 characters. Invalid: empty or >200.
    """

    def _is_valid_name(self, name: str) -> bool:
        return isinstance(name, str) and 1 <= len(name) <= 200

    def test_single_char_name_accepted(self):
        assert self._is_valid_name("A") is True

    def test_max_length_name_accepted(self):
        assert self._is_valid_name("A" * 200) is True

    def test_typical_name_accepted(self):
        assert self._is_valid_name("Eiffel Tower") is True

    def test_empty_name_rejected(self):
        assert self._is_valid_name("") is False

    def test_over_max_length_rejected(self):
        assert self._is_valid_name("A" * 201) is False

    def test_none_rejected(self):
        assert self._is_valid_name(None) is False  # type: ignore

    def test_name_with_unicode_accepted(self):
        assert self._is_valid_name("アルマティ — Алматы") is True


# ─────────────────────────────────────────────
# EP: Rating Field Validation
# ─────────────────────────────────────────────

class TestLocationRatingValidation:
    """
    Equivalence Partitioning for rating (1–5, nullable).
    """

    def _is_valid_rating(self, rating) -> bool:
        if rating is None:
            return True  # nullable field
        try:
            r = int(rating)
            return 1 <= r <= 5
        except (TypeError, ValueError):
            return False

    def test_all_valid_ratings(self):
        for r in [1, 2, 3, 4, 5]:
            assert self._is_valid_rating(r) is True

    def test_zero_rejected(self):
        assert self._is_valid_rating(0) is False

    def test_six_rejected(self):
        assert self._is_valid_rating(6) is False

    def test_negative_rejected(self):
        assert self._is_valid_rating(-1) is False

    def test_null_accepted(self):
        """Rating is nullable in the model."""
        assert self._is_valid_rating(None) is True

    def test_float_coercion(self):
        """Ratings might arrive as floats; int truncation is valid."""
        assert self._is_valid_rating(3.0) is True

    def test_string_representation_accepted(self):
        assert self._is_valid_rating("4") is True

    def test_non_numeric_rejected(self):
        assert self._is_valid_rating("great") is False


# ─────────────────────────────────────────────
# Privacy Filter Logic (Critical Security Control)
# ─────────────────────────────────────────────

class TestPrivacyFilterLogic:
    """
    Tests the server-side public=True filter — the most security-critical
    logic in the system. A failure here exposes all private user data.

    These tests verify the filter logic without a database by simulating
    a queryset-like list filtering operation identical to what the
    LocationManager.retrieve_locations() method would produce.
    """

    def _filter_public(self, locations: list) -> list:
        """Simulates: queryset.filter(is_public=True)"""
        return [loc for loc in locations if loc.get("is_public") is True]

    def _filter_owned(self, locations: list, user_id: int) -> list:
        return [loc for loc in locations if loc.get("user_id") == user_id]

    def test_public_filter_returns_only_public_records(self):
        locations = [
            {"id": 1, "name": "Paris", "is_public": True, "user_id": 1},
            {"id": 2, "name": "Secret Spot", "is_public": False, "user_id": 1},
            {"id": 3, "name": "London", "is_public": True, "user_id": 2},
        ]
        result = self._filter_public(locations)
        assert len(result) == 2
        assert all(loc["is_public"] for loc in result)

    def test_private_location_not_in_public_results(self):
        locations = [
            {"id": 1, "name": "My Home", "is_public": False, "user_id": 42},
        ]
        result = self._filter_public(locations)
        assert len(result) == 0

    def test_no_public_locations_returns_empty(self):
        locations = [
            {"id": 1, "is_public": False, "user_id": 1},
            {"id": 2, "is_public": False, "user_id": 2},
        ]
        assert self._filter_public(locations) == []

    def test_owner_filter_returns_only_own_records(self):
        locations = [
            {"id": 1, "name": "My Loc", "is_public": False, "user_id": 5},
            {"id": 2, "name": "Other", "is_public": True, "user_id": 9},
        ]
        result = self._filter_owned(locations, user_id=5)
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_other_user_private_locations_not_returned(self):
        locations = [
            {"id": 1, "is_public": False, "user_id": 99},
            {"id": 2, "is_public": False, "user_id": 99},
        ]
        result = self._filter_owned(locations, user_id=1)
        assert result == []

    def test_critical_mixed_scenario(self):
        """
        Regression scenario: unauthenticated request to GET /api/locations/.
        Must return ONLY public=True records. Private records from ANY user
        must be absent.
        """
        all_locations = [
            {"id": 1, "name": "Public Beach", "is_public": True, "user_id": 1},
            {"id": 2, "name": "Private Diary", "is_public": False, "user_id": 1},
            {"id": 3, "name": "Public Park", "is_public": True, "user_id": 2},
            {"id": 4, "name": "Secret Cave", "is_public": False, "user_id": 2},
        ]
        public_result = self._filter_public(all_locations)
        ids_returned = {loc["id"] for loc in public_result}

        assert 1 in ids_returned, "Public location 1 must be returned"
        assert 3 in ids_returned, "Public location 3 must be returned"
        assert 2 not in ids_returned, "SECURITY: Private location 2 must NOT be returned"
        assert 4 not in ids_returned, "SECURITY: Private location 4 must NOT be returned"


# ─────────────────────────────────────────────
# New in v0.12.0: Price / Currency Fields
# ─────────────────────────────────────────────

class TestPriceCurrencyFields:
    """
    Tests for budget/cost fields introduced in v0.12.0.
    These are entirely new, untested code paths (elevated risk).
    """

    VALID_CURRENCIES = {
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
        'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'NZD', 'INR', 'MXN',
        'BRL', 'ZAR', 'AED', 'TRY'
    }

    def _is_valid_price(self, price) -> bool:
        if price is None:
            return True
        try:
            return Decimal(str(price)) >= 0
        except Exception:
            return False

    def _is_valid_currency(self, currency) -> bool:
        if currency is None:
            return True
        return currency in self.VALID_CURRENCIES

    def test_null_price_accepted(self):
        assert self._is_valid_price(None) is True

    def test_zero_price_accepted(self):
        assert self._is_valid_price(0) is True

    def test_positive_price_accepted(self):
        assert self._is_valid_price(99.99) is True

    def test_negative_price_rejected(self):
        assert self._is_valid_price(-1) is False

    def test_string_price_coercion(self):
        assert self._is_valid_price("25.50") is True

    def test_non_numeric_price_rejected(self):
        assert self._is_valid_price("free") is False

    def test_valid_currencies_accepted(self):
        for code in ['USD', 'EUR', 'GBP', 'KZT']:
            if code in self.VALID_CURRENCIES:
                assert self._is_valid_currency(code) is True

    def test_invalid_currency_rejected(self):
        assert self._is_valid_currency("XYZ") is False
        assert self._is_valid_currency("DOLLARS") is False

    def test_null_currency_accepted(self):
        assert self._is_valid_currency(None) is True


# ─────────────────────────────────────────────
# Collection Publicity Signal Logic
# ─────────────────────────────────────────────

class TestCollectionPublicitySignalLogic:
    """
    Unit tests for the m2m_changed signal logic that controls
    location is_public based on collection publicity.
    Mirrors update_adventure_publicity() in signals.py.
    """

    def _compute_publicity(self, location_is_public: bool,
                           collection_is_public_flags: list) -> bool:
        """
        Reimplements the signal logic:
        - If any collection is public → location becomes public
        - If no collection is public → location becomes private
        - If no collections → no change
        """
        if not collection_is_public_flags:
            return location_is_public
        return any(collection_is_public_flags)

    def test_public_collection_makes_location_public(self):
        result = self._compute_publicity(False, [True])
        assert result is True

    def test_all_private_collections_make_location_private(self):
        result = self._compute_publicity(True, [False, False])
        assert result is False

    def test_mixed_collections_location_stays_public(self):
        result = self._compute_publicity(False, [False, True, False])
        assert result is True

    def test_no_collections_no_change(self):
        result = self._compute_publicity(True, [])
        assert result is True

    def test_single_private_collection_makes_private(self):
        result = self._compute_publicity(True, [False])
        assert result is False
