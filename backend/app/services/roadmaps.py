from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.roadmap import build_roadmap_items
from app.ai.taxonomy import PREREQUISITES
from app.models.models import (JobRole, LearningResource, Resume, Roadmap, RoadmapItem, SkillGapAnalysis, User)
from app.services.analysis import gap_detail, run_gap_analysis
from app.services.helpers import effective_skills


def resources_for(db: Session, skills: list[str]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in db.scalars(select(LearningResource).where(LearningResource.skill.in_(skills)).order_by(LearningResource.id)):
        out.setdefault(r.skill, []).append({"title": r.title, "url": r.url, "est_hours": r.est_hours})
    return out


def roadmap_summary(r: Roadmap) -> dict:
    done = sum(1 for i in r.items if i.status == "completed")
    n = len(r.items)
    pct = round(sum(i.progress_pct for i in r.items) / n, 1) if n else 0.0
    return {"id": r.id, "title": r.title, "role_id": r.role_id, "role_title": r.role.title, "duration_days": r.duration_days,
            "status": r.status, "start_date": r.start_date, "created_at": r.created_at, "item_count": n,
            "completed_count": done, "completion_pct": pct}


def roadmap_detail(r: Roadmap) -> dict:
    return {**roadmap_summary(r), "items": r.items}


def generate_roadmap(db: Session, user: User, role: JobRole, duration: int, resume: Resume | None,
                     analysis: SkillGapAnalysis | None, old: Roadmap | None) -> Roadmap:
    skills = effective_skills(resume)
    completed_old: dict[str, RoadmapItem] = {}
    carry: dict[str, RoadmapItem] = {}
    if old:
        for it in old.items:
            if it.status == "completed":
                completed_old[it.skill] = it
            elif it.status == "in_progress" or it.notes:
                carry[it.skill] = it
    # Skills the user finished in the old roadmap count as acquired so they are not re-recommended.
    skills_for_plan = skills + list(completed_old)
    if analysis is None or analysis.role_id != role.id:
        analysis, _ = run_gap_analysis(db, user, role, resume, skills_for_plan)
    detail = gap_detail(analysis)
    gaps = [g for g in detail["priority_gaps"] if g["skill"] not in completed_old]
    res = resources_for(db, list({g["skill"] for g in gaps} | set(PREREQUISITES.keys())))
    items = build_roadmap_items(gaps, skills_for_plan, res, duration, date.today(), role.title)
    road = Roadmap(user_id=user.id, role_id=role.id, analysis_id=analysis.id, duration_days=duration,
                   title=f"{duration}-day plan: {role.title}", start_date=date.today())
    seq = 1
    for skill, it in completed_old.items():  # preserved completed work goes first
        road.items.append(RoadmapItem(sequence=seq, skill=it.skill, objective=it.objective, priority=it.priority, prerequisites=it.prerequisites,
                                      est_hours=it.est_hours, resource_title=it.resource_title, resource_url=it.resource_url, category=it.category,
                                      milestone=1, status="completed", progress_pct=100, notes=it.notes, target_date=it.target_date,
                                      started_at=it.started_at, completed_at=it.completed_at))
        seq += 1
    for d in items:
        d = {**d, "sequence": seq}
        item = RoadmapItem(**d)
        prev = carry.get(d["skill"])
        if prev:
            item.status, item.progress_pct, item.notes, item.started_at = prev.status, prev.progress_pct, prev.notes, prev.started_at
        road.items.append(item)
        seq += 1
    if old:
        old.status = "archived"
    db.add(road)
    db.commit()
    db.refresh(road)
    return road
