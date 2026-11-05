from fastapi import APIRouter

from app.api.v1 import auth, dashboard, progress, resumes, roadmaps, roles, skill_gap, users

api_router = APIRouter(prefix="/api/v1")
for m in (auth, users, resumes, roles, skill_gap, roadmaps, progress, dashboard):
    api_router.include_router(m.router)
