"""SQLAlchemy models.

Deletion rules (documented in docs/ARCHITECTURE.md):
- Deleting a User cascades to every private record they own.
- Deleting a Resume cascades to its extracted skills; skill-gap analyses survive because they store a skill snapshot
  (resume_id becomes NULL).
- Deleting a Roadmap cascades to its items and progress history.
- JobRole / LearningResource are shared catalogue data and are never deleted by users.
"""
from datetime import datetime, date

from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
                        UniqueConstraint, Index)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    headline: Mapped[str | None] = mapped_column(String(200))
    education_level: Mapped[str | None] = mapped_column(String(120))
    university: Mapped[str | None] = mapped_column(String(160))
    target_role_id: Mapped[int | None] = mapped_column(ForeignKey("job_roles.id", ondelete="SET NULL"))
    weekly_hours: Mapped[int] = mapped_column(Integer, default=8)
    user: Mapped[User] = relationship(back_populates="profile")


class Resume(Base):
    __tablename__ = "resumes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))  # private, server-generated name
    file_type: Mapped[str] = mapped_column(String(10))
    size_bytes: Mapped[int] = mapped_column(Integer)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    sections: Mapped[dict | None] = mapped_column(JSON)
    analysis_version: Mapped[int] = mapped_column(Integer, default=0)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    skills: Mapped[list["ExtractedSkill"]] = relationship(back_populates="resume", cascade="all, delete-orphan")


class ExtractedSkill(Base):
    __tablename__ = "extracted_skills"
    __table_args__ = (UniqueConstraint("resume_id", "skill"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    evidence: Mapped[str | None] = mapped_column(String(300))
    source: Mapped[str] = mapped_column(String(20), default="auto")  # auto | manual
    removed: Mapped[bool] = mapped_column(Boolean, default=False)  # user rejected an auto-detected skill
    resume: Mapped[Resume] = relationship(back_populates="skills")


class JobRole(Base):
    __tablename__ = "job_roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(60), default="Software")
    skills: Mapped[list["RoleSkill"]] = relationship(back_populates="role", cascade="all, delete-orphan",
                                                     order_by="desc(RoleSkill.weight)")


class RoleSkill(Base):
    __tablename__ = "role_skills"
    __table_args__ = (UniqueConstraint("role_id", "skill"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("job_roles.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(100))
    weight: Mapped[float] = mapped_column(Float, default=1.0)  # 1 (nice to have) .. 5 (critical)
    level: Mapped[str] = mapped_column(String(20), default="intermediate")
    role: Mapped[JobRole] = relationship(back_populates="skills")


class LearningResource(Base):
    __tablename__ = "learning_resources"
    __table_args__ = (UniqueConstraint("skill", "url"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    skill: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(500))
    provider: Mapped[str] = mapped_column(String(80))
    est_hours: Mapped[int] = mapped_column(Integer, default=10)
    category: Mapped[str] = mapped_column(String(50), default="")


class SkillGapAnalysis(Base):
    __tablename__ = "skill_gap_analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resume_id: Mapped[int | None] = mapped_column(ForeignKey("resumes.id", ondelete="SET NULL"))
    role_id: Mapped[int] = mapped_column(ForeignKey("job_roles.id", ondelete="CASCADE"))
    coverage_pct: Mapped[float] = mapped_column(Float)
    weighted_score: Mapped[float] = mapped_column(Float)
    user_skills_snapshot: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    role: Mapped[JobRole] = relationship()
    results: Mapped[list["SkillGapResult"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class SkillGapResult(Base):
    __tablename__ = "skill_gap_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("skill_gap_analyses.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20))  # matched | partial | missing
    weight: Mapped[float] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(20))  # critical | high | medium | low
    category: Mapped[str] = mapped_column(String(50), default="")
    note: Mapped[str | None] = mapped_column(String(300))
    analysis: Mapped[SkillGapAnalysis] = relationship(back_populates="results")


class Roadmap(Base):
    __tablename__ = "roadmaps"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("job_roles.id", ondelete="CASCADE"))
    analysis_id: Mapped[int | None] = mapped_column(ForeignKey("skill_gap_analyses.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200))
    duration_days: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | archived
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    role: Mapped[JobRole] = relationship()
    items: Mapped[list["RoadmapItem"]] = relationship(back_populates="roadmap", cascade="all, delete-orphan",
                                                      order_by="RoadmapItem.sequence")


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    __table_args__ = (Index("ix_items_roadmap_status", "roadmap_id", "status"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    roadmap_id: Mapped[int] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"))
    sequence: Mapped[int] = mapped_column(Integer)
    skill: Mapped[str] = mapped_column(String(100))
    objective: Mapped[str] = mapped_column(String(400))
    priority: Mapped[str] = mapped_column(String(20))
    prerequisites: Mapped[list | None] = mapped_column(JSON, default=list)
    est_hours: Mapped[int] = mapped_column(Integer, default=10)
    resource_title: Mapped[str | None] = mapped_column(String(200))
    resource_url: Mapped[str | None] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(50), default="")
    milestone: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    target_date: Mapped[date | None] = mapped_column(Date)
    started_at: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[date | None] = mapped_column(Date)
    roadmap: Mapped[Roadmap] = relationship(back_populates="items")


class ProgressHistory(Base):
    __tablename__ = "progress_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    item_id: Mapped[int | None] = mapped_column(ForeignKey("roadmap_items.id", ondelete="CASCADE"))
    skill: Mapped[str] = mapped_column(String(100))
    old_status: Mapped[str] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20))
    old_pct: Mapped[int] = mapped_column(Integer, default=0)
    new_pct: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
