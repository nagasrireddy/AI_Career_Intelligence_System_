"""Priority- and prerequisite-aware roadmap generation (deterministic, offline)."""
from datetime import date, timedelta

from app.ai.normalizer import category_of, normalize_skill
from app.ai.scoring import PRIORITY_ORDER
from app.ai.taxonomy import DEFAULT_HOURS, PREREQUISITES


def order_with_prerequisites(targets: list[dict], have: set[str]) -> list[dict]:
    """targets: gap dicts sorted by priority. Pulls in missing prerequisites ahead of dependants (topological order).
    Prerequisites the user already has are skipped. Returns list of dicts with 'skill','priority','weight','prereqs','reason'."""
    by_skill = {t["skill"]: t for t in targets}
    ordered: list[dict] = []
    seen: set[str] = set()

    def visit(skill: str, base: dict | None, stack: tuple = ()):
        if skill in seen or skill in have or skill in stack:
            return
        item = base or by_skill.get(skill)
        prereqs = [p for p in PREREQUISITES.get(skill, []) if p not in have]
        for p in prereqs:
            parent = by_skill.get(p)
            visit(p, parent or {"skill": p, "priority": (base or {}).get("priority", "medium") if (base or {}).get("priority") != "critical" else "high",
                                "weight": 2.5, "reason": f"Prerequisite for {skill}"}, stack + (skill,))
        seen.add(skill)
        ordered.append({**(item or {"skill": skill, "priority": "medium", "weight": 2.5}),
                        "skill": skill, "prereqs": [p for p in PREREQUISITES.get(skill, [])]})

    for t in targets:
        visit(t["skill"], t)
    return ordered


def build_roadmap_items(gaps: list[dict], user_skills: list[str], resources: dict[str, list[dict]], duration_days: int,
                        start: date | None = None, role_title: str = "") -> list[dict]:
    """Return item dicts ready to persist. Hours are scheduled across `duration_days` at the pace needed to fit them,
    split into phases (milestones) of roughly equal calendar length."""
    start = start or date.today()
    have = {normalize_skill(s) for s in user_skills}
    targets = [g for g in gaps if g["status"] != "matched"]
    ordered = order_with_prerequisites(targets, have)
    # stable sort: keep prerequisite ordering but float higher priorities earlier when dependency allows
    placed: list[dict] = []
    remaining = list(ordered)
    placed_set = set()
    while remaining:
        ready = [r for r in remaining if all((p in placed_set) or (p in have) or (p not in {x["skill"] for x in ordered}) for p in r["prereqs"])]
        ready = ready or remaining[:1]
        ready.sort(key=lambda r: (PRIORITY_ORDER.get(r.get("priority", "medium"), 2), -float(r.get("weight", 1))))
        pick = ready[0]
        placed.append(pick)
        placed_set.add(pick["skill"])
        remaining.remove(pick)

    items, total_hours = [], 0
    for r in placed:
        res = (resources.get(r["skill"]) or [None])[0]
        hours = res["est_hours"] if res else DEFAULT_HOURS
        total_hours += hours
        items.append((r, res, hours))
    n_phases = 3 if duration_days <= 30 else 4 if duration_days <= 60 else 5
    n = max(len(items), 1)
    cum, out = 0, []
    for i, (r, res, hours) in enumerate(items):
        cum += hours
        frac = cum / max(total_hours, 1)
        target = start + timedelta(days=max(1, round(frac * duration_days)))
        milestone = min(n_phases, int((i / n) * n_phases) + 1)
        reason = r.get("reason")
        objective = (f"{reason}. " if reason else "") + f"Build working proficiency in {r['skill']}" + (f" for the {role_title} role" if role_title else "") + \
                    f" and demonstrate it with a small hands-on exercise or project."
        out.append({
            "sequence": i + 1, "skill": r["skill"], "objective": objective[:400], "priority": r.get("priority", "medium"),
            "prerequisites": [p for p in r["prereqs"] if p not in have], "est_hours": hours,
            "resource_title": res["title"] if res else None, "resource_url": res["url"] if res else None,
            "category": category_of(r["skill"]), "milestone": milestone, "target_date": target,
        })
    return out
