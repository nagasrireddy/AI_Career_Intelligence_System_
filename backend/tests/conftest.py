import io

import docx
import fitz
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.security import auth_limiter, upload_limiter
from app.db.seed import seed
from app.db.session import Base, get_db, make_engine
from app.main import create_app

RESUME_TEXT = """Jane Doe
jane@example.com

Skills
Python, SQL, Git, Pandas, NumPy, Machine Learning, Statistics, Docker

Education
B.Tech in Computer Science, Example University, 2025

Experience
Data intern at Acme - built ETL data pipelines with Python and PostgreSQL

Projects
Sales dashboard using Power BI and Excel
Image classifier with TensorFlow and scikit-learn

Certifications
Google Data Analytics certificate
"""


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("RATE_LIMIT_AUTH_PER_MIN", "0")
    monkeypatch.setenv("RATE_LIMIT_UPLOAD_PER_MIN", "0")
    get_settings.cache_clear()
    from app.models import models  # noqa
    eng = make_engine(f"sqlite:///{tmp_path/'test.db'}")
    Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)
    with Session() as s:
        seed(s)
    app = create_app()

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.state.Session = Session
    auth_limiter.reset(); upload_limiter.reset()
    with TestClient(app) as c:
        c.Session = Session
        yield c
    get_settings.cache_clear()
    eng.dispose()


def register(client, email="jane@example.com", password="Passw0rd!x", name="Jane Doe"):
    r = client.post("/api/v1/auth/register", json={"email": email, "password": password, "full_name": name})
    assert r.status_code == 201, r.text
    t = client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture()
def auth(client):
    return register(client)


@pytest.fixture()
def auth2(client):
    return register(client, "other@example.com", name="Other User")


def make_docx(text=RESUME_TEXT) -> bytes:
    d = docx.Document()
    for line in text.splitlines():
        d.add_paragraph(line)
    b = io.BytesIO(); d.save(b)
    return b.getvalue()


def make_pdf(text=RESUME_TEXT) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 60), text, fontsize=10)
    return doc.tobytes()


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def upload(client, headers, data=None, name="resume.docx", mime=DOCX_MIME, **form):
    data = make_docx() if data is None else data
    return client.post("/api/v1/resumes/upload", headers=headers, files={"file": (name, data, mime)}, data=form)


def role_id(client, headers, title):
    items = client.get("/api/v1/roles", headers=headers, params={"q": title, "page_size": 50}).json()["items"]
    return next(r["id"] for r in items if r["title"].startswith(title))
