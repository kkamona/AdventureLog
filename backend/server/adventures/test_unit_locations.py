"""
Unit Tests — Locations
=======================
Tests Location model validation and LocationSerializer field logic
without HTTP requests or a live server.

Run:
    cd backend/server
    python manage.py test adventures.test_unit_locations --verbosity=2
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from adventures.models import Location, Collection
from adventures.serializers import LocationSerializer, MapPinSerializer

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. Location — name is required; blank name fails validation
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationNameRequired(TestCase):
    """
    Verify that Location cannot be created with a blank name.
    Tests: adventures.models.Location.name (max_length=200, not blank)
    """

    def setUp(self):
        self.user = make_user("loc_name_user")

    def test_blank_name_fails_full_clean(self):
        loc = Location(user=self.user, name="")
        with self.assertRaises(ValidationError):
            loc.full_clean()

    def test_valid_name_passes(self):
        loc = Location(user=self.user, name="Eiffel Tower")
        # Should not raise
        try:
            loc.full_clean()
        except ValidationError as e:
            # Only fail if 'name' is in the error dict
            self.assertNotIn("name", e.message_dict)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Location — is_public defaults to False
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationDefaultVisibility(TestCase):
    """
    Verify new locations are private by default.
    Tests: adventures.models.Location.is_public (default=False)
    """

    def setUp(self):
        self.user = make_user("loc_vis_user")

    def test_new_location_is_private_by_default(self):
        loc = Location.objects.create(user=self.user, name="My Secret Spot")
        self.assertFalse(
            loc.is_public,
            "A newly created Location must be private (is_public=False) by default.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Location — public collection forces location to be public (model.clean)
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationPublicCollectionEnforcement(TestCase):
    """
    Verify that adding a private location to a public collection
    raises a ValidationError (enforced in Collection.clean).
    Tests: adventures.models.Collection.clean
    """

    def setUp(self):
        self.user = make_user("pub_coll_user")

    def test_public_collection_with_private_location_raises(self):
        # Create a private location
        location = Location.objects.create(
            user=self.user, name="Private Place", is_public=False
        )
        # Create a collection, mark it public, link the private location
        collection = Collection.objects.create(
            user=self.user, name="Public Trip", is_public=True
        )
        collection.locations.add(location)
        with self.assertRaises(ValidationError):
            collection.clean()


# ─────────────────────────────────────────────────────────────────────────────
# 4. MapPinSerializer — only returns id, name, latitude, longitude
# ─────────────────────────────────────────────────────────────────────────────
class TestMapPinSerializerFields(TestCase):
    """
    Verify MapPinSerializer exposes only the fields the map needs:
    id, name, latitude, longitude — and nothing else.
    Tests: adventures.serializers.MapPinSerializer.Meta.fields
    """

    def setUp(self):
        self.user = make_user("map_pin_user")
        self.location = Location.objects.create(
            user=self.user,
            name="Tokyo Tower",
            latitude="35.658581",
            longitude="139.745433",
            is_public=False,
        )

    def test_pin_serializer_returns_expected_fields(self):
        data = MapPinSerializer(self.location).data
        self.assertIn("id", data)
        self.assertIn("name", data)
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)

    def test_pin_serializer_does_not_leak_private_fields(self):
        data = MapPinSerializer(self.location).data
        # Sensitive or heavy fields must not be present
        for field in ("description", "user", "images", "visits", "tags"):
            self.assertNotIn(
                field, data,
                msg=f"MapPinSerializer must not expose '{field}'.",
            )


# ─────────────────────────────────────────────────────────────────────────────
# 5. Location — str representation returns the location name
# ─────────────────────────────────────────────────────────────────────────────
class TestLocationStrRepresentation(TestCase):
    """
    Verify Location.__str__ returns the location name.
    This is used in Django admin dropdowns and log output.
    Tests: adventures.models.Location.__str__
    """

    def setUp(self):
        self.user = make_user("loc_str_user")

    def test_str_returns_name(self):
        loc = Location.objects.create(user=self.user, name="Machu Picchu")
        self.assertEqual(str(loc), "Machu Picchu")
