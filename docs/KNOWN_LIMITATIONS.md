# Known limitations (honest list)

1. **Skill detection is rule-based.** Dictionary + regex with aliases; it will miss skills not in `taxonomy.py` and can mis-hit ambiguous words (mitigated for C/R/Go and a few others). Confidence is a heuristic, not a probability. No trained NLP model, no spaCy model download. Users can correct skills manually.
2. **Scanned/image PDFs are not supported** (no OCR); they are rejected with an explanatory message.
3. **Education/experience/projects/certifications** are shown only as the raw lines under clearly labelled headings; nothing is inferred. Unusual layouts (multi-column PDFs, creative headings) may not be sectioned.
4. **Role profiles and weights are illustrative**, hand-authored, and not validated against real job postings.
5. **Learning-resource URLs were not link-checked** (the build sandbox had no general internet access). They point to official documentation/free learning sites chosen from memory of stable top-level pages. Run `python scripts/check_links.py` and fix any dead link in `backend/app/db/seed_data.py`. Some skills reuse one resource (e.g. CS50, Hugging Face course). Hour estimates are rough.
6. **No refresh tokens**; sessions end at token expiry. JWT is kept in `localStorage` (XSS-exposed in principle; a production hardening step is httpOnly cookies).
7. **Rate limiting is in-memory per process**, so it resets on restart and isn't shared across workers.
8. **Schema migrations:** tables are created with `create_all`; no Alembic migrations are shipped. Use Alembic before evolving a production database. PostgreSQL support is by configuration only and was **not tested**.
9. **Optional LLM features were intentionally not implemented.**
10. **Not executed in the build environment:** the PowerShell scripts, Docker/Compose, running on Windows/macOS, a real browser session (UI verified through component tests and a successful production build only, not visually), PostgreSQL, and `check_links.py`.
11. Frontend tests cover forms, upload states, gap rendering, roadmap item changes and shared error/empty states; full page-level integration tests with a live API are not included.
12. Progress "weekly/monthly" series count completions by completion date and updates by history timestamp (UTC).
