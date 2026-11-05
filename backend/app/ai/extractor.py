"""Dictionary + pattern based skill and section extraction (no trained model; deterministic and offline).

Confidence heuristic (documented, not statistical):
  base 0.6 for any whole-word match; +0.15 if found in a 'skills' section; +0.1 per extra mention (max +0.2);
  -0.15 for very short/ambiguous tokens (C, R, Go) unless they appear in a skills section or near programming context.
"""
import re
from functools import lru_cache

from app.ai.normalizer import alias_index, category_index, normalize_text

AMBIGUOUS = {"c", "r", "go", "py", "ts", "ml", "tf", "rest", "spring", "mongo", "torch", "express", "excel", "oracle"}
SECTION_HEADERS = {
    "skills": r"(technical\s+)?skills|core competencies|technologies|tech stack|tools",
    "education": r"education|academic background|qualifications",
    "experience": r"(work\s+|professional\s+)?experience|employment|internships?",
    "projects": r"projects|personal projects|academic projects",
    "certifications": r"certifications?|licenses|courses|achievements",
}


@lru_cache(maxsize=1)
def _pattern() -> re.Pattern:
    terms = sorted(alias_index().keys(), key=len, reverse=True)
    escaped = [re.escape(t) for t in terms]
    return re.compile(r"(?<![A-Za-z0-9+#])(" + "|".join(escaped) + r")(?![A-Za-z0-9]|\+\+?[A-Za-z]|#[A-Za-z])", re.IGNORECASE)


def split_sections(text: str) -> dict[str, str]:
    """Split text into sections by header lines (short lines matching a known header)."""
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for line in text.splitlines():
        stripped = line.strip().strip(":-– ").strip()
        matched = None
        if 0 < len(stripped) <= 40:
            for name, pat in SECTION_HEADERS.items():
                if re.fullmatch(pat, stripped, re.IGNORECASE):
                    matched = name
                    break
        if matched:
            current = matched
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(line)
    return {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}


def extract_skills(text: str) -> list[dict]:
    text = normalize_text(text)
    if not text:
        return []
    sections = split_sections(text)
    skills_section = sections.get("skills", "")
    idx, cats = alias_index(), category_index()
    found: dict[str, dict] = {}
    for m in _pattern().finditer(text):
        raw = m.group(1)
        canon = idx[raw.lower()]
        start = max(0, m.start() - 40)
        snippet = re.sub(r"\s+", " ", text[start:m.end() + 40]).strip()
        entry = found.setdefault(canon, {"skill": canon, "category": cats.get(canon, "Other"), "mentions": 0,
                                         "evidence": snippet, "raw_forms": set(), "ambiguous_only": True})
        entry["mentions"] += 1
        entry["raw_forms"].add(raw)
        if raw.lower() not in AMBIGUOUS:
            entry["ambiguous_only"] = False
    results = []
    sk_low = skills_section.lower()
    for canon, e in found.items():
        in_skills = any(f.lower() in sk_low for f in e["raw_forms"]) if skills_section else False
        conf = 0.6 + (0.15 if in_skills else 0) + min(0.2, 0.1 * (e["mentions"] - 1))
        if e["ambiguous_only"] and not in_skills:
            conf -= 0.15
        conf = round(max(0.3, min(conf, 0.98)), 2)
        why = f"Matched '{sorted(e['raw_forms'])[0]}' ({e['mentions']}x" + (", in skills section" if in_skills else "") + ")"
        results.append({"skill": canon, "category": e["category"], "confidence": conf, "evidence": f"{why}: …{e['evidence']}…"[:300]})
    # drop very-low-confidence single-letter language hits that are likely noise
    results = [r for r in results if not (r["skill"] in {"C", "R", "Go"} and r["confidence"] < 0.5)]
    return sorted(results, key=lambda r: (-r["confidence"], r["skill"]))


def extract_profile_sections(text: str) -> dict:
    """Return raw section text for education/experience/projects/certifications only when explicitly present."""
    sections = split_sections(normalize_text(text))
    out = {}
    for key in ("education", "experience", "projects", "certifications"):
        body = sections.get(key)
        if body:
            lines = [l.strip(" -•*\t") for l in body.splitlines() if l.strip()]
            out[key] = lines[:25]
    emails = re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    out["_has_contact_email"] = bool(emails)
    return out
