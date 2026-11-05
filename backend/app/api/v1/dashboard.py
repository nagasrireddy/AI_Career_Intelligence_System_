from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import JobRole, Resume, RoadmapItem, SkillGapAnalysis, User
from app.services.analysis import gap_summary
from app.services.helpers import latest_resume
from app.services.progress import active_roadmap, progress_series

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _item(i: RoadmapItem) -> dict:
    return {"id": i.id, "skill": i.skill, "priority": i.priority, "status": i.status, "progress_pct": i.progress_pct,
            "target_date": i.target_date, "completed_at": i.completed_at, "milestone": i.milestone, "category": i.category}


@router.get("/summary", response_model=dict)
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    prof = user.profile
    target = db.get(JobRole, prof.target_role_id) if prof and prof.target_role_id else None
    resume = latest_resume(db, user)
    analysis = None
    if target:
        analysis = db.scalar(select(SkillGapAnalysis).where(SkillGapAnalysis.user_id == user.id, SkillGapAnalysis.role_id == target.id)
                             .order_by(SkillGapAnalysis.created_at.desc(), SkillGapAnalysis.id.desc()))
    if analysis is None:
        analysis = db.scalar(select(SkillGapAnalysis).where(SkillGapAnalysis.user_id == user.id)
                             .order_by(SkillGapAnalysis.created_at.desc(), SkillGapAnalysis.id.desc()))
    road = active_roadmap(db, user)
    items = road.items if road else []
    upcoming = sorted([i for i in items if i.status != "completed"], key=lambda i: (i.target_date or date.max, i.sequence))[:5]
    recent = sorted([i for i in items if i.status == "completed"], key=lambda i: (i.completed_at or date.min, i.id), reverse=True)[:5]
    n = len(items)
    cats: dict = {}
    for s in (resume.skills if resume else []):
        if not s.removed:
            cats[s.category] = cats.get(s.category, 0) + 1
    return {
        "user": {"id": user.id, "full_name": user.full_name, "email": user.email, "headline": prof.headline if prof else None},
        "target_role": {"id": target.id, "title": target.title} if target else None,
        "latest_resume": {"id": resume.id, "filename": resume.original_filename, "analyzed_at": resume.analyzed_at} if resume else None,
        "skills_total": sum(1 for s in resume.skills if not s.removed) if resume else 0,
        "skills_by_category": [{"category": k, "count": v} for k, v in sorted(cats.items(), key=lambda kv: -kv[1])],
        "analysis": ({**gap_summary(analysis), "matched": sum(r.status == "matched" for r in analysis.results),
                      "missing": sum(r.status == "missing" for r in analysis.results),
                      "partial": sum(r.status == "partial" for r in analysis.results)} if analysis else None),
        "roadmap": ({"id": road.id, "title": road.title, "role_title": road.role.title, "total": n,
                     "completed": sum(i.status == "completed" for i in items),
                     "completion_pct": round(sum(i.progress_pct for i in items) / n, 1) if n else 0.0} if road else None),
        "upcoming": [_item(i) for i in upcoming], "recently_completed": [_item(i) for i in recent],
        "series": progress_series(db, user),
        "counts": {"resumes": db.scalar(select(func.count()).select_from(Resume).where(Resume.user_id == user.id)),
                   "analyses": db.scalar(select(func.count()).select_from(SkillGapAnalysis).where(SkillGapAnalysis.user_id == user.id))},
    }
