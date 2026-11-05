from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.normalizer import normalize_skill
from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import SkillGapAnalysis, User
from app.schemas.schemas import GapDetail, GapRequest
from app.services.analysis import gap_detail, gap_summary, run_gap_analysis
from app.services.helpers import effective_skills, get_role, latest_resume, owned_analysis, owned_resume

router = APIRouter(prefix="/skill-gap", tags=["Skill-Gap Analysis"])


@router.post("/analyze", response_model=GapDetail, status_code=201)
def analyze(body: GapRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    role = get_role(db, body.role_id)
    resume = owned_resume(db, user, body.resume_id) if body.resume_id else latest_resume(db, user)
    extra = [normalize_skill(s) for s in body.extra_skills if s.strip()]
    skills = effective_skills(resume) + extra
    if not skills:
        raise HTTPException(422, "Upload a resume first (or provide skills manually) before running a skill-gap analysis.")
    a, _ = run_gap_analysis(db, user, role, resume, skills)
    return gap_detail(a)


@router.get("/history", response_model=dict)
def history(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50), role_id: int | None = None,
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(SkillGapAnalysis).where(SkillGapAnalysis.user_id == user.id)
    if role_id:
        q = q.where(SkillGapAnalysis.role_id == role_id)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(SkillGapAnalysis.created_at.desc(), SkillGapAnalysis.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [gap_summary(a) for a in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/{analysis_id}", response_model=GapDetail)
def get_analysis(analysis_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return gap_detail(owned_analysis(db, user, analysis_id))
