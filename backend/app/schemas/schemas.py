from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel):
    total: int
    page: int
    page_size: int


# ---- auth / users
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)

    @field_validator("password")
    @classmethod
    def strong(cls, v: str) -> str:
        if not (any(c.isalpha() for c in v) and any(c.isdigit() for c in v)):
            raise ValueError("Password must contain at least one letter and one number.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class ProfileOut(ORM):
    headline: str | None = None
    education_level: str | None = None
    university: str | None = None
    target_role_id: int | None = None
    weekly_hours: int = 8


class UserOut(ORM):
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime
    profile: ProfileOut | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    education_level: str | None = Field(default=None, max_length=120)
    university: str | None = Field(default=None, max_length=160)
    target_role_id: int | None = None
    weekly_hours: int | None = Field(default=None, ge=1, le=80)
    clear_target_role: bool = False


# ---- resumes
class SkillOut(ORM):
    id: int
    skill: str
    category: str
    confidence: float
    evidence: str | None = None
    source: str
    removed: bool


class ResumeSummary(ORM):
    id: int
    original_filename: str
    file_type: str
    size_bytes: int
    analysis_version: int
    analyzed_at: datetime | None
    created_at: datetime
    skill_count: int = 0


class ResumeDetail(ResumeSummary):
    text_preview: str
    text_length: int
    sections: dict | None = None
    skills: list[SkillOut]


class SkillEdit(BaseModel):
    add: list[str] = Field(default_factory=list, max_length=50)
    remove: list[str] = Field(default_factory=list, max_length=100)
    restore: list[str] = Field(default_factory=list, max_length=100)


# ---- roles
class RoleSkillOut(ORM):
    skill: str
    weight: float
    level: str


class RoleSummary(ORM):
    id: int
    slug: str
    title: str
    description: str
    category: str
    skill_count: int = 0
    top_skills: list[str] = []


class ResourceOut(ORM):
    skill: str
    title: str
    url: str
    provider: str
    est_hours: int


class RoleDetail(RoleSummary):
    skills: list[RoleSkillOut]
    resources: list[ResourceOut] = []
    disclaimer: str = ("Role requirements are illustrative and configurable. They are not universal hiring requirements; "
                       "real employers vary widely.")


# ---- skill gap
class GapRequest(BaseModel):
    role_id: int
    resume_id: int | None = None
    extra_skills: list[str] = Field(default_factory=list, max_length=100)


class GapResultOut(ORM):
    skill: str
    status: str
    weight: float
    priority: str
    category: str
    note: str | None = None


class GapSummary(ORM):
    id: int
    role_id: int
    role_title: str
    resume_id: int | None
    weighted_score: float
    coverage_pct: float
    created_at: datetime


class GapDetail(GapSummary):
    results: list[GapResultOut]
    matched_count: int
    partial_count: int
    missing_count: int
    total_required: int
    strengths: list[GapResultOut] = []
    priority_gaps: list[GapResultOut] = []
    improvement_areas: list[str] = []
    by_category: list[dict] = []
    user_skills: list[str] = []
    formula: str


# ---- roadmaps
Status = Literal["not_started", "in_progress", "completed"]


class ItemOut(ORM):
    id: int
    roadmap_id: int
    sequence: int
    skill: str
    objective: str
    priority: str
    prerequisites: list[str] | None = []
    est_hours: int
    resource_title: str | None = None
    resource_url: str | None = None
    category: str
    milestone: int
    status: str
    progress_pct: int
    notes: str | None = None
    target_date: date | None = None
    started_at: date | None = None
    completed_at: date | None = None


class RoadmapSummary(ORM):
    id: int
    title: str
    role_id: int
    role_title: str
    duration_days: int
    status: str
    start_date: date
    created_at: datetime
    item_count: int = 0
    completed_count: int = 0
    completion_pct: float = 0.0


class RoadmapDetail(RoadmapSummary):
    items: list[ItemOut]


class RoadmapGenerate(BaseModel):
    role_id: int
    duration_days: Literal[30, 60, 90] = 60
    analysis_id: int | None = None
    resume_id: int | None = None
    replace_roadmap_id: int | None = None


class RoadmapPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: Literal["active", "archived"] | None = None


class ItemPatch(BaseModel):
    status: Status | None = None
    progress_pct: int | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=2000)
    target_date: date | None = None
    clear_target_date: bool = False


class HistoryOut(ORM):
    id: int
    item_id: int | None
    skill: str
    old_status: str
    new_status: str
    old_pct: int
    new_pct: int
    created_at: datetime
