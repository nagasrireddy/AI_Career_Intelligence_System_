import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, Request, status

from app.core.config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_access_token(subject: int) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": str(subject), "iat": now, "exp": now + timedelta(minutes=s.access_token_expire_minutes)}
    return jwt.encode(payload, s.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
        return int(data["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please log in again.")
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication token.")


class RateLimiter:
    """Simple in-memory sliding-window limiter (per client IP). Use Redis in multi-process production."""

    def __init__(self, limit_getter, name: str):
        self.limit_getter, self.name = limit_getter, name
        self.hits: dict[str, deque] = defaultdict(deque)

    def reset(self):
        self.hits.clear()

    def __call__(self, request: Request):
        limit = self.limit_getter()
        if limit <= 0:
            return
        key = f"{self.name}:{request.client.host if request.client else 'unknown'}"
        now, q = time.monotonic(), self.hits[key]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please slow down.")
        q.append(now)


auth_limiter = RateLimiter(lambda: get_settings().rate_limit_auth_per_min, "auth")
upload_limiter = RateLimiter(lambda: get_settings().rate_limit_upload_per_min, "upload")
