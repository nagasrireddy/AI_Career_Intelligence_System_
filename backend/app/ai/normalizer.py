import re
from functools import lru_cache

from app.ai.taxonomy import TAXONOMY


@lru_cache(maxsize=1)
def alias_index() -> dict[str, str]:
    """lowercase alias or canonical -> canonical name"""
    idx: dict[str, str] = {}
    for skills in TAXONOMY.values():
        for canon, aliases in skills.items():
            idx[canon.lower()] = canon
            for a in aliases:
                idx[a.lower()] = canon
    return idx


@lru_cache(maxsize=1)
def category_index() -> dict[str, str]:
    return {canon: cat for cat, skills in TAXONOMY.items() for canon in skills}


def normalize_skill(name: str) -> str:
    """Map any alias to its canonical skill name; unknown skills are cleaned and title-cased."""
    cleaned = re.sub(r"\s+", " ", (name or "").strip())
    if not cleaned:
        return ""
    return alias_index().get(cleaned.lower(), cleaned if any(c.isupper() for c in cleaned[1:]) else cleaned.title())


def category_of(skill: str) -> str:
    return category_index().get(normalize_skill(skill), "Other")


def normalize_text(text: str) -> str:
    text = text.replace("\u2022", " ").replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
