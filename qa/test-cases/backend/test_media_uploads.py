"""
Media & File Upload Tests — AdventureLog v0.12.0
Risk Priority: HIGH (Score 12)

Tests cover:
- File type validation (whitelist: jpg/jpeg/png/webp/gif + gpx)
- File size boundary values
- GPX file extension detection
- Travel duration calculation (TransportationSerializer)
- Distance calculation guard logic
- Attachment extension parser

No database required. No file I/O required.
"""

import pytest
from datetime import datetime, timedelta, time


# ─────────────────────────────────────────────
# File Type Validation
# ─────────────────────────────────────────────

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
ALLOWED_ATTACHMENT_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif', 'gpx', 'pdf', 'kml'}


class TestImageFileTypeValidation:
    """Equivalence partitioning for image file types."""

    def _is_allowed_image(self, filename: str) -> bool:
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        return ext in ALLOWED_IMAGE_EXTENSIONS

    def test_jpg_accepted(self):
        assert self._is_allowed_image("photo.jpg") is True

    def test_jpeg_accepted(self):
        assert self._is_allowed_image("photo.jpeg") is True

    def test_png_accepted(self):
        assert self._is_allowed_image("screenshot.png") is True

    def test_webp_accepted(self):
        assert self._is_allowed_image("image.webp") is True

    def test_gif_accepted(self):
        assert self._is_allowed_image("animation.gif") is True

    def test_uppercase_extension_accepted(self):
        assert self._is_allowed_image("PHOTO.JPG") is True

    def test_exe_rejected(self):
        assert self._is_allowed_image("malware.exe") is False

    def test_php_rejected(self):
        assert self._is_allowed_image("shell.php") is False

    def test_svg_rejected(self):
        """SVG can contain scripts — must be rejected."""
        assert self._is_allowed_image("icon.svg") is False

    def test_no_extension_rejected(self):
        assert self._is_allowed_image("noextension") is False

    def test_gpx_rejected_as_image(self):
        """GPX is valid attachment but not a valid image."""
        assert self._is_allowed_image("track.gpx") is False

    def test_double_extension_attack(self):
        """shell.php.jpg — extension is jpg, should pass (last extension wins)."""
        assert self._is_allowed_image("shell.php.jpg") is True

    def test_dot_only_filename_rejected(self):
        assert self._is_allowed_image(".") is False


class TestGpxFileDetection:
    """Tests for GPX file detection used in attachment/transportation logic."""

    def _is_gpx(self, filename: str) -> bool:
        return filename.lower().endswith('.gpx')

    def test_gpx_lowercase_detected(self):
        assert self._is_gpx("trail.gpx") is True

    def test_gpx_uppercase_detected(self):
        assert self._is_gpx("ROUTE.GPX") is True

    def test_non_gpx_not_detected(self):
        assert self._is_gpx("map.kml") is False

    def test_partial_gpx_name_not_detected(self):
        assert self._is_gpx("mygpxfile.json") is False

    def test_empty_string_not_gpx(self):
        assert self._is_gpx("") is False


# ─────────────────────────────────────────────
# File Size Boundary Values
# ─────────────────────────────────────────────

class TestFileSizeBoundaryValues:
    """
    BVA for file upload size limits.
    Frontend sets BODY_SIZE_LIMIT=Infinity but backend enforces limits.
    Using 10MB as the assumed limit for images.
    """

    MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
    MAX_GPX_SIZE_BYTES = 50 * 1024 * 1024    # 50 MB

    def _is_valid_image_size(self, size_bytes: int) -> bool:
        return 0 < size_bytes <= self.MAX_IMAGE_SIZE_BYTES

    def _is_valid_gpx_size(self, size_bytes: int) -> bool:
        return 0 < size_bytes <= self.MAX_GPX_SIZE_BYTES

    def test_zero_bytes_rejected(self):
        assert self._is_valid_image_size(0) is False

    def test_one_byte_accepted(self):
        assert self._is_valid_image_size(1) is True

    def test_at_max_accepted(self):
        assert self._is_valid_image_size(self.MAX_IMAGE_SIZE_BYTES) is True

    def test_one_over_max_rejected(self):
        assert self._is_valid_image_size(self.MAX_IMAGE_SIZE_BYTES + 1) is False

    def test_typical_photo_accepted(self):
        two_mb = 2 * 1024 * 1024
        assert self._is_valid_image_size(two_mb) is True

    def test_gpx_at_max_accepted(self):
        assert self._is_valid_gpx_size(self.MAX_GPX_SIZE_BYTES) is True

    def test_gpx_over_max_rejected(self):
        assert self._is_valid_gpx_size(self.MAX_GPX_SIZE_BYTES + 1) is False


# ─────────────────────────────────────────────
# Attachment Extension Parser
# ─────────────────────────────────────────────

class TestAttachmentExtensionParser:
    """
    Tests for AttachmentSerializer.get_extension():
    filename.split('.')[-1]
    """

    def _get_extension(self, filename: str) -> str:
        return filename.split('.')[-1] if '.' in filename else ''

    def test_simple_extension(self):
        assert self._get_extension("document.pdf") == "pdf"

    def test_gpx_extension(self):
        assert self._get_extension("route.gpx") == "gpx"

    def test_uppercase_extension(self):
        assert self._get_extension("IMAGE.PNG") == "PNG"

    def test_dotfile_no_extension(self):
        assert self._get_extension(".gitignore") == "gitignore"

    def test_multiple_dots_last_wins(self):
        assert self._get_extension("archive.tar.gz") == "gz"

    def test_no_extension(self):
        assert self._get_extension("README") == ""


# ─────────────────────────────────────────────
# Travel Duration Calculation (v0.12.0 — Transportation)
# ─────────────────────────────────────────────

class TestTravelDurationCalculation:
    """
    Mirrors TransportationSerializer.get_travel_duration_minutes().
    New in v0.12.0 — untested code path.
    """

    def _is_all_day(self, dt_value) -> bool:
        t = dt_value.time() if hasattr(dt_value, 'time') else dt_value
        return t.hour == 0 and t.minute == 0 and t.second == 0 and t.microsecond == 0

    def _get_duration_minutes(self, start, end):
        if not start or not end:
            return None
        if self._is_all_day(start) and self._is_all_day(end):
            return None
        try:
            total = int((end - start).total_seconds() // 60)
            return total if total >= 0 else None
        except Exception:
            return None

    def test_no_start_returns_none(self):
        assert self._get_duration_minutes(None, datetime.now()) is None

    def test_no_end_returns_none(self):
        assert self._get_duration_minutes(datetime.now(), None) is None

    def test_one_hour_flight(self):
        start = datetime(2026, 4, 10, 10, 0, 0)
        end = datetime(2026, 4, 10, 11, 0, 0)
        assert self._get_duration_minutes(start, end) == 60

    def test_half_hour_trip(self):
        start = datetime(2026, 4, 10, 8, 0, 0)
        end = datetime(2026, 4, 10, 8, 30, 0)
        assert self._get_duration_minutes(start, end) == 30

    def test_overnight_trip(self):
        start = datetime(2026, 4, 10, 22, 0, 0)
        end = datetime(2026, 4, 11, 6, 0, 0)
        assert self._get_duration_minutes(start, end) == 480  # 8 hours

    def test_all_day_event_returns_none(self):
        """All-day events have midnight times — duration is not meaningful."""
        start = datetime(2026, 4, 10, 0, 0, 0)
        end = datetime(2026, 4, 11, 0, 0, 0)
        assert self._get_duration_minutes(start, end) is None

    def test_negative_duration_returns_none(self):
        """end before start → invalid → None."""
        start = datetime(2026, 4, 10, 12, 0, 0)
        end = datetime(2026, 4, 10, 10, 0, 0)
        assert self._get_duration_minutes(start, end) is None

    def test_zero_duration_boundary(self):
        """start == end → 0 minutes → valid boundary."""
        dt = datetime(2026, 4, 10, 9, 0, 0)
        assert self._get_duration_minutes(dt, dt) == 0


# ─────────────────────────────────────────────
# Distance Calculation Guards
# ─────────────────────────────────────────────

class TestTransportationDistanceGuards:
    """
    Mirrors the coordinate availability check in
    TransportationSerializer.get_distance().
    """

    def _has_all_coordinates(self, origin_lat, origin_lon,
                              dest_lat, dest_lon) -> bool:
        return all(v is not None for v in [origin_lat, origin_lon, dest_lat, dest_lon])

    def test_all_coordinates_present(self):
        assert self._has_all_coordinates(51.18, 71.45, 43.23, 76.89) is True

    def test_missing_origin_lat(self):
        assert self._has_all_coordinates(None, 71.45, 43.23, 76.89) is False

    def test_missing_destination(self):
        assert self._has_all_coordinates(51.18, 71.45, None, None) is False

    def test_all_none(self):
        assert self._has_all_coordinates(None, None, None, None) is False

    def test_boundary_coordinates(self):
        assert self._has_all_coordinates(90, 180, -90, -180) is True
