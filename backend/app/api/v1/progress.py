from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import ProgressHistory, Roadmap, RoadmapItem, User
from app.schemas.schemas import HistoryOut, ItemOut, ItemPatch
from app.services.helpers import owned_item
from app.services.progress import ProgressError, active_roadmap, apply_item_update, progress_series, record_change

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/summary", response_model=dict)
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    road = active_roadmap(db, user)
    items = road.items if road else []
    n = len(items)
    done = [i for i in items if i.status == "completed"]
    return {
        "roadmap_id": road.id if road else None, "roadmap_title": road.title if road else None, "total_items": n,
        "completed": len(done), "in_progress": sum(i.status == "in_progress" for i in items),
        "not_started": sum(i.status == "not_started" for i in items),
        "completion_pct": round(sum(i.progress_pct for i in items) / n, 1) if n else 0.0,
        "completed_skills": [i.skill for i in done], "remaining_skills": [i.skill for i in items if i.status != "completed"],
        "hours_total": sum(i.est_hours for i in items), "hours_done": sum(i.est_hours for i in done),
        **progress_series(db, user),
    }


@router.get("/items", response_model=dict)
def list_items(roadmap_id: int | None = None, status: str | None = None, page: int = Query(1, ge=1),
               page_size: int = Query(20, ge=1, le=100), user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(RoadmapItem).join(Roadmap).where(Roadmap.user_id == user.id)
    if roadmap_id:
        q = q.where(RoadmapItem.roadmap_id == roadmap_id)
    else:
        q = q.where(Roadmap.status == "active")
    if status in ("not_started", "in_progress", "completed"):
        q = q.where(RoadmapItem.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(RoadmapItem.sequence).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [ItemOut.model_validate(r).model_dump(mode="json") for r in rows], "total": total, "page": page, "page_size": page_size}


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: int, body: ItemPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = owned_item(db, user, item_id)
    old_status, old_pct = item.status, item.progress_pct
    try:
        item.status, item.progress_pct = apply_item_update(item, body.status, body.progress_pct)
    except ProgressError as e:
        raise HTTPException(422, str(e))
    data = body.model_dump(exclude_unset=True)
    if "notes" in data:
        item.notes = (data["notes"] or None)
    if body.clear_target_date:
        item.target_date = None
    elif "target_date" in data and body.target_date is not None:
        item.target_date = body.target_date
    record_change(db, user, item, old_status, old_pct)
    db.commit()
    db.refresh(item)
    return item


@router.get("/history", response_model=dict)
def history(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(ProgressHistory).where(ProgressHistory.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(ProgressHistory.created_at.desc(), ProgressHistory.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [HistoryOut.model_validate(r).model_dump(mode="json") for r in rows], "total": total, "page": page, "page_size": page_size}
