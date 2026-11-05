from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import ProgressHistory, Roadmap, RoadmapItem, User


class ProgressError(ValueError):
    pass


def apply_item_update(item: RoadmapItem, status: str | None, pct: int | None) -> tuple[str, int]:
    """Return a consistent (status, pct). Rules: not_started<->0, completed<->100, in_progress in 1..99."""
    if status is None and pct is None:
        return item.status, item.progress_pct
    if status is not None and pct is not None:
        if (status == "not_started" and pct != 0) or (status == "completed" and pct != 100) or (status == "in_progress" and not 0 < pct < 100):
            raise ProgressError("Status and progress percentage are inconsistent "
                                "(not_started=0, in_progress=1-99, completed=100).")
        return status, pct
    if pct is not None:
        return ("not_started" if pct == 0 else "completed" if pct == 100 else "in_progress"), pct
    if status == "completed":
        return status, 100
    if status == "not_started":
        return status, 0
    return "in_progress", item.progress_pct if 0 < item.progress_pct < 100 else 10


def record_change(db: Session, user: User, item: RoadmapItem, old_status: str, old_pct: int) -> None:
    today = date.today()
    if item.status != old_status or item.progress_pct != old_pct:
        db.add(ProgressHistory(user_id=user.id, item_id=item.id, skill=item.skill, old_status=old_status,
                               new_status=item.status, old_pct=old_pct, new_pct=item.progress_pct))
    if item.status == "in_progress" and not item.started_at:
        item.started_at = today
    if item.status == "completed":
        item.completed_at = item.completed_at or today
        item.started_at = item.started_at or today
    else:
        item.completed_at = None
    if item.status == "not_started":
        item.started_at = None


def active_roadmap(db: Session, user: User) -> Roadmap | None:
    return db.scalar(select(Roadmap).where(Roadmap.user_id == user.id, Roadmap.status == "active").order_by(Roadmap.created_at.desc(), Roadmap.id.desc()))


def progress_series(db: Session, user: User, now: datetime | None = None) -> dict:
    """Weekly (last 8 ISO weeks) and monthly (last 6 months) completed-item counts and update counts."""
    now = now or datetime.utcnow()
    today = now.date()
    completed = db.scalars(select(RoadmapItem.completed_at).join(Roadmap).where(Roadmap.user_id == user.id, RoadmapItem.status == "completed",
                                                                                 RoadmapItem.completed_at.is_not(None))).all()
    events = db.scalars(select(ProgressHistory.created_at).where(ProgressHistory.user_id == user.id)).all()
    monday = today - timedelta(days=today.weekday())
    weeks = []
    for i in range(7, -1, -1):
        start = monday - timedelta(weeks=i)
        end = start + timedelta(days=7)
        weeks.append({"label": start.strftime("%d %b"), "start": start.isoformat(),
                      "completed": sum(1 for c in completed if start <= c < end),
                      "updates": sum(1 for e in events if start <= e.date() < end)})
    months = []
    y, m = today.year, today.month
    for i in range(5, -1, -1):
        yy, mm = y, m - i
        while mm <= 0:
            mm += 12
            yy -= 1
        months.append({"label": date(yy, mm, 1).strftime("%b %Y"), "year": yy, "month": mm,
                       "completed": sum(1 for c in completed if c.year == yy and c.month == mm),
                       "updates": sum(1 for e in events if e.year == yy and e.month == mm)})
    return {"weekly": weeks, "monthly": months}
