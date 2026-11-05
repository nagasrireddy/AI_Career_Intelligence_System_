from datetime import date

from app.ai.roadmap import build_roadmap_items
from app.ai.scoring import compute_gap, priority_for
from tests.conftest import role_id, upload


def test_score_formula_exact():
    role = [{"skill": "Python", "weight": 5}, {"skill": "SQL", "weight": 3}, {"skill": "Docker", "weight": 2}]
    g = compute_gap(["python3", "sql"], role)  # aliases normalised
    assert g["weighted_score"] == 80.0 and g["coverage_pct"] == 66.7  # (5+3)/10, 2/3
    assert g["missing_count"] == 1 and g["priority_gaps"][0]["skill"] == "Docker"


def test_partial_match_and_priority_labels():
    g = compute_gap(["MySQL"], [{"skill": "PostgreSQL", "weight": 4}, {"skill": "Kubernetes", "weight": 5}])
    st = {r["skill"]: r["status"] for r in g["results"]}
    assert st == {"PostgreSQL": "partial", "Kubernetes": "missing"}
    assert g["weighted_score"] == round(0.5 * 4 / 9 * 100, 1)
    assert [priority_for(w) for w in (5, 4, 3, 1)] == ["critical", "high", "medium", "low"]
    assert g["priority_gaps"][0]["skill"] == "Kubernetes"


def test_roadmap_prerequisite_order_and_no_owned_skills():
    gaps = compute_gap(["Python"], [{"skill": "PyTorch", "weight": 5}, {"skill": "Statistics", "weight": 2}])["priority_gaps"]
    items = build_roadmap_items(gaps, ["Python"], {}, 60, date(2026, 1, 1), "ML Engineer")
    order = [i["skill"] for i in items]
    assert "Python" not in order
    assert order.index("Machine Learning") < order.index("Deep Learning") < order.index("PyTorch")
    assert [i["sequence"] for i in items] == list(range(1, len(items) + 1))
    assert all(i["target_date"] <= date(2026, 3, 2) for i in items)  # fits in the 60-day window


def test_gap_api_and_history(client, auth):
    assert client.post("/api/v1/skill-gap/analyze", headers=auth, json={"role_id": role_id(client, auth, "Data Analyst")}).status_code == 422  # no resume
    upload(client, auth)
    rid = role_id(client, auth, "Data Analyst")
    r = client.post("/api/v1/skill-gap/analyze", headers=auth, json={"role_id": rid})
    assert r.status_code == 201, r.text
    d = r.json()
    assert 0 < d["weighted_score"] < 100 and d["matched_count"] + d["partial_count"] + d["missing_count"] == d["total_required"]
    assert "not a hiring probability" in d["formula"]
    assert client.get(f"/api/v1/skill-gap/{d['id']}", headers=auth).json()["weighted_score"] == d["weighted_score"]
    assert client.get("/api/v1/skill-gap/history", headers=auth).json()["total"] == 1


def test_roles_catalogue_search_compare(client, auth):
    allr = client.get("/api/v1/roles", headers=auth, params={"page_size": 50}).json()
    assert allr["total"] == 12 and "Data" in allr["categories"]
    assert client.get("/api/v1/roles", headers=auth, params={"q": "cloud"}).json()["total"] >= 1
    assert client.get("/api/v1/roles", headers=auth, params={"skill": "Terraform"}).json()["total"] >= 2
    a, b = role_id(client, auth, "Java Developer"), role_id(client, auth, "Backend Developer")
    cmp = client.get("/api/v1/roles/compare", headers=auth, params={"ids": f"{a},{b}"}).json()
    assert "REST APIs" in cmp["shared_skills"] and len(cmp["roles"]) == 2
    assert client.get("/api/v1/roles/compare", headers=auth, params={"ids": str(a)}).status_code == 422
    detail = client.get(f"/api/v1/roles/{a}", headers=auth).json()
    assert "illustrative" in detail["disclaimer"] and detail["skills"] and detail["resources"]


def test_seed_is_idempotent(client):
    from app.db.seed import seed
    from app.models.models import JobRole, LearningResource
    with client.Session() as s:
        n1, r1 = s.query(JobRole).count(), s.query(LearningResource).count()
        out = seed(s)
        assert out == {"roles": 0, "role_skills": 0, "resources": 0}
        assert s.query(JobRole).count() == n1 and s.query(LearningResource).count() == r1


def test_roadmap_generation_and_regeneration_preserves_progress(client, auth):
    upload(client, auth)
    rid = role_id(client, auth, "Machine Learning Engineer")
    r = client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 90})
    assert r.status_code == 201, r.text
    road = r.json()
    skills = [i["skill"] for i in road["items"]]
    assert road["duration_days"] == 90 and len(skills) == len(set(skills)) and "Python" not in skills  # user has Python
    assert all(i["resource_url"] is None or i["resource_url"].startswith("https://") for i in road["items"])
    first = road["items"][0]
    client.patch(f"/api/v1/progress/items/{first['id']}", headers=auth, json={"status": "completed"})
    mid = road["items"][1]
    client.patch(f"/api/v1/progress/items/{mid['id']}", headers=auth, json={"progress_pct": 40, "notes": "halfway"})
    new = client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 30, "replace_roadmap_id": road["id"]}).json()
    by = {i["skill"]: i for i in new["items"]}
    assert by[first["skill"]]["status"] == "completed" and by[first["skill"]]["progress_pct"] == 100
    if mid["skill"] in by:
        assert by[mid["skill"]]["progress_pct"] == 40 and by[mid["skill"]]["notes"] == "halfway"
    old = client.get(f"/api/v1/roadmaps/{road['id']}", headers=auth).json()
    assert old["status"] == "archived" and new["status"] == "active"
    assert client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 45}).status_code == 422


def test_roadmap_patch_delete(client, auth):
    rid = role_id(client, auth, "DevOps Engineer")
    road = client.post("/api/v1/roadmaps/generate", headers=auth, json={"role_id": rid, "duration_days": 60}).json()
    assert road["item_count"] > 5
    assert client.patch(f"/api/v1/roadmaps/{road['id']}", headers=auth, json={"title": "My plan"}).json()["title"] == "My plan"
    assert client.delete(f"/api/v1/roadmaps/{road['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/v1/roadmaps/{road['id']}", headers=auth).status_code == 404
