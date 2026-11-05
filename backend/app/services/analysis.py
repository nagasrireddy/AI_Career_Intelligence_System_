from sqlalchemy.orm import Session

from app.ai.scoring import compute_gap
from app.models.models import JobRole, Resume, SkillGapAnalysis, SkillGapResult, User


def run_gap_analysis(db: Session, user: User, role: JobRole, resume: Resume | None, skills: list[str]) -> tuple[SkillGapAnalysis, dict]:
    rs = [{"skill": s.skill, "weight": s.weight, "level": s.level} for s in role.skills]
    g = compute_gap(skills, rs)
    a = SkillGapAnalysis(user_id=user.id, resume_id=resume.id if resume else None, role_id=role.id,
                         coverage_pct=g["coverage_pct"], weighted_score=g["weighted_score"], user_skills_snapshot=sorted(set(skills)))
    for r in g["results"]:
        a.results.append(SkillGapResult(skill=r["skill"], status=r["status"], weight=r["weight"], priority=r["priority"],
                                        category=r["category"], note=r["note"]))
    db.add(a)
    db.commit()
    db.refresh(a)
    return a, g


def gap_detail(a: SkillGapAnalysis) -> dict:
    from app.ai.scoring import PRIORITY_ORDER, compute_gap as _cg  # recompute derived views from stored rows (no re-scoring)
    results = [{"skill": r.skill, "status": r.status, "weight": r.weight, "priority": r.priority, "category": r.category, "note": r.note}
               for r in a.results]
    gaps = sorted([r for r in results if r["status"] != "matched"],
                  key=lambda x: (PRIORITY_ORDER[x["priority"]], -x["weight"], x["status"] != "partial", x["skill"]))
    strengths = sorted([r for r in results if r["status"] == "matched"], key=lambda x: -x["weight"])[:5]
    cat: dict = {}
    for r in results:
        c = cat.setdefault(r["category"], {"category": r["category"], "total": 0, "matched": 0})
        c["total"] += 1
        c["matched"] += r["status"] == "matched"
    return {
        "id": a.id, "role_id": a.role_id, "role_title": a.role.title, "resume_id": a.resume_id,
        "weighted_score": a.weighted_score, "coverage_pct": a.coverage_pct, "created_at": a.created_at,
        "results": sorted(results, key=lambda x: (-x["weight"], x["skill"])),
        "matched_count": sum(r["status"] == "matched" for r in results),
        "partial_count": sum(r["status"] == "partial" for r in results),
        "missing_count": sum(r["status"] == "missing" for r in results),
        "total_required": len(results), "strengths": strengths, "priority_gaps": gaps,
        "improvement_areas": [g["skill"] for g in gaps[:5]],
        "by_category": [{**c, "pct": round(c["matched"] / c["total"] * 100)} for c in cat.values()],
        "user_skills": a.user_skills_snapshot or [],
        "formula": ("Weighted score = (Σ weight of matched skills + 0.5 × Σ weight of partially matched skills) ÷ Σ weight of all "
                    "required skills × 100. Coverage = matched ÷ required skills. Scores compare you with an illustrative role "
                    "profile; they are not a hiring probability or a guarantee of job readiness."),
    }


def gap_summary(a: SkillGapAnalysis) -> dict:
    return {"id": a.id, "role_id": a.role_id, "role_title": a.role.title, "resume_id": a.resume_id,
            "weighted_score": a.weighted_score, "coverage_pct": a.coverage_pct, "created_at": a.created_at}
