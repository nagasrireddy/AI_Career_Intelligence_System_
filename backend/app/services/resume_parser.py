"""Safe resume ingestion: validation + text extraction for PDF and DOCX."""
import io
import uuid
import zipfile
from pathlib import Path

from app.core.config import get_settings

ALLOWED = {
    ".pdf": {"application/pdf"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", "application/zip"},
}


class ResumeError(ValueError):
    """User-facing validation/parsing error."""


def validate_upload(filename: str, content_type: str | None, data: bytes) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise ResumeError("Unsupported file type. Please upload a PDF or DOCX resume.")
    if content_type and content_type.split(";")[0].strip().lower() not in ALLOWED[ext] | {"application/octet-stream"}:
        raise ResumeError(f"File content type '{content_type}' does not match a {ext.upper()[1:]} file.")
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    if not data:
        raise ResumeError("The uploaded file is empty.")
    if len(data) > max_bytes:
        raise ResumeError(f"File is too large. Maximum size is {get_settings().max_upload_mb} MB.")
    if ext == ".pdf" and not data.lstrip()[:5] == b"%PDF-":
        raise ResumeError("This file is not a valid PDF (signature check failed).")
    if ext == ".docx" and not zipfile.is_zipfile(io.BytesIO(data)):
        raise ResumeError("This file is not a valid DOCX document.")
    return ext[1:]


def extract_text(data: bytes, file_type: str) -> str:
    text = _pdf_text(data) if file_type == "pdf" else _docx_text(data)
    text = text.strip()
    if len(text) < 20:
        raise ResumeError("No readable text found. Scanned/image-only resumes are not supported (no OCR); "
                          "please upload a text-based PDF or DOCX.")
    return text


def _pdf_text(data: bytes) -> str:
    import fitz  # PyMuPDF
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise ResumeError("The PDF could not be read. It may be corrupted.")
    try:
        if doc.needs_pass or doc.is_encrypted:
            raise ResumeError("This PDF is password-protected/encrypted. Please upload an unprotected copy.")
        return "\n".join(page.get_text("text") for page in doc)
    except ResumeError:
        raise
    except Exception:
        raise ResumeError("The PDF could not be read. It may be corrupted.")
    finally:
        doc.close()


def _docx_text(data: bytes) -> str:
    import docx
    try:
        d = docx.Document(io.BytesIO(data))
    except Exception:
        raise ResumeError("The DOCX could not be read. It may be corrupted or password-protected.")
    parts = [p.text for p in d.paragraphs]
    for table in d.tables:
        for row in table.rows:
            parts.append(" | ".join(c.text.strip() for c in row.cells))
    return "\n".join(parts)


def store_file(user_id: int, data: bytes, file_type: str) -> str:
    """Save under a server-generated random name inside a private per-user directory (never a static/public path)."""
    base = Path(get_settings().upload_dir).resolve()
    target_dir = (base / str(user_id)).resolve()
    if base not in target_dir.parents and target_dir != base:  # path traversal guard
        raise ResumeError("Invalid storage path.")
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{uuid.uuid4().hex}.{file_type}"
    path.write_bytes(data)
    return str(path)


def delete_file(path: str) -> None:
    try:
        base = Path(get_settings().upload_dir).resolve()
        p = Path(path).resolve()
        if base in p.parents and p.exists():
            p.unlink()
    except OSError:
        pass
