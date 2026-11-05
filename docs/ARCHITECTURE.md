# Architecture

```
React SPA (Vite)  --Axios/JWT-->  FastAPI /api/v1  --SQLAlchemy-->  SQLite (or PostgreSQL)
                                     |-- app/ai        (taxonomy, extractor, scoring, roadmap)
                                     |-- app/services  (resume parsing, analysis, roadmaps, progress)
                                     `-- data/uploads  (private files, random names, per-user folders)
```

## Backend layers
* `api/v1/*` thin routers: validation, auth, pagination, status codes. `api/deps.py` resolves the current user from a Bearer JWT.
* `services/*` business logic and ownership-checked lookups (`helpers.py` always filters by `user_id`; other users' records return **404**).
* `ai/*` pure-Python deterministic logic, unit-tested without a database:
  * `taxonomy.py` category → canonical skill → aliases, plus the prerequisite graph.
  * `normalizer.py` alias → canonical name; `extractor.py` word-boundary regex matching, section splitting, heuristic confidence.
  * `scoring.py` the documented gap formula. `roadmap.py` topological ordering + priority sort + scheduling.
* `db/` engine/session, idempotent `seed.py` + `seed_data.py` (roles, weights, resources).

## Data model
`users 1-1 user_profiles`; `users 1-* resumes 1-* extracted_skills`; `job_roles 1-* role_skills`; `learning_resources` (by skill);
`users 1-* skill_gap_analyses 1-* skill_gap_results` (stores a skills snapshot); `users 1-* roadmaps 1-* roadmap_items`; `progress_history` (per item change).
Foreign keys are enforced (SQLite `PRAGMA foreign_keys=ON`). Unique constraints: email, role slug/title, (role, skill), (resume, skill), (skill, url). Indexes on user_id, created_at, (roadmap, status).

### Deletion rules
| Delete | Effect |
|---|---|
| User | cascades to profile, resumes (+files removed from disk), analyses, roadmaps, items, history |
| Resume | cascades to extracted skills; analyses remain (resume_id → NULL) because they keep a skill snapshot |
| Skill-gap analysis | cascades to its results; roadmaps keep working (analysis_id → NULL) |
| Roadmap | cascades to items; progress history rows for those items are removed |
| Job role / resource | catalogue data, not user-deletable |

## Scoring formula
```
weighted_score = (Σ w[matched] + 0.5·Σ w[partial]) / Σ w[all required] × 100
coverage_pct   = #matched / #required × 100
partial        = not present, but a prerequisite or closely related skill is present (RELATED / PREREQUISITES maps)
priority       = weight ≥4.5 critical, ≥3.5 high, ≥2.5 medium, else low
```
Skill names (user and role) are normalized through the alias table before comparison.

## Roadmap generation
1. Take non-matched skills sorted by priority/weight. 2. Pull in missing prerequisites (recursively) as earlier items. 3. Order by readiness: an item is "ready" when its prerequisites are placed/owned; among ready items, higher priority first. 4. Hours (from the primary curated resource, default 12) are distributed over 30/60/90 days to give target dates and 3–5 milestones. 5. On regeneration: old roadmap is archived; completed items are carried over as completed and their skills count as acquired; in-progress items/notes keep their state.

## Progress consistency rules
`not_started ⇔ 0%`, `completed ⇔ 100%`, `in_progress ⇔ 1–99%`. Setting only a status or only a percentage derives the other; contradictory pairs return 422. Every change writes a `progress_history` row and sets `started_at` / `completed_at`.

## Security design
bcrypt hashing (72-byte limit handled); JWT HS256 with expiry validated on every request; generic login error + dummy hash for unknown emails; per-IP in-memory rate limits on auth and upload; extension + MIME + magic-byte + size checks; uploads saved under random UUID names in per-user directories outside any static path with path-traversal guard; CORS allow-list from config; security headers (nosniff, frame deny, no-store, CSP for API); unhandled exceptions return a generic 500 and are logged without bodies; passwords/hashes never serialized.

## Privacy
Resumes and extracted text live only in your database and upload folder. Nothing is sent to third parties. No external LLM integration exists (the optional feature was intentionally not implemented). Users can delete individual resumes or their whole account.

## Frontend
Routes: `/` landing, `/login`, `/register`, `/app/*` (protected: dashboard, resume, resume/:id, resume-history, roles, roles/:id, skill-gap, roadmap, progress, profile), `*` 404. `AuthContext` stores the JWT in `localStorage` and reacts to an `auth:expired` event emitted by the Axios 401 interceptor. Pages are code-split with `React.lazy`.
