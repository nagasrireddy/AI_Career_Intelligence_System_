"""Verify every curated resource URL responds. Run on a machine with internet access:
    cd backend && python ../scripts/check_links.py
Exit code 1 if any link fails. Some sites block HEAD/bots (403/429); review those manually."""
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.db.seed_data import RESOURCES  # noqa: E402

urls = sorted({e[1] for entries in RESOURCES.values() for e in entries})
bad = []
with httpx.Client(follow_redirects=True, timeout=15, headers={"User-Agent": "Mozilla/5.0 link-check"}) as c:
    for u in urls:
        try:
            r = c.get(u)
            ok = r.status_code < 400
        except httpx.HTTPError as e:
            ok, r = False, e
        print(("OK   " if ok else "FAIL ") + u + ("" if ok else f"  -> {getattr(r, 'status_code', r)}"))
        if not ok:
            bad.append(u)
print(f"\n{len(urls) - len(bad)}/{len(urls)} links OK")
sys.exit(1 if bad else 0)
