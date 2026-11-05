from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import User
from tests.conftest import register


def test_password_hashing_is_not_plaintext_and_verifies():
    h = hash_password("Secret123")
    assert h != "Secret123" and h.startswith("$2")
    assert verify_password("Secret123", h) and not verify_password("wrong", h)


def test_register_login_me_and_no_hash_leak(client):
    h = register(client)
    me = client.get("/api/v1/auth/me", headers=h)
    assert me.status_code == 200 and me.json()["email"] == "jane@example.com"
    assert "password" not in me.text and "hash" not in me.text
    with client.Session() as s:
        u = s.query(User).one()
        assert u.password_hash != "Passw0rd!x"


def test_duplicate_email_rejected(client):
    register(client)
    r = client.post("/api/v1/auth/register", json={"email": "JANE@example.com", "password": "Passw0rd!x", "full_name": "X"})
    assert r.status_code == 409


def test_weak_password_and_invalid_email_rejected(client):
    assert client.post("/api/v1/auth/register", json={"email": "a@b.co", "password": "short1", "full_name": "A"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"email": "a@b.co", "password": "onlyletters", "full_name": "A"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"email": "nope", "password": "Passw0rd!x", "full_name": "A"}).status_code == 422


def test_login_failures(client):
    register(client)
    assert client.post("/api/v1/auth/login", json={"email": "jane@example.com", "password": "bad"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "Passw0rd!x"}).status_code == 401


def test_protected_endpoints_require_token(client):
    for path in ["/api/v1/auth/me", "/api/v1/users/me", "/api/v1/resumes", "/api/v1/roles", "/api/v1/roadmaps",
                 "/api/v1/progress/summary", "/api/v1/dashboard/summary", "/api/v1/skill-gap/history"]:
        assert client.get(path).status_code == 401, path
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_expired_token_rejected(client, monkeypatch):
    register(client)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "-1")
    from app.core.config import get_settings
    get_settings.cache_clear()
    tok = create_access_token(1)
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401 and "expired" in r.json()["detail"].lower()


def test_profile_update_and_target_role(client, auth):
    rid = client.get("/api/v1/roles", headers=auth).json()["items"][0]["id"]
    r = client.patch("/api/v1/users/me", headers=auth, json={"headline": "Student", "target_role_id": rid, "weekly_hours": 10, "full_name": "Jane D"})
    assert r.status_code == 200 and r.json()["profile"]["target_role_id"] == rid and r.json()["full_name"] == "Jane D"
    assert client.patch("/api/v1/users/me", headers=auth, json={"target_role_id": 99999}).status_code == 404
    assert client.patch("/api/v1/users/me", headers=auth, json={"weekly_hours": 0}).status_code == 422


def test_health_and_security_headers(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.headers["x-content-type-options"] == "nosniff"
