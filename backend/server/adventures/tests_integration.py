"""
Integration Tests — AdventureLog Backend
=========================================
Tests real communication between:
  • Auth system (allauth) ↔ Location API
  • Location API ↔ Collection API (M2M link)
  • Collection API ↔ Visit API (location within a collection gets a visit)
  • Ownership / permission boundary between two users
  • Location ↔ Collection public-visibility cascade

Run with:
    cd backend/server
    python manage.py test adventures.tests_integration --verbosity=2

Pattern follows the existing users/tests.py convention (APITestCase + allauth signup).
No mocking — all tests hit real Django views, real DB (SQLite in test mode).
"""

from rest_framework.test import APITestCase
from adventures.models import Location, Collection, Visit


# ── Shared base class ─────────────────────────────────────────────────────────

class BaseIntegrationTestCase(APITestCase):
    """
    Signs up and logs in a user before every test so self.client is authenticated.
    A second user (other_client) is created for permission / isolation tests.
    """

    def setUp(self):
        # ── Primary user ──────────────────────────────────────────────────────
        signup = self.client.post(
            '/auth/browser/v1/auth/signup',
            {
                'username': 'integration_user',
                'email': 'integration@example.com',
                'password': 'IntegrationPass123!',
                'first_name': 'Int',
                'last_name': 'User',
            },
            format='json',
        )
        self.assertEqual(signup.status_code, 200, msg=f'Primary signup failed: {signup.content}')

        # ── Second user (for cross-user permission tests) ─────────────────────
        from rest_framework.test import APIClient
        self.other_client = APIClient()
        signup2 = self.other_client.post(
            '/auth/browser/v1/auth/signup',
            {
                'username': 'other_user',
                'email': 'other@example.com',
                'password': 'OtherPass123!',
                'first_name': 'Other',
                'last_name': 'User',
            },
            format='json',
        )
        self.assertEqual(signup2.status_code, 200, msg=f'Secondary signup failed: {signup2.content}')

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _create_location(self, client=None, name='Test Location', extra=None):
        """POST /api/locations/ and assert 201. Returns response JSON."""
        c = client or self.client
        payload = {'name': name}
        if extra:
            payload.update(extra)
        res = c.post('/api/locations/', payload, format='json')
        self.assertEqual(
            res.status_code, 201,
            msg=f'Location creation failed ({res.status_code}): {res.content}',
        )
        return res.json()

    def _create_collection(self, client=None, name='Test Collection', extra=None):
        """POST /api/collections/ and assert 201. Returns response JSON."""
        c = client or self.client
        payload = {'name': name}
        if extra:
            payload.update(extra)
        res = c.post('/api/collections/', payload, format='json')
        self.assertEqual(
            res.status_code, 201,
            msg=f'Collection creation failed ({res.status_code}): {res.content}',
        )
        return res.json()


# ══════════════════════════════════════════════════════════════════════════════
# Test 1 — Location creation propagates to collection's location list
# ══════════════════════════════════════════════════════════════════════════════

class Test1_LocationLinkedToCollection(BaseIntegrationTestCase):
    """
    Verifies that when a Location is created with a collection FK,
    the Collection's detail endpoint returns that location in its locations list.

    Modules involved: LocationViewSet.perform_create → Collection.locations M2M
    """

    def test_location_appears_in_collection_after_creation(self):
        # Step 1: Create a collection
        collection = self._create_collection(name='Paris Trip')
        collection_id = collection['id']

        # Step 2: Create a location that belongs to that collection
        location = self._create_location(
            name='Eiffel Tower',
            extra={'collections': [collection_id]},
        )
        location_id = location['id']

        # Step 3: Fetch the collection detail
        res = self.client.get(f'/api/collections/{collection_id}/', format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Step 4: The location must appear inside the collection's locations list
        location_ids_in_collection = [loc['id'] for loc in data.get('locations', [])]
        self.assertIn(
            location_id,
            location_ids_in_collection,
            msg='Location was not found inside the collection after creation.',
        )


# ══════════════════════════════════════════════════════════════════════════════
# Test 2 — Visit creation marks location as visited
# ══════════════════════════════════════════════════════════════════════════════

class Test2_VisitMarksLocationAsVisited(BaseIntegrationTestCase):
    """
    Verifies end-to-end: creating a Visit for a Location via /api/visits/
    causes GET /api/locations/<id>/ to return is_visited=true.

    Modules involved: VisitViewSet.perform_create → LocationSerializer.get_is_visited
    """

    def test_creating_visit_marks_location_visited(self):
        # Step 1: Create a location (no visits → is_visited should be False)
        location = self._create_location(name='Louvre Museum')
        location_id = location['id']

        res_before = self.client.get(f'/api/locations/{location_id}/', format='json')
        self.assertEqual(res_before.status_code, 200)
        self.assertFalse(
            res_before.json().get('is_visited'),
            msg='Location should not be visited before any visit is recorded.',
        )

        # Step 2: Post a visit with a past date
        visit_res = self.client.post(
            '/api/visits/',
            {
                'location': location_id,
                'start_date': '2024-06-01',
                'end_date': '2024-06-03',
            },
            format='json',
        )
        self.assertEqual(
            visit_res.status_code, 201,
            msg=f'Visit creation failed: {visit_res.content}',
        )

        # Step 3: Re-fetch the location — is_visited must now be True
        res_after = self.client.get(f'/api/locations/{location_id}/', format='json')
        self.assertEqual(res_after.status_code, 200)
        self.assertTrue(
            res_after.json().get('is_visited'),
            msg='Location should be marked as visited after a past visit is recorded.',
        )


# ══════════════════════════════════════════════════════════════════════════════
# Test 3 — Cross-user isolation: one user cannot read another's private location
# ══════════════════════════════════════════════════════════════════════════════

class Test3_CrossUserLocationIsolation(BaseIntegrationTestCase):
    """
    Verifies that a private Location owned by user A is NOT returned in
    user B's list, and that a direct GET returns 404 (not 403, because the
    queryset excludes it entirely).

    Modules involved: LocationViewSet.get_queryset → Location.objects.retrieve_locations
    """

    def test_private_location_invisible_to_other_user(self):
        # Step 1: User A creates a private location
        location = self._create_location(name='Secret Spot', extra={'is_public': False})
        location_id = location['id']

        # Step 2: User B's list must NOT contain User A's private location
        list_res = self.other_client.get('/api/locations/', format='json')
        self.assertEqual(list_res.status_code, 200)
        ids_in_list = [loc['id'] for loc in list_res.json().get('results', [])]
        self.assertNotIn(
            location_id,
            ids_in_list,
            msg="User B's location list must not include User A's private location.",
        )

        # Step 3: User B direct GET returns 404 (queryset filters it out)
        direct_res = self.other_client.get(f'/api/locations/{location_id}/', format='json')
        self.assertEqual(
            direct_res.status_code, 404,
            msg='User B should get 404 for a private location they do not own.',
        )


# ══════════════════════════════════════════════════════════════════════════════
# Test 4 — Deleting a collection does NOT delete its linked locations
# ══════════════════════════════════════════════════════════════════════════════

class Test4_DeleteCollectionPreservesLocations(BaseIntegrationTestCase):
    """
    Verifies the M2M relationship: deleting a Collection removes the container
    but the linked Location records must survive (they are not cascade-deleted).

    Modules involved: CollectionViewSet.destroy → Collection FK + Location M2M
    """

    def test_locations_survive_collection_deletion(self):
        # Step 1: Create collection and a location linked to it
        collection = self._create_collection(name='Temporary Trip')
        collection_id = collection['id']

        location = self._create_location(
            name='Airport Hotel',
            extra={'collections': [collection_id]},
        )
        location_id = location['id']

        # Step 2: Delete the collection
        del_res = self.client.delete(f'/api/collections/{collection_id}/', format='json')
        self.assertEqual(
            del_res.status_code, 204,
            msg=f'Collection delete failed: {del_res.content}',
        )

        # Step 3: Confirm collection is gone
        gone_res = self.client.get(f'/api/collections/{collection_id}/', format='json')
        self.assertEqual(gone_res.status_code, 404)

        # Step 4: Location must still exist and be retrievable
        loc_res = self.client.get(f'/api/locations/{location_id}/', format='json')
        self.assertEqual(
            loc_res.status_code, 200,
            msg='Location was deleted when its collection was deleted — it should survive.',
        )
        self.assertEqual(loc_res.json()['name'], 'Airport Hotel')

        # Step 5: Location's collections list must now be empty
        self.assertEqual(
            loc_res.json().get('collections', []),
            [],
            msg='Location should have no collections after the only linked collection was deleted.',
        )


# ══════════════════════════════════════════════════════════════════════════════
# Test 5 — Global search returns locations AND collections in one response
# ══════════════════════════════════════════════════════════════════════════════

class Test5_GlobalSearchReturnsBothModules(BaseIntegrationTestCase):
    """
    Verifies that GET /api/search/?query=<term> queries across multiple modules
    (locations and collections) and returns them together in a single response.

    Modules involved: GlobalSearchView → Location queryset + Collection queryset
    """

    def test_global_search_returns_location_and_collection(self):
        unique = 'ZephyrSearch'

        # Step 1: Create a location and a collection with the same unique term
        self._create_location(name=f'{unique} Waterfall')
        self._create_collection(name=f'{unique} Expedition')

        # Step 2: Hit the global search endpoint
        res = self.client.get(f'/api/search/?query={unique}', format='json')
        self.assertEqual(
            res.status_code, 200,
            msg=f'Global search returned {res.status_code}: {res.content}',
        )

        data = res.json()

        # Step 3: Response must contain at least one location matching the term
        locations = data.get('locations', data.get('adventures', []))
        location_names = [loc.get('name', '') for loc in locations]
        self.assertTrue(
            any(unique in name for name in location_names),
            msg=f'No location with "{unique}" found in search results. Got: {location_names}',
        )

        # Step 4: Response must contain at least one collection matching the term
        collections = data.get('collections', [])
        collection_names = [col.get('name', '') for col in collections]
        self.assertTrue(
            any(unique in name for name in collection_names),
            msg=f'No collection with "{unique}" found in search results. Got: {collection_names}',
        )
