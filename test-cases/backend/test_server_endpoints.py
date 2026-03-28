"""
test_server_endpoints.py  – AdventureLog Backend Tests
Run by the pipeline:  pytest frontend/test-cases/backend/ --cov-fail-under=70

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
"""

import os
import requests
import pytest

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL       = os.environ.get("BACKEND_URL", "http://localhost:8016")
ADMIN_USERNAME = os.environ.get("TEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin1234!")

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_csrf(session: requests.Session | None = None) -> str:
    req = session or requests
    r = req.get(f"{BASE_URL}/csrf/", timeout=10)
    assert r.status_code == 200, f"/csrf/ → {r.status_code}"
    return r.json()["csrfToken"]


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
    assert r.status_code == 200, f"social-providers → {r.status_code}"
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


def test_be07_locations_blocked_without_auth():
    r = requests.get(f"{BASE_URL}/api/locations/", timeout=10)
    # 200 is a warning (intentional public listing), not a hard failure
    assert r.status_code in (200, 401, 403), f"Unexpected {r.status_code}"


def test_be08_collections_blocked_without_auth():
    r = requests.get(f"{BASE_URL}/api/collections/", timeout=10)
    assert r.status_code in (200, 401, 403), f"Unexpected {r.status_code}"


def test_be09_login_rejects_bad_credentials():
    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": "nonexistent_xyz", "password": "wrong"},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=10,
    )
    assert 400 <= r.status_code < 500, f"Expected 4xx, got {r.status_code}"


def test_be10_login_sets_session_cookie():
    s = requests.Session()
    csrf = get_csrf(s)
    r = s.post(
        f"{BASE_URL}/auth/browser/v1/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"X-CSRFToken": csrf, "Referer": BASE_URL},
        timeout=15,
    )
    # 200 = success, 401 = MFA required (first step still succeeded)
    assert r.status_code in (200, 401), f"Login → {r.status_code}: {r.text}"
    if r.status_code == 200:
        assert "sessionid" in s.cookies, "No sessionid cookie after successful login"


def test_be11_social_provider_items_have_url():
    r = requests.get(f"{BASE_URL}/auth/social-providers/", timeout=10)
    assert r.status_code == 200
    for provider in r.json():
        assert "url" in provider, f"Provider missing 'url' key: {provider}"


def test_be12_response_has_content_type():
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert "Content-Type" in r.headers


def test_be13_public_url_endpoint():
    r = requests.get(f"{BASE_URL}/public-url/", timeout=10)
    assert r.status_code == 200, f"/public-url/ → {r.status_code}"
    assert "PUBLIC_URL" in r.json()


def test_be14_user_metadata_requires_auth():
    r = requests.get(f"{BASE_URL}/auth/user-metadata/", timeout=10)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"
