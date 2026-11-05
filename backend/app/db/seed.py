"""Idempotent seed: safe to run repeatedly (upserts roles, role skills and resources)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.normalizer import category_of
from app.db.seed_data import RESOURCES, ROLES
from app.db.session import SessionLocal, init_db
from app.models.models import JobRole, LearningResource, RoleSkill


def seed(db: Session) -> dict:
    created = {"roles": 0, "role_skills": 0, "resources": 0}
    for r in ROLES:
        role = db.scalar(select(JobRole).where(JobRole.slug == r["slug"]))
        if not role:
            role = JobRole(slug=r["slug"], title=r["title"], description=r["description"], category=r["category"])
            db.add(role)
            db.flush()
            created["roles"] += 1
        else:
            role.title, role.description, role.category = r["title"], r["description"], r["category"]
        existing = {s.skill: s for s in role.skills}
        for skill, (weight, level) in r["skills"].items():
            if skill in existing:
                existing[skill].weight, existing[skill].level = weight, level
            else:
                db.add(RoleSkill(role_id=role.id, skill=skill, weight=weight, level=level))
                created["role_skills"] += 1
    db.flush()
    for skill, entries in RESOURCES.items():
        for title, url, provider, hours in entries:
            found = db.scalar(select(LearningResource).where(LearningResource.skill == skill, LearningResource.url == url))
            if found:
                found.title, found.provider, found.est_hours = title, provider, hours
            else:
                db.add(LearningResource(skill=skill, title=title, url=url, provider=provider, est_hours=hours, category=category_of(skill)))
                created["resources"] += 1
    db.commit()
    return created


def main():
    init_db()
    with SessionLocal() as db:
        print("Seed complete:", seed(db))


if __name__ == "__main__":
    main()
