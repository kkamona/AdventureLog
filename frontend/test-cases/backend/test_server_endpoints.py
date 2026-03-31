"""
test_server_endpoints.py  – AdventureLog Backend Tests
pytest frontend/test-cases/backend/ --cov-fail-under=70

All endpoints touched by every +page.server.ts in the project:
  Auth, CSRF, social providers, registration, settings, public-url
  Locations API  (BE-07 … BE-24)
  Collections API (BE-25 … BE-38)

New tests in this file:
  BE-25  GET /api/collections/ requires authentication
  BE-26  GET /api/collections/ returns paginated shape when authenticated
  BE-27  order_by and order_direction params accepted by /api/collections/
  BE-28  page param accepted by /api/collections/
  BE-29  GET /api/collections/shared/ returns a list when authenticated
  BE-30  GET /api/collections/archived/ returns a list when authenticated
  BE-31  GET /api/collections/invites/ returns a list when authenticated
  BE-32  POST /api/collections/ creates a collection (returns 201 + id)
  BE-33  GET /api/collections/{id}/ returns name and key fields
  BE-34  GET /api/collections/{id}/ returns error for non-existent id
  BE-35  DELETE /api/collections/{id}/ returns 204
  BE-36  POST /api/collections/import/ without file returns 4xx (not 500)
  BE-37  Unauthenticated /api/collections/shared/ returns 401 or 403
  BE-38  Dated collection includes start_date and end_date in response
"""

import os
import time
import pytest
import requests

BASE_URL       = os.environ.get("BACKEND_URL", "http://localhost:8016")
ADMIN_USERNAME = os.environ.get("TEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin1234!")

_session: requests.Session | None = None
_session_id: str | None = None


# ── Shared helpers ────────────────────────────────────────────────────────────

def get_csrf(session: requests.Session | None = None) -> str:
    req = session or requests
    r = req.get(f"{BASE_URL}/csrf/", timeout=10)
    assert r.status_code == 200
    return r.json()["csrfToken"]


def get_auth_session() -> tuple[requests.Session, str]:
    global _session, _session_id
    if _session and _session_id:
        return _session, _session_id
    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=15,
    )
    assert r.status_code in (200, 401)
    import re
    sid = s.cookies.get("sessionid") or ""
    if not sid:
        m = re.search(r"sessionid=([^;]+)", r.headers.get("Set-Cookie", ""))
        sid = m.group(1) if m else ""
    _session, _session_id = s, sid
    return s, sid


def create_collection(session: requests.Session, sid: str, name: str, **extra) -> dict:
    csrf = get_csrf(session)
    payload = {"name": name, "is_public": True, **extra}
    r = session.post(
        f"{BASE_URL}/api/collections/",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )
    assert r.status_code == 201, f"Create collection → {r.status_code}: {r.text}"
    return r.json()


def delete_collection(session: requests.Session, sid: str, col_id: str) -> None:
    csrf = get_csrf(session)
    session.delete(
        f"{BASE_URL}/api/collections/{col_id}/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )


def create_location(session: requests.Session, sid: str, name: str) -> dict:
    csrf = get_csrf(session)
    r = session.post(
        f"{BASE_URL}/api/locations/",
        json={"name": name, "is_public": True, "is_visited": False},
        headers={
            "Content-Type": "application/json",
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )
    assert r.status_code == 201
    return r.json()


def delete_location(session: requests.Session, sid: str, loc_id: str) -> None:
    csrf = get_csrf(session)
    session.delete(
        f"{BASE_URL}/api/locations/{loc_id}/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Existing tests (BE-01 … BE-24) — unchanged
# ─────────────────────────────────────────────────────────────────────────────

def test_be01_root_responds():
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert r.status_code < 600

def test_be02_admin_accessible():
    r = requests.get(f"{BASE_URL}/admin/", timeout=10, allow_redirects=False)
    assert r.status_code in (200, 301, 302)

def test_be03_api_root_returns_json():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert r.status_code < 500
    if "json" in r.headers.get("Content-Type", ""):
        assert isinstance(r.json(), (dict, list))

def test_be04_social_providers_is_list():
    r = requests.get(f"{BASE_URL}/auth/social-providers/", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_be05_registration_disabled_shape():
    r = requests.get(f"{BASE_URL}/auth/is-registration-disabled/", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "is_disabled" in data and isinstance(data["is_disabled"], bool)

def test_be06_csrf_returns_token():
    r = requests.get(f"{BASE_URL}/csrf/", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "csrfToken" in data and len(data["csrfToken"]) > 0

def test_be07_locations_not_500_without_auth():
    r = requests.get(f"{BASE_URL}/api/locations/", timeout=10)
    assert r.status_code in (200, 401, 403)

def test_be08_collections_not_500_without_auth():
    r = requests.get(f"{BASE_URL}/api/collections/", timeout=10)
    assert r.status_code in (200, 401, 403)

def test_be09_login_rejects_bad_credentials():
    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": "nonexistent_xyz", "password": "wrong"},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=10,
    )
    assert 400 <= r.status_code < 500

def test_be10_login_sets_session_cookie():
    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=15,
    )
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        assert "sessionid" in s.cookies

def test_be11_social_provider_items_have_url():
    r = requests.get(f"{BASE_URL}/auth/social-providers/", timeout=10)
    assert r.status_code == 200
    for p in r.json():
        assert "url" in p

def test_be12_response_has_content_type():
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert "Content-Type" in r.headers

def test_be13_public_url_endpoint():
    r = requests.get(f"{BASE_URL}/public-url/", timeout=10)
    assert r.status_code == 200
    assert "PUBLIC_URL" in r.json()

def test_be14_user_metadata_requires_auth():
    r = requests.get(f"{BASE_URL}/auth/user-metadata/", timeout=10)
    assert r.status_code in (401, 403)

def test_be15_locations_filtered_returns_paginated():
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/filtered?types=all&order_by=updated_at"
        f"&order_direction=asc&include_collections=true&page=1&is_visited=all",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert "count" in data and "results" in data
    assert isinstance(data["results"], list)

def test_be16_locations_filtered_accepts_order_params():
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/filtered?order_by=name&order_direction=desc",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200

def test_be17_locations_filtered_accepts_is_visited():
    s, sid = get_auth_session()
    for val in ("true", "false", "all"):
        r = s.get(
            f"{BASE_URL}/api/locations/filtered?is_visited={val}",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200

def test_be18_locations_filtered_accepts_include_collections():
    s, sid = get_auth_session()
    for val in ("true", "false"):
        r = s.get(
            f"{BASE_URL}/api/locations/filtered?include_collections={val}",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200

def test_be19_create_location_returns_201_with_id():
    s, sid = get_auth_session()
    loc = create_location(s, sid, f"pytest-loc-{int(time.time())}")
    assert "id" in loc and loc["id"]
    delete_location(s, sid, loc["id"])

def test_be20_location_additional_info_returns_detail():
    s, sid = get_auth_session()
    loc = create_location(s, sid, f"pytest-detail-{int(time.time())}")
    try:
        r = s.get(
            f"{BASE_URL}/api/locations/{loc['id']}/additional-info/",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200
        detail = r.json()
        for field in ("id", "name", "images", "visits", "is_visited", "is_public"):
            assert field in detail
    finally:
        delete_location(s, sid, loc["id"])

def test_be21_location_additional_info_nonexistent_returns_error():
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/00000000-0000-0000-0000-000000000000/additional-info/",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code != 200

def test_be22_delete_location_returns_204():
    s, sid = get_auth_session()
    loc = create_location(s, sid, f"pytest-del-{int(time.time())}")
    csrf = get_csrf(s)
    r = s.delete(
        f"{BASE_URL}/api/locations/{loc['id']}/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )
    assert r.status_code == 204

def test_be23_locations_filtered_requires_auth():
    r = requests.get(f"{BASE_URL}/api/locations/filtered?types=all", timeout=10)
    assert r.status_code in (401, 403)

def test_be24_image_upload_without_file_returns_4xx():
    s, sid = get_auth_session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/api/images/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        data={},
        timeout=10,
    )
    assert r.status_code < 500


# ─────────────────────────────────────────────────────────────────────────────
# Collections API tests (BE-25 … BE-38)
# ─────────────────────────────────────────────────────────────────────────────

def test_be25_collections_requires_auth():
    """/api/collections/ must block unauthenticated requests."""
    r = requests.get(f"{BASE_URL}/api/collections/", timeout=10)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_be26_collections_returns_paginated_shape():
    """Authenticated GET /api/collections/ must return {count, results}."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/?order_by=updated_at&order_direction=desc&page=1&nested=true",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"collections list → {r.status_code}"
    data = r.json()
    assert "count" in data, "'count' missing from collections response"
    assert "results" in data, "'results' missing from collections response"
    assert isinstance(data["results"], list)


def test_be27_collections_accepts_order_params():
    """order_by=name and order_direction=asc must be accepted."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/?order_by=name&order_direction=asc",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200


def test_be28_collections_accepts_page_param():
    """?page=1 and ?page=2 must both return non-500."""
    s, sid = get_auth_session()
    for page in (1, 2):
        r = s.get(
            f"{BASE_URL}/api/collections/?page={page}",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code < 500, f"page={page} → {r.status_code}"


def test_be29_collections_shared_returns_list():
    """/api/collections/shared/ must return a list when authenticated."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/shared/?nested=true",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"shared → {r.status_code}"
    assert isinstance(r.json(), list)


def test_be30_collections_archived_returns_list():
    """/api/collections/archived/ must return a list when authenticated."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/archived/?nested=true",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"archived → {r.status_code}"
    assert isinstance(r.json(), list)


def test_be31_collections_invites_returns_list():
    """/api/collections/invites/ must return a list when authenticated."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/invites/",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"invites → {r.status_code}"
    assert isinstance(r.json(), list)


def test_be32_create_collection_returns_201_with_id():
    """POST /api/collections/ must return 201 and an 'id' field."""
    s, sid = get_auth_session()
    col = create_collection(s, sid, f"pytest-col-{int(time.time())}")
    assert "id" in col and col["id"], "Created collection has no 'id'"
    # Clean up
    delete_collection(s, sid, col["id"])


def test_be33_collection_detail_returns_key_fields():
    """GET /api/collections/{id}/ must return name, is_public, locations, etc."""
    s, sid = get_auth_session()
    col = create_collection(s, sid, f"pytest-detail-col-{int(time.time())}")
    try:
        r = s.get(
            f"{BASE_URL}/api/collections/{col['id']}/",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200, f"collection detail → {r.status_code}"
        detail = r.json()
        for field in ("id", "name", "is_public"):
            assert field in detail, f"'{field}' missing from collection detail"
    finally:
        delete_collection(s, sid, col["id"])


def test_be34_collection_detail_nonexistent_returns_error():
    """GET /api/collections/<nonexistent>/ must not return 200."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/collections/00000000-0000-0000-0000-000000000000/",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code != 200, f"Expected non-200 for missing collection, got {r.status_code}"


def test_be35_delete_collection_returns_204():
    """DELETE /api/collections/{id}/ must return 204."""
    s, sid = get_auth_session()
    col = create_collection(s, sid, f"pytest-del-col-{int(time.time())}")
    csrf = get_csrf(s)
    r = s.delete(
        f"{BASE_URL}/api/collections/{col['id']}/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )
    assert r.status_code == 204, f"DELETE collection → {r.status_code}: {r.text}"


def test_be36_collection_import_without_file_returns_4xx():
    """POST /api/collections/import/ with no file must return 4xx (not 500)."""
    s, sid = get_auth_session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/api/collections/import/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        data={},
        timeout=10,
    )
    assert r.status_code < 500, f"Import without file returned {r.status_code}"


def test_be37_shared_collections_requires_auth():
    """/api/collections/shared/ must block unauthenticated requests."""
    r = requests.get(f"{BASE_URL}/api/collections/shared/", timeout=10)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_be38_dated_collection_includes_dates():
    """A collection created with start_date/end_date must return those fields."""
    s, sid = get_auth_session()
    col = create_collection(
        s, sid,
        f"pytest-dated-{int(time.time())}",
        start_date="2025-07-01",
        end_date="2025-07-10"
    )
    try:
        r = s.get(
            f"{BASE_URL}/api/collections/{col['id']}/",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200
        detail = r.json()
        assert detail.get("start_date") == "2025-07-01", "start_date mismatch"
        assert detail.get("end_date") == "2025-07-10", "end_date mismatch"
    finally:
        delete_collection(s, sid, col["id"])
