from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import Roadmap, User
from app.schemas.schemas import RoadmapDetail, RoadmapGenerate, RoadmapPatch
from app.services.helpers import get_role, latest_resume, owned_analysis, owned_resume, owned_roadmap
from app.services.roadmaps import generate_roadmap, roadmap_detail, roadmap_summary

router = APIRouter(prefix="/roadmaps", tags=["Learning Roadmaps"])


@router.post("/generate", response_model=RoadmapDetail, status_code=201)
def generate(body: RoadmapGenerate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    role = get_role(db, body.role_id)
    resume = owned_resume(db, user, body.resume_id) if body.resume_id else latest_resume(db, user)
    analysis = owned_analysis(db, user, body.analysis_id) if body.analysis_id else None
    old = owned_roadmap(db, user, body.replace_roadmap_id) if body.replace_roadmap_id else None
    if old is None:  # archive any previous active roadmap for the same role so only one is active
        for r in db.scalars(select(Roadmap).where(Roadmap.user_id == user.id, Roadmap.status == "active", Roadmap.role_id == role.id)):
            old = old or r
    road = generate_roadmap(db, user, role, body.duration_days, resume, analysis, old)
    return roadmap_detail(road)


@router.get("", response_model=dict)
def list_roadmaps(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50), status: str | None = None,
                  user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Roadmap).where(Roadmap.user_id == user.id)
    if status in ("active", "archived"):
        q = q.where(Roadmap.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(Roadmap.created_at.desc(), Roadmap.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [roadmap_summary(r) for r in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/{roadmap_id}", response_model=RoadmapDetail)
def get_roadmap(roadmap_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return roadmap_detail(owned_roadmap(db, user, roadmap_id))


@router.patch("/{roadmap_id}", response_model=RoadmapDetail)
def patch_roadmap(roadmap_id: int, body: RoadmapPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = owned_roadmap(db, user, roadmap_id)
    if body.title:
        r.title = body.title.strip()
    if body.status:
        if body.status == "active":
            for other in db.scalars(select(Roadmap).where(Roadmap.user_id == user.id, Roadmap.status == "active", Roadmap.id != r.id)):
                other.status = "archived"
        r.status = body.status
    db.commit()
    return roadmap_detail(r)


@router.delete("/{roadmap_id}", status_code=204)
def delete_roadmap(roadmap_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = owned_roadmap(db, user, roadmap_id)
    db.delete(r)
    db.commit()
    return Response(status_code=204)
