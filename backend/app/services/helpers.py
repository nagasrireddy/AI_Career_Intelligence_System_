"""Shared query helpers (ownership enforced here: every lookup is filtered by user_id)."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (ExtractedSkill, JobRole, Resume, Roadmap, RoadmapItem, SkillGapAnalysis, User)


def owned_resume(db: Session, user: User, resume_id: int) -> Resume:
    r = db.scalar(select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id))
    if not r:
        raise HTTPException(404, "Resume not found.")
    return r


def owned_analysis(db: Session, user: User, analysis_id: int) -> SkillGapAnalysis:
    a = db.scalar(select(SkillGapAnalysis).where(SkillGapAnalysis.id == analysis_id, SkillGapAnalysis.user_id == user.id))
    if not a:
        raise HTTPException(404, "Analysis not found.")
    return a


def owned_roadmap(db: Session, user: User, roadmap_id: int) -> Roadmap:
    r = db.scalar(select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id))
    if not r:
        raise HTTPException(404, "Roadmap not found.")
    return r


def owned_item(db: Session, user: User, item_id: int) -> RoadmapItem:
    it = db.scalar(select(RoadmapItem).join(Roadmap).where(RoadmapItem.id == item_id, Roadmap.user_id == user.id))
    if not it:
        raise HTTPException(404, "Learning item not found.")
    return it


def get_role(db: Session, role_id: int) -> JobRole:
    r = db.get(JobRole, role_id)
    if not r:
        raise HTTPException(404, "Job role not found.")
    return r


def effective_skills(resume: Resume | None) -> list[str]:
    if not resume:
        return []
    return [s.skill for s in resume.skills if not s.removed]


def latest_resume(db: Session, user: User) -> Resume | None:
    return db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc(), Resume.id.desc()))
