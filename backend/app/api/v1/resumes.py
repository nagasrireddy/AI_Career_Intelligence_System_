from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.extractor import extract_profile_sections, extract_skills
from app.ai.normalizer import category_of, normalize_skill
from app.api.deps import current_user
from app.core.config import get_settings
from app.core.security import upload_limiter
from app.db.session import get_db
from app.models.models import ExtractedSkill, Resume, User
from app.schemas.schemas import ResumeDetail, ResumeSummary, SkillEdit
from app.services.helpers import owned_resume
from app.services.resume_parser import ResumeError, delete_file, extract_text, store_file, validate_upload

router = APIRouter(prefix="/resumes", tags=["Resumes"])


def _summary(r: Resume) -> dict:
    return {"id": r.id, "original_filename": r.original_filename, "file_type": r.file_type, "size_bytes": r.size_bytes,
            "analysis_version": r.analysis_version, "analyzed_at": r.analyzed_at, "created_at": r.created_at,
            "skill_count": sum(1 for s in r.skills if not s.removed)}


def _detail(r: Resume) -> dict:
    d = _summary(r)
    d.update(text_preview=r.extracted_text[:3000], text_length=len(r.extracted_text), sections=r.sections,
             skills=sorted(r.skills, key=lambda s: (s.category, -s.confidence, s.skill)))
    return d


def run_analysis(db: Session, resume: Resume) -> None:
    """(Re)run extraction. Manual skills and user rejections of still-detected skills are preserved."""
    detected = {s["skill"]: s for s in extract_skills(resume.extracted_text)}
    existing = {s.skill: s for s in resume.skills}
    for name, s in list(existing.items()):
        if s.source == "auto" and name not in detected:
            db.delete(s)
    for name, d in detected.items():
        if name in existing:
            e = existing[name]
            if e.source == "auto":
                e.confidence, e.evidence, e.category = d["confidence"], d["evidence"], d["category"]
        else:
            db.add(ExtractedSkill(resume_id=resume.id, skill=name, category=d["category"], confidence=d["confidence"],
                                  evidence=d["evidence"], source="auto"))
    resume.sections = extract_profile_sections(resume.extracted_text)
    resume.analysis_version += 1
    resume.analyzed_at = datetime.utcnow()
    db.commit()
    db.refresh(resume)


@router.post("/upload", response_model=ResumeDetail, status_code=201, dependencies=[Depends(upload_limiter)])
async def upload_resume(file: UploadFile = File(...), replace_resume_id: int | None = Form(default=None),
                        user: User = Depends(current_user), db: Session = Depends(get_db)):
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    try:
        ftype = validate_upload(file.filename or "", file.content_type, data)
        text = extract_text(data, ftype)
    except ResumeError as e:
        raise HTTPException(422, str(e))
    safe_name = (file.filename or "resume").replace("\\", "/").split("/")[-1][:200]
    path = store_file(user.id, data, ftype)
    if replace_resume_id:
        resume = owned_resume(db, user, replace_resume_id)
        delete_file(resume.stored_path)
        resume.original_filename, resume.stored_path, resume.file_type = safe_name, path, ftype
        resume.size_bytes, resume.extracted_text = len(data), text
        resume.created_at = datetime.utcnow()
        db.commit()
    else:
        resume = Resume(user_id=user.id, original_filename=safe_name, stored_path=path, file_type=ftype,
                        size_bytes=len(data), extracted_text=text)
        db.add(resume)
        db.commit()
    run_analysis(db, resume)
    return _detail(resume)


@router.get("", response_model=dict)
def list_resumes(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Resume).where(Resume.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(Resume.created_at.desc(), Resume.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [_summary(r) for r in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(resume_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _detail(owned_resume(db, user, resume_id))


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = owned_resume(db, user, resume_id)
    delete_file(r.stored_path)
    db.delete(r)
    db.commit()
    return Response(status_code=204)


@router.post("/{resume_id}/analyze", response_model=ResumeDetail)
def analyze_resume(resume_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = owned_resume(db, user, resume_id)
    run_analysis(db, r)
    return _detail(r)


@router.patch("/{resume_id}/skills", response_model=ResumeDetail)
def edit_skills(resume_id: int, body: SkillEdit, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Manual correction: add skills the parser missed, remove false positives, or restore removed ones."""
    r = owned_resume(db, user, resume_id)
    by_name = {s.skill: s for s in r.skills}
    for raw in body.add:
        name = normalize_skill(raw)
        if not name or len(name) > 100:
            continue
        if name in by_name:
            by_name[name].removed = False
        else:
            s = ExtractedSkill(resume_id=r.id, skill=name, category=category_of(name), confidence=1.0,
                               evidence="Added manually by you", source="manual")
            db.add(s)
            by_name[name] = s
    for raw in body.remove:
        s = by_name.get(normalize_skill(raw))
        if s:
            if s.source == "manual":
                db.delete(s)
            else:
                s.removed = True
    for raw in body.restore:
        s = by_name.get(normalize_skill(raw))
        if s:
            s.removed = False
    db.commit()
    db.refresh(r)
    return _detail(r)
