"""
Unit Tests — Map
=================
Tests the map-facing data layer: coordinate field behaviour on the Location
model, MapPinSerializer output, and the IsOwnerOrSharedWithFullAccess
permission when applied to unauthenticated map requests.

No HTTP, no live server. All DB rows are created directly via the ORM.

Run:
    cd backend/server
    python manage.py test adventures.test_unit_map --verbosity=2
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from adventures.models import Location
from adventures.serializers import MapPinSerializer
from adventures.permissions import IsOwnerOrSharedWithFullAccess
from unittest.mock import MagicMock

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


def make_request(user=None, method="GET"):
    req = MagicMock()
    req.user = user or MagicMock(is_authenticated=False)
    req.method = method
    return req


# ─────────────────────────────────────────────────────────────────────────────
# 1. Location — latitude and longitude are optional (nullable)
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationCoordinatesOptional(TestCase):
    """
    Verify that a Location can be saved without coordinates.
    The map simply skips pinning locations with null lat/lng.
    Tests: adventures.models.Location.latitude / longitude (null=True, blank=True)
    """

    def setUp(self):
        self.user = make_user("map_coord_user")

    def test_location_saves_without_coordinates(self):
        loc = Location.objects.create(
            user=self.user, name="No Coords Place"
        )
        self.assertIsNone(loc.latitude)
        self.assertIsNone(loc.longitude)

    def test_location_saves_with_valid_coordinates(self):
        loc = Location.objects.create(
            user=self.user,
            name="Exact Place",
            latitude=Decimal("48.8566"),
            longitude=Decimal("2.3522"),
        )
        self.assertEqual(loc.latitude, Decimal("48.8566"))
        self.assertEqual(loc.longitude, Decimal("2.3522"))


# ─────────────────────────────────────────────────────────────────────────────
# 2. MapPinSerializer — null coordinates serialise as None (not omitted)
# ─────────────────────────────────────────────────────────────────────────────
class TestMapPinSerializerNullCoords(TestCase):
    """
    Verify that when a location has no coordinates, MapPinSerializer
    returns null for latitude and longitude rather than omitting the keys.
    The map frontend relies on these keys always being present.
    Tests: adventures.serializers.MapPinSerializer with null coords
    """

    def setUp(self):
        self.user = make_user("map_null_coord_user")

    def test_null_coords_serialised_as_none(self):
        loc = Location.objects.create(user=self.user, name="No Pin")
        data = MapPinSerializer(loc).data
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)
        self.assertIsNone(data["latitude"])
        self.assertIsNone(data["longitude"])


# ─────────────────────────────────────────────────────────────────────────────
# 3. MapPinSerializer — many=True returns all locations as a list
# ─────────────────────────────────────────────────────────────────────────────
class TestMapPinSerializerMany(TestCase):
    """
    Verify that serializing a queryset of locations with many=True
    returns a list with one entry per location.
    Tests: MapPinSerializer bulk serialization used in LocationViewSet.map_locations
    """

    def setUp(self):
        self.user = make_user("map_many_user")
        Location.objects.create(
            user=self.user, name="Pin A",
            latitude=Decimal("35.6762"), longitude=Decimal("139.6503"),
        )
        Location.objects.create(
            user=self.user, name="Pin B",
            latitude=Decimal("51.5074"), longitude=Decimal("-0.1278"),
        )

    def test_many_returns_list_of_correct_length(self):
        qs = Location.objects.filter(user=self.user)
        data = MapPinSerializer(qs, many=True).data
        self.assertEqual(len(data), 2)
        names = {item["name"] for item in data}
        self.assertIn("Pin A", names)
        self.assertIn("Pin B", names)


# ─────────────────────────────────────────────────────────────────────────────
# 4. IsOwnerOrSharedWithFullAccess — authenticated non-owner denied on private
# ─────────────────────────────────────────────────────────────────────────────
class TestMapPermissionNonOwnerDenied(TestCase):
    """
    Verify that an authenticated user who is not the owner and is not in
    shared_with cannot read a private location — relevant for map pin detail.
    Tests: adventures.permissions.IsOwnerOrSharedWithFullAccess.has_object_permission
    """

    def setUp(self):
        self.owner = make_user("map_perm_owner")
        self.other = make_user("map_perm_other")
        self.perm = IsOwnerOrSharedWithFullAccess()
        self.private_loc = Location.objects.create(
            user=self.owner, name="Owner Only", is_public=False
        )

    def test_non_owner_denied_read_on_private(self):
        req = make_request(user=self.other, method="GET")
        req.user.is_authenticated = True
        self.assertFalse(
            self.perm.has_object_permission(req, None, self.private_loc),
            "Non-owner must not read a private location.",
        )

    def test_owner_allowed_read_on_private(self):
        req = make_request(user=self.owner, method="GET")
        req.user.is_authenticated = True
        self.assertTrue(
            self.perm.has_object_permission(req, None, self.private_loc),
            "Owner must always read their own private location.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. Location — coordinate decimal precision is stored correctly
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationCoordinatePrecision(TestCase):
    """
    Verify that latitude and longitude are stored at 6 decimal places
    (max_digits=9, decimal_places=6), which is ~0.1 m accuracy — sufficient
    for map pin placement.
    Tests: adventures.models.Location.latitude / longitude DecimalField precision
    """

    def setUp(self):
        self.user = make_user("map_prec_user")

    def test_six_decimal_place_coordinates_round_trip(self):
        lat = Decimal("48.856614")
        lng = Decimal("2.352222")
        loc = Location.objects.create(
            user=self.user, name="Precise Pin",
            latitude=lat, longitude=lng,
        )
        loc.refresh_from_db()
        self.assertEqual(loc.latitude, lat)
        self.assertEqual(loc.longitude, lng)
