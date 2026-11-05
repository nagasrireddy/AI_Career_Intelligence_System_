# API reference

Interactive docs: http://localhost:8000/docs (Swagger) and `/redoc`. All routes below are under `/api/v1`, require `Authorization: Bearer <token>` unless marked public. Lists accept `page` and `page_size` and return `{items,total,page,page_size}`.

| Method & path | Notes |
|---|---|
| POST `/auth/register` (public) | `{email,password,full_name}` → 201 user; 409 duplicate; 422 weak password |
| POST `/auth/login` (public) | `{email,password}` → `{access_token,token_type,expires_in_minutes}`; 401 on bad credentials |
| GET `/auth/me`, GET `/users/me` | current user + profile |
| PATCH `/users/me` | `full_name, headline, education_level, university, weekly_hours, target_role_id, clear_target_role` |
| DELETE `/users/me` | deletes account and all data (204) |
| POST `/resumes/upload` | multipart `file` (+ optional `replace_resume_id`); PDF/DOCX ≤ `MAX_UPLOAD_MB`; 422 with a helpful message on bad/encrypted/empty/scanned files |
| GET `/resumes`, GET `/resumes/{id}` | history; detail includes text preview, sections, skills |
| POST `/resumes/{id}/analyze` | re-run extraction (manual edits kept) |
| PATCH `/resumes/{id}/skills` | `{add:[],remove:[],restore:[]}` manual correction |
| DELETE `/resumes/{id}` | removes file + data |
| GET `/roles` | `q, category, skill, page, page_size` |
| GET `/roles/compare?ids=1,2[,3,4]` | skills side by side, shared skills, your match scores |
| GET `/roles/{id}`, GET `/roles/{id}/skills` | detail + resources + disclaimer / weighted skills |
| POST `/skill-gap/analyze` | `{role_id, resume_id?, extra_skills?}` → full analysis (persisted) |
| GET `/skill-gap/history`, GET `/skill-gap/{id}` | saved analyses |
| POST `/roadmaps/generate` | `{role_id, duration_days: 30|60|90, analysis_id?, resume_id?, replace_roadmap_id?}` |
| GET `/roadmaps`, GET `/roadmaps/{id}` | `status=active|archived` filter; detail has items |
| PATCH `/roadmaps/{id}` | `{title?, status?}`; DELETE `/roadmaps/{id}` |
| GET `/progress/summary` | totals, completion %, completed/remaining skills, weekly (8) and monthly (6) series |
| GET `/progress/items` | `roadmap_id, status, page, page_size` (default: active roadmap) |
| PATCH `/progress/items/{id}` | `{status?, progress_pct?, notes?, target_date?, clear_target_date?}`; 422 if inconsistent |
| GET `/progress/history` | change log |
| GET `/dashboard/summary` | everything the dashboard shows |
| GET `/health` (public) | `{status:"ok"}` |

Errors use `{"detail": "..."}` (422 validation errors list `msg` per field). Unknown/other users' records return 404; missing/invalid/expired token 401; rate limit 429.

`/auth/refresh` is not implemented (single access-token flow; the UI redirects to login on expiry).
