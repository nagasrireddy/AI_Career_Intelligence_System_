from tests.conftest import role_id, upload


def test_users_cannot_access_each_others_records(client, auth, auth2):
    res = upload(client, auth).json()
    rid = role_id(client, auth, "Python Developer")
    gap = client.post("/api/v1/skill-gap/analyze", headers=auth, json={"role_id": rid}).json()
    road = client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 30}).json()
    item = road["items"][0]["id"]
    checks = [
        ("get", f"/api/v1/resumes/{res['id']}", None), ("delete", f"/api/v1/resumes/{res['id']}", None),
        ("post", f"/api/v1/resumes/{res['id']}/analyze", None), ("patch", f"/api/v1/resumes/{res['id']}/skills", {"add": ["X"]}),
        ("get", f"/api/v1/skill-gap/{gap['id']}", None), ("get", f"/api/v1/roadmaps/{road['id']}", None),
        ("patch", f"/api/v1/roadmaps/{road['id']}", {"title": "hacked"}), ("delete", f"/api/v1/roadmaps/{road['id']}", None),
        ("patch", f"/api/v1/progress/items/{item}", {"status": "completed"}),
    ]
    for method, url, body in checks:
        r = getattr(client, method)(url, headers=auth2, **({"json": body} if body else {}))
        assert r.status_code == 404, (method, url, r.status_code)
    assert client.post("/api/v1/skill-gap/analyze", headers=auth2, json={"role_id": rid, "resume_id": res["id"]}).status_code == 404
    assert client.post("/api/v1/roadmaps/generate", headers=auth2, json={"role_id": rid, "analysis_id": gap["id"]}).status_code == 404
    assert client.get("/api/v1/resumes", headers=auth2).json()["total"] == 0
    assert client.get("/api/v1/roadmaps", headers=auth2).json()["total"] == 0
    assert client.get("/api/v1/dashboard/summary", headers=auth2).json()["roadmap"] is None
    # owner still has everything intact
    assert client.get(f"/api/v1/roadmaps/{road['id']}", headers=auth).json()["title"].endswith("Python Developer")


def test_delete_account_removes_all_data(client, auth, tmp_path):
    upload(client, auth)
    rid = role_id(client, auth, "Python Developer")
    client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 30})
    assert client.delete("/api/v1/users/me", headers=auth).status_code == 204
    from app.models.models import Resume, Roadmap, RoadmapItem, User
    with client.Session() as s:
        assert s.query(User).count() == 0 and s.query(Resume).count() == 0
        assert s.query(Roadmap).count() == 0 and s.query(RoadmapItem).count() == 0
    assert client.get("/api/v1/auth/me", headers=auth).status_code == 401
    assert not any((tmp_path / "uploads").rglob("*.docx"))


def test_rate_limit_on_auth(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_AUTH_PER_MIN", "3")
    from app.core.config import get_settings
    get_settings.cache_clear()
    codes = [client.post("/api/v1/auth/login", json={"email": "a@b.co", "password": "x"}).status_code for _ in range(5)]
    assert codes[:3] == [401, 401, 401] and codes[3:] == [429, 429]
