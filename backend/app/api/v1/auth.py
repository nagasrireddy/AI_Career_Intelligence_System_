from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.config import get_settings
from app.core.security import auth_limiter, create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.models import User, UserProfile
from app.schemas.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

_DUMMY_HASH = hash_password("dummy-password-for-timing")


@router.post("/register", response_model=UserOut, status_code=201, dependencies=[Depends(auth_limiter)])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    user = User(email=email, password_hash=hash_password(body.password), full_name=body.full_name.strip())
    user.profile = UserProfile()
    db.add(user)
    db.commit()
    return user


@router.post("/login", response_model=TokenOut, dependencies=[Depends(auth_limiter)])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)  # constant-ish time
    if not user or not ok or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    return TokenOut(access_token=create_access_token(user.id), expires_in_minutes=get_settings().access_token_expire_minutes)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
