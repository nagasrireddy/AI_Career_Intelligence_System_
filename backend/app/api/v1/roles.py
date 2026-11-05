from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai.scoring import compute_gap
from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import JobRole, LearningResource, Resume, User
from app.schemas.schemas import RoleDetail, RoleSkillOut
from app.services.helpers import effective_skills, get_role, latest_resume

router = APIRouter(prefix="/roles", tags=["Job Roles"])


def _summary(r: JobRole) -> dict:
    return {"id": r.id, "slug": r.slug, "title": r.title, "description": r.description, "category": r.category,
            "skill_count": len(r.skills), "top_skills": [s.skill for s in r.skills[:5]]}


@router.get("", response_model=dict)
def list_roles(q: str | None = None, category: str | None = None, skill: str | None = None,
               page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50),
               user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt = select(JobRole)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(JobRole.title.ilike(like), JobRole.description.ilike(like)))
    if category:
        stmt = stmt.where(JobRole.category == category)
    if skill:
        from app.models.models import RoleSkill
        stmt = stmt.where(JobRole.id.in_(select(RoleSkill.role_id).where(RoleSkill.skill.ilike(f"%{skill.strip()}%"))))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(JobRole.title).offset((page - 1) * page_size).limit(page_size)).all()
    cats = [c for (c,) in db.execute(select(JobRole.category).distinct().order_by(JobRole.category))]
    return {"items": [_summary(r) for r in rows], "total": total, "page": page, "page_size": page_size, "categories": cats}


@router.get("/compare", response_model=dict)
def compare_roles(ids: str = Query(..., description="Comma separated role ids, 2-4"),
                  user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        role_ids = list(dict.fromkeys(int(i) for i in ids.split(",") if i.strip()))
    except ValueError:
        raise HTTPException(422, "ids must be integers.")
    if not 2 <= len(role_ids) <= 4:
        raise HTTPException(422, "Select between 2 and 4 roles to compare.")
    resume = latest_resume(db, user)
    have = effective_skills(resume)
    roles = [get_role(db, i) for i in role_ids]
    out, sets = [], []
    for r in roles:
        rs = [{"skill": s.skill, "weight": s.weight, "level": s.level} for s in r.skills]
        sets.append({s["skill"] for s in rs})
        entry = {"id": r.id, "title": r.title, "skills": rs}
        if resume:
            g = compute_gap(have, rs)
            entry.update(weighted_score=g["weighted_score"], matched_count=g["matched_count"], total_required=g["total_required"])
        out.append(entry)
    shared = sorted(set.intersection(*sets))
    return {"roles": out, "shared_skills": shared, "has_resume": bool(resume),
            "note": "Scores use your latest resume's active skills against illustrative role profiles."}


@router.get("/{role_id}", response_model=RoleDetail)
def get_role_detail(role_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = get_role(db, role_id)
    skills = [s.skill for s in r.skills]
    resources = db.scalars(select(LearningResource).where(LearningResource.skill.in_(skills)).order_by(LearningResource.skill)).all()
    return {**_summary(r), "skills": r.skills, "resources": resources}


@router.get("/{role_id}/skills", response_model=list[RoleSkillOut])
def role_skills(role_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return get_role(db, role_id).skills
