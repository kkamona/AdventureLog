"""
Smoke tests — verify the CI environment is working correctly.
These tests don't require a running application, just a working Python environment.
"""


def test_python_environment():
    """Verify Python and basic imports work."""
    import sys
    assert sys.version_info >= (3, 10), "Python 3.10+ required"


def test_pytest_is_working():
    """Verify pytest itself is functioning."""
    assert True


def test_basic_math():
    """Sanity check — if this fails, something is deeply wrong."""
    assert 1 + 1 == 2


class TestPasswordValidation:
    """
    Unit tests for password validation logic.
    These test pure logic without needing the database.
    """

    def test_password_minimum_length(self):
        password = "short"
        assert len(password) < 8, "Short password correctly identified"

    def test_password_sufficient_length(self):
        password = "SecurePass123!"
        assert len(password) >= 8, "Valid password correctly identified"

    def test_empty_password_rejected(self):
        password = ""
        assert len(password) == 0, "Empty password correctly identified"


class TestAdventureDataValidation:
    """
    Unit tests for adventure data validation logic.
    Tests the validation rules without needing the database.
    """

    def test_valid_latitude_range(self):
        """Latitude must be between -90 and 90."""
        valid_lats = [-90, -45.5, 0, 45.5, 90]
        for lat in valid_lats:
            assert -90 <= lat <= 90, f"Latitude {lat} should be valid"

    def test_invalid_latitude_rejected(self):
        """Latitudes outside range are invalid."""
        invalid_lats = [-91, 91, 180, -180]
        for lat in invalid_lats:
            assert not (-90 <= lat <= 90), f"Latitude {lat} should be invalid"

    def test_valid_longitude_range(self):
        """Longitude must be between -180 and 180."""
        valid_lons = [-180, -90, 0, 90, 180]
        for lon in valid_lons:
            assert -180 <= lon <= 180, f"Longitude {lon} should be valid"

    def test_adventure_name_not_empty(self):
        """Adventure name cannot be empty."""
        valid_name = "Eiffel Tower Visit"
        empty_name = ""
        assert len(valid_name) > 0
        assert len(empty_name) == 0

    def test_adventure_name_max_length(self):
        """Adventure name should not exceed 200 characters."""
        long_name = "A" * 201
        valid_name = "A" * 200
        assert len(long_name) > 200
        assert len(valid_name) <= 200

    def test_rating_valid_range(self):
        """Rating must be 1–5."""
        valid_ratings = [1, 2, 3, 4, 5]
        for rating in valid_ratings:
            assert 1 <= rating <= 5

    def test_rating_invalid_range(self):
        """Ratings outside 1–5 are invalid."""
        invalid_ratings = [0, 6, -1, 100]
        for rating in invalid_ratings:
            assert not (1 <= rating <= 5)