import io

from app.ai.extractor import extract_skills, split_sections
from app.ai.normalizer import normalize_skill
from app.services.resume_parser import ResumeError, extract_text, validate_upload
from tests.conftest import DOCX_MIME, RESUME_TEXT, make_docx, make_pdf, role_id, upload
import pytest


def test_normalization_aliases():
    assert normalize_skill("python3") == "Python" and normalize_skill("ReactJS") == "React"
    assert normalize_skill("k8s") == "Kubernetes" and normalize_skill("postgres") == "PostgreSQL"
    assert normalize_skill("  sklearn ") == "Scikit-learn"


def test_skill_extraction_and_no_invention():
    names = {s["skill"] for s in extract_skills(RESUME_TEXT)}
    assert {"Python", "SQL", "Git", "Pandas", "Machine Learning", "Docker", "Power BI", "TensorFlow", "PostgreSQL"} <= names
    assert "Kubernetes" not in names and "Java" not in names and "AWS" not in names
    s = next(x for x in extract_skills(RESUME_TEXT) if x["skill"] == "Python")
    assert 0.3 <= s["confidence"] <= 0.98 and "Matched" in s["evidence"]


def test_ambiguous_short_tokens_not_false_positive():
    names = {s["skill"] for s in extract_skills("I like to go to the market and watch r rated films. We use C++ and Java daily.")}
    assert "Go" not in names and "R" not in names and {"C++", "Java"} <= names
    assert "C" not in {s["skill"] for s in extract_skills("Worked with C++ only")}


def test_section_split():
    sec = split_sections(RESUME_TEXT)
    assert "Python" in sec["skills"] and "Example University" in sec["education"] and "Power BI" in sec["projects"]


def test_parse_pdf_and_docx():
    assert "Machine Learning" in extract_text(make_pdf(), "pdf")
    assert "Machine Learning" in extract_text(make_docx(), "docx")


def test_validation_errors():
    with pytest.raises(ResumeError, match="Unsupported"):
        validate_upload("a.txt", "text/plain", b"hello")
    with pytest.raises(ResumeError, match="empty"):
        validate_upload("a.pdf", "application/pdf", b"")
    with pytest.raises(ResumeError, match="not a valid PDF"):
        validate_upload("a.pdf", "application/pdf", b"not a pdf at all")
    with pytest.raises(ResumeError, match="not a valid DOCX"):
        validate_upload("a.docx", DOCX_MIME, b"not a zip")
    with pytest.raises(ResumeError, match="too large"):
        validate_upload("a.pdf", "application/pdf", b"%PDF-" + b"0" * (6 * 1024 * 1024))
    with pytest.raises(ResumeError, match="content type"):
        validate_upload("a.pdf", "image/png", b"%PDF-1.4")


def test_encrypted_and_blank_pdf_rejected():
    import fitz
    doc = fitz.open(); doc.new_page().insert_text((50, 50), "secret resume text with python and sql skills")
    enc = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="o", user_pw="u")
    with pytest.raises(ResumeError, match="password"):
        extract_text(enc, "pdf")
    blank = fitz.open(); blank.new_page()
    with pytest.raises(ResumeError, match="No readable text"):
        extract_text(blank.tobytes(), "pdf")


def test_upload_flow_persists_and_lists(client, auth):
    r = upload(client, auth)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["analysis_version"] == 1 and d["skill_count"] >= 8 and "Python" in d["text_preview"]
    assert all(k in d["sections"] for k in ("education", "experience", "projects", "certifications"))
    lst = client.get("/api/v1/resumes", headers=auth).json()
    assert lst["total"] == 1
    assert client.post(f"/api/v1/resumes/{d['id']}/analyze", headers=auth).json()["analysis_version"] == 2


def test_upload_rejections_via_api(client, auth):
    assert upload(client, auth, data=b"hello", name="x.txt", mime="text/plain").status_code == 422
    assert upload(client, auth, data=b"", name="x.pdf", mime="application/pdf").status_code == 422
    assert upload(client, auth, data=make_pdf(), name="r.pdf", mime="application/pdf").status_code == 201


def test_manual_skill_correction_survives_reanalysis(client, auth):
    d = upload(client, auth).json()
    rid = d["id"]
    r = client.patch(f"/api/v1/resumes/{rid}/skills", headers=auth, json={"add": ["Kubernetes", "k8s extra"], "remove": ["Docker"]}).json()
    by = {s["skill"]: s for s in r["skills"]}
    assert by["Kubernetes"]["source"] == "manual" and by["Docker"]["removed"] is True
    again = client.post(f"/api/v1/resumes/{rid}/analyze", headers=auth).json()
    by = {s["skill"]: s for s in again["skills"]}
    assert "Kubernetes" in by and by["Docker"]["removed"] is True
    restored = client.patch(f"/api/v1/resumes/{rid}/skills", headers=auth, json={"restore": ["Docker"]}).json()
    assert {s["skill"]: s for s in restored["skills"]}["Docker"]["removed"] is False


def test_replace_resume_and_delete(client, auth, tmp_path):
    a = upload(client, auth).json()
    b = upload(client, auth, data=make_docx("Skills\nJava, Spring Boot, Hibernate, Maven and SQL experience for backend work."), replace_resume_id=str(a["id"]))
    assert b.status_code == 201 and b.json()["id"] == a["id"]
    names = {s["skill"] for s in b.json()["skills"] if s["source"] == "auto"}
    assert "Java" in names and "Python" not in names
    assert client.delete(f"/api/v1/resumes/{a['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/v1/resumes/{a['id']}", headers=auth).status_code == 404
