from tests.conftest import role_id, upload


def _road(client, auth):
    upload(client, auth)
    rid = role_id(client, auth, "Data Scientist")
    client.patch("/api/v1/users/me", headers=auth, json={"target_role_id": rid})
    client.post("/api/v1/skill-gap/analyze", headers=auth, json={"role_id": rid})
    return client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 60}).json()


def test_progress_status_pct_consistency(client, auth):
    road = _road(client, auth)
    iid = road["items"][0]["id"]
    p = lambda body: client.patch(f"/api/v1/progress/items/{iid}", headers=auth, json=body)
    assert p({"progress_pct": 101}).status_code == 422 and p({"progress_pct": -1}).status_code == 422
    assert p({"status": "completed", "progress_pct": 50}).status_code == 422
    assert p({"status": "in_progress", "progress_pct": 100}).status_code == 422
    r = p({"progress_pct": 30}).json()
    assert r["status"] == "in_progress" and r["started_at"]
    r = p({"status": "completed"}).json()
    assert r["progress_pct"] == 100 and r["completed_at"]
    r = p({"progress_pct": 0}).json()
    assert r["status"] == "not_started" and r["completed_at"] is None
    r = p({"notes": "read chapter 1", "target_date": "2030-01-01"}).json()
    assert r["notes"] == "read chapter 1" and r["target_date"] == "2030-01-01"
    assert client.get("/api/v1/progress/history", headers=auth).json()["total"] >= 3


def test_dashboard_values_come_from_database(client, auth):
    empty = client.get("/api/v1/dashboard/summary", headers=auth).json()
    assert empty["skills_total"] == 0 and empty["roadmap"] is None and empty["analysis"] is None and empty["target_role"] is None
    road = _road(client, auth)
    d = client.get("/api/v1/dashboard/summary", headers=auth).json()
    assert d["target_role"]["title"] == "Data Scientist" and d["skills_total"] >= 8
    assert d["analysis"]["matched"] + d["analysis"]["missing"] + d["analysis"]["partial"] > 0
    assert d["roadmap"]["total"] == len(road["items"]) and d["roadmap"]["completion_pct"] == 0
    assert len(d["upcoming"]) == 5 and d["recently_completed"] == []
    for it in road["items"][:2]:
        client.patch(f"/api/v1/progress/items/{it['id']}", headers=auth, json={"status": "completed"})
    d = client.get("/api/v1/dashboard/summary", headers=auth).json()
    expect = round(200 / len(road["items"]), 1)
    assert d["roadmap"]["completed"] == 2 and d["roadmap"]["completion_pct"] == expect
    assert len(d["recently_completed"]) == 2 and d["series"]["weekly"][-1]["completed"] == 2
    s = client.get("/api/v1/progress/summary", headers=auth).json()
    assert s["completed"] == 2 and s["total_items"] == len(road["items"]) and len(s["completed_skills"]) == 2
    assert len(s["monthly"]) == 6 and len(s["weekly"]) == 8 and s["monthly"][-1]["completed"] == 2


def test_progress_items_listing_filters(client, auth):
    road = _road(client, auth)
    client.patch(f"/api/v1/progress/items/{road['items'][0]['id']}", headers=auth, json={"status": "completed"})
    assert client.get("/api/v1/progress/items", headers=auth, params={"status": "completed"}).json()["total"] == 1
    page = client.get("/api/v1/progress/items", headers=auth, params={"page_size": 3}).json()
    assert len(page["items"]) == 3 and page["total"] == len(road["items"])
