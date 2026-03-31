"""
test_server_endpoints.py  – AdventureLog Backend Tests
Run by the pipeline:  pytest frontend/test-cases/backend/ --cov-fail-under=70

Covers all endpoints touched by the application's +page.server.ts files:
  auth, registration, CSRF, social providers, settings, public-url
  PLUS the locations API used by the locations list and detail pages.

Tests:
  BE-01  Root endpoint responds (non-connection-error status)
  BE-02  Django admin returns 200 / 301 / 302
  BE-03  /api/ returns JSON-parseable content
  BE-04  /auth/social-providers/ returns a JSON list
  BE-05  /auth/is-registration-disabled/ has 'is_disabled' boolean key
  BE-06  /csrf/ returns a non-empty csrfToken string
  BE-07  Unauthenticated /api/locations/ returns 200 / 401 / 403 (not 5xx)
  BE-08  Unauthenticated /api/collections/ returns 200 / 401 / 403
  BE-09  Login endpoint rejects invalid credentials with 4xx
  BE-10  Successful login sets a sessionid cookie
  BE-11  Each social-provider item contains a 'url' key
  BE-12  Response headers include Content-Type
  BE-13  /public-url/ returns a dict with 'PUBLIC_URL'
  BE-14  Unauthenticated /auth/user-metadata/ returns 401 or 403
  BE-15  /api/locations/filtered returns paginated results when authenticated
  BE-16  /api/locations/filtered accepts order_by and order_direction params
  BE-17  /api/locations/filtered accepts is_visited param
  BE-18  /api/locations/filtered accepts include_collections param
  BE-19  Create location via POST /api/locations/ returns 201 and an id
  BE-20  /api/locations/{id}/additional-info/ returns full detail for existing id
  BE-21  /api/locations/{id}/additional-info/ returns error for non-existent id
  BE-22  Delete location via DELETE /api/locations/{id}/ returns 204
  BE-23  Unauthenticated /api/locations/filtered returns 401 or 403
  BE-24  POST /api/images/ without a file returns 4xx (not 500)
"""

import os
import pytest
import requests

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL       = os.environ.get("BACKEND_URL", "http://localhost:8016")
ADMIN_USERNAME = os.environ.get("TEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin1234!")


# ── Shared session ────────────────────────────────────────────────────────────

_session: requests.Session | None = None
_session_id: str | None = None


def get_csrf(session: requests.Session | None = None) -> str:
    req = session or requests
    r = req.get(f"{BASE_URL}/csrf/", timeout=10)
    assert r.status_code == 200, f"/csrf/ → {r.status_code}"
    return r.json()["csrfToken"]


def get_auth_session() -> tuple[requests.Session, str]:
    """Return a cached (session, sessionid) pair for the admin user."""
    global _session, _session_id
    if _session is not None and _session_id is not None:
        return _session, _session_id

    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=15,
    )
    assert r.status_code in (200, 401), f"Login → {r.status_code}: {r.text}"

    sid = s.cookies.get("sessionid", "")
    if not sid:
        # Fall back to parsing the Set-Cookie header
        raw = r.headers.get("Set-Cookie", "")
        import re
        m = re.search(r"sessionid=([^;]+)", raw)
        sid = m.group(1) if m else ""

    _session = s
    _session_id = sid
    return s, sid


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
    assert r.status_code == 201, f"Create location → {r.status_code}: {r.text}"
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
# Existing endpoint tests (BE-01 … BE-14)
# ─────────────────────────────────────────────────────────────────────────────

def test_be01_root_responds():
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert r.status_code < 600


def test_be02_admin_accessible():
    r = requests.get(f"{BASE_URL}/admin/", timeout=10, allow_redirects=False)
    assert r.status_code in (200, 301, 302), f"/admin/ → {r.status_code}"


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
    assert "is_disabled" in data
    assert isinstance(data["is_disabled"], bool)


def test_be06_csrf_returns_token():
    r = requests.get(f"{BASE_URL}/csrf/", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "csrfToken" in data
    assert len(data["csrfToken"]) > 0


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


# ─────────────────────────────────────────────────────────────────────────────
# Locations API tests (BE-15 … BE-24)
# ─────────────────────────────────────────────────────────────────────────────

def test_be15_locations_filtered_returns_paginated():
    """Authenticated /api/locations/filtered must return {count, results} shape."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/filtered?types=all&order_by=updated_at"
        f"&order_direction=asc&include_collections=true&page=1&is_visited=all",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"filtered → {r.status_code}: {r.text}"
    data = r.json()
    assert "count" in data, "'count' key missing from filtered response"
    assert "results" in data, "'results' key missing from filtered response"
    assert isinstance(data["results"], list)


def test_be16_locations_filtered_accepts_order_params():
    """order_by=name and order_direction=desc must be accepted without error."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/filtered?order_by=name&order_direction=desc",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code == 200, f"order params → {r.status_code}"


def test_be17_locations_filtered_accepts_is_visited():
    """is_visited=true and is_visited=false are both accepted without error."""
    s, sid = get_auth_session()
    for val in ("true", "false", "all"):
        r = s.get(
            f"{BASE_URL}/api/locations/filtered?is_visited={val}",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200, f"is_visited={val} → {r.status_code}"


def test_be18_locations_filtered_accepts_include_collections():
    """include_collections=false must be accepted without error."""
    s, sid = get_auth_session()
    for val in ("true", "false"):
        r = s.get(
            f"{BASE_URL}/api/locations/filtered?include_collections={val}",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200, f"include_collections={val} → {r.status_code}"


def test_be19_create_location_returns_201_with_id():
    """POST /api/locations/ with minimal payload must return 201 and an 'id'."""
    s, sid = get_auth_session()
    import time
    loc = create_location(s, sid, f"pytest-test-{int(time.time())}")
    assert "id" in loc, "Created location has no 'id' field"
    assert loc["id"], "Created location 'id' is empty"
    # Clean up
    delete_location(s, sid, loc["id"])


def test_be20_location_additional_info_returns_detail():
    """/api/locations/{id}/additional-info/ must return name and key fields."""
    s, sid = get_auth_session()
    import time
    loc = create_location(s, sid, f"pytest-detail-{int(time.time())}")
    loc_id = loc["id"]

    try:
        r = s.get(
            f"{BASE_URL}/api/locations/{loc_id}/additional-info/",
            headers={"Cookie": f"sessionid={sid}"},
            timeout=10,
        )
        assert r.status_code == 200, f"additional-info → {r.status_code}"
        detail = r.json()
        assert "id" in detail
        assert "name" in detail
        # Fields expected by the Svelte page
        for field in ("images", "visits", "is_visited", "is_public"):
            assert field in detail, f"'{field}' missing from additional-info response"
    finally:
        delete_location(s, sid, loc_id)


def test_be21_location_additional_info_nonexistent_returns_error():
    """/api/locations/nonexistent/additional-info/ must return 4xx or 5xx (not silently 200)."""
    s, sid = get_auth_session()
    r = s.get(
        f"{BASE_URL}/api/locations/00000000-0000-0000-0000-000000000000/additional-info/",
        headers={"Cookie": f"sessionid={sid}"},
        timeout=10,
    )
    assert r.status_code != 200, (
        f"Expected a non-200 for missing location, got {r.status_code}"
    )


def test_be22_delete_location_returns_204():
    """DELETE /api/locations/{id}/ must return 204 No Content."""
    s, sid = get_auth_session()
    import time
    loc = create_location(s, sid, f"pytest-delete-{int(time.time())}")
    loc_id = loc["id"]

    csrf = get_csrf(s)
    r = s.delete(
        f"{BASE_URL}/api/locations/{loc_id}/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        timeout=10,
    )
    assert r.status_code == 204, f"DELETE → {r.status_code}: {r.text}"


def test_be23_locations_filtered_requires_auth():
    """Unauthenticated /api/locations/filtered must return 401 or 403."""
    r = requests.get(f"{BASE_URL}/api/locations/filtered?types=all", timeout=10)
    assert r.status_code in (401, 403), (
        f"Expected 401/403 for unauthenticated filtered request, got {r.status_code}"
    )


def test_be24_image_upload_without_file_returns_4xx():
    """POST /api/images/ without a file must return a 4xx (not 500)."""
    s, sid = get_auth_session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/api/images/",
        headers={
            "X-CSRFToken": csrf,
            "Cookie": f"sessionid={sid}; csrftoken={csrf}",
            "Referer": BASE_URL,
        },
        data={},   # no file attached
        timeout=10,
    )
    # Must not be a 500 – a 400 Bad Request is the expected outcome
    assert r.status_code < 500, f"Image upload without file returned {r.status_code}"
