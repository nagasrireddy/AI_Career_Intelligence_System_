"""Transparent skill-gap scoring.

weighted_score  = (sum(weight of matched skills) + 0.5 * sum(weight of partial skills)) / sum(weight of all required skills) * 100
coverage_pct    = matched required skills / total required skills * 100   (unweighted)

A skill is 'partial' when it is not present but at least one of its prerequisite skills (or a closely related skill
in RELATED) is present. Priority labels come from the role weight (1-5):  >=4.5 critical, >=3.5 high, >=2.5 medium, else low.
The score is an educational estimate of keyword overlap with an *illustrative* role profile. It is NOT a hiring probability.
"""
from app.ai.normalizer import category_of, normalize_skill
from app.ai.taxonomy import PREREQUISITES

RELATED = {
    "MySQL": ["PostgreSQL", "SQLite", "Oracle", "SQL"], "PostgreSQL": ["MySQL", "SQLite", "Oracle", "SQL"], "SQLite": ["MySQL", "PostgreSQL", "SQL"],
    "Oracle": ["MySQL", "PostgreSQL"], "AWS": ["Azure", "GCP"], "Azure": ["AWS", "GCP"], "GCP": ["AWS", "Azure"],
    "TensorFlow": ["PyTorch"], "PyTorch": ["TensorFlow"], "Flask": ["FastAPI", "Django"], "FastAPI": ["Flask", "Django"], "Django": ["Flask", "FastAPI"],
    "React": ["Angular", "Vue"], "Angular": ["React", "Vue"], "Vue": ["React", "Angular"], "Power BI": ["Tableau"], "Tableau": ["Power BI"],
    "Jenkins": ["GitHub Actions", "CI/CD"], "GitHub Actions": ["Jenkins", "CI/CD"], "Express": ["Node.js"], "Cloud Computing": ["AWS", "Azure", "GCP"],
    "Terraform": ["Ansible"], "Ansible": ["Terraform"], "Machine Learning": ["Scikit-learn", "Deep Learning"], "Data Visualization": ["Power BI", "Tableau"],
    "Testing": ["API Testing"], "GitHub": ["Git"], "Git": ["GitHub"], "Statistics": ["Mathematics"], "Hibernate": ["SQLAlchemy"],
}
PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def priority_for(weight: float) -> str:
    return "critical" if weight >= 4.5 else "high" if weight >= 3.5 else "medium" if weight >= 2.5 else "low"


def compute_gap(user_skills: list[str], role_skills: list[dict]) -> dict:
    """role_skills: [{'skill','weight','level'}]. Returns scores + per-skill results."""
    have = {normalize_skill(s) for s in user_skills if s}
    total_w = sum(r["weight"] for r in role_skills) or 1.0
    results, matched_w, partial_w = [], 0.0, 0.0
    for r in role_skills:
        skill = normalize_skill(r["skill"])
        w = float(r["weight"])
        if skill in have:
            status, note = "matched", "Found in your skills."
            matched_w += w
        else:
            helpers = [p for p in PREREQUISITES.get(skill, []) + RELATED.get(skill, []) if p in have]
            if helpers:
                status, note = "partial", f"Related skills you have: {', '.join(helpers[:3])}."
                partial_w += w
            else:
                status, note = "missing", "Not found in your skills."
        results.append({"skill": skill, "status": status, "weight": w, "priority": priority_for(w),
                        "category": category_of(skill), "level": r.get("level", "intermediate"), "note": note})
    n_matched = sum(1 for x in results if x["status"] == "matched")
    weighted = round((matched_w + 0.5 * partial_w) / total_w * 100, 1)
    coverage = round(n_matched / max(len(results), 1) * 100, 1)
    gaps = sorted([x for x in results if x["status"] != "matched"],
                  key=lambda x: (PRIORITY_ORDER[x["priority"]], -x["weight"], x["status"] != "partial", x["skill"]))
    strengths = sorted([x for x in results if x["status"] == "matched"], key=lambda x: -x["weight"])
    cat: dict[str, dict] = {}
    for x in results:
        c = cat.setdefault(x["category"], {"category": x["category"], "total": 0, "matched": 0})
        c["total"] += 1
        c["matched"] += x["status"] == "matched"
    return {
        "weighted_score": weighted, "coverage_pct": coverage, "matched_count": n_matched,
        "partial_count": sum(1 for x in results if x["status"] == "partial"),
        "missing_count": sum(1 for x in results if x["status"] == "missing"),
        "total_required": len(results), "results": results,
        "priority_gaps": gaps, "strengths": strengths[:5],
        "improvement_areas": [g["skill"] for g in gaps[:5]],
        "by_category": [{**c, "pct": round(c["matched"] / c["total"] * 100)} for c in cat.values()],
        "formula": ("Weighted score = (Σ weight of matched skills + 0.5 × Σ weight of partially matched skills) ÷ Σ weight of all "
                    "required skills × 100. Coverage = matched ÷ required skills. Scores compare you with an illustrative role "
                    "profile; they are not a hiring probability or a guarantee of job readiness."),
    }
