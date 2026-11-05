import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.seed import seed
from app.db.session import SessionLocal, init_db

logger = logging.getLogger("aci")
DESCRIPTION = """AI Career Intelligence System API. Resume skill extraction (dictionary + pattern matching, offline),
weighted skill-gap scoring against **illustrative** role profiles, and prerequisite-aware learning roadmaps.
No paid AI service is required. Scores are educational estimates, not hiring predictions."""


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed(db)  # idempotent
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="AI Career Intelligence System", version="1.0.0", description=DESCRIPTION, lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_list, allow_credentials=False,
                       allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Cache-Control", "no-store")
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi")):
            resp.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        return resp

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)  # no request bodies logged
        return JSONResponse({"detail": "Internal server error."}, status_code=500)

    @app.get("/health", tags=["System"])
    def health():
        return {"status": "ok", "version": "1.0.0"}

    app.include_router(api_router)
    return app


app = create_app()
