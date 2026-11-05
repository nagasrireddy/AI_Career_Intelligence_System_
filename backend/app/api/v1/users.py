from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.models import User, UserProfile
from app.schemas.schemas import UserOut, UserUpdate
from app.services.helpers import get_role
from app.services.resume_parser import delete_file

router = APIRouter(prefix="/users", tags=["Profiles"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UserUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if data.get("full_name"):
        user.full_name = data["full_name"].strip()
    if user.profile is None:
        user.profile = UserProfile()
    p = user.profile
    for f in ("headline", "education_level", "university", "weekly_hours"):
        if f in data and (data[f] is not None or f != "weekly_hours"):
            setattr(p, f, data[f])
    if data.get("clear_target_role"):
        p.target_role_id = None
    elif data.get("target_role_id") is not None:
        p.target_role_id = get_role(db, data["target_role_id"]).id
    db.commit()
    return user


@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Permanently deletes the account and every private record (resumes, analyses, roadmaps, progress, files)."""
    from sqlalchemy import select
    from app.models.models import Resume
    for r in db.scalars(select(Resume).where(Resume.user_id == user.id)):
        delete_file(r.stored_path)
    db.delete(user)
    db.commit()
    return Response(status_code=204)
