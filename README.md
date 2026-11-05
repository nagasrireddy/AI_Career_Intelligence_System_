# AI Career Intelligence System

Full-stack capstone application that analyzes a resume, scores it against illustrative job-role profiles, builds a prerequisite-aware learning roadmap, and tracks progress.

* **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Axios + Recharts + Lucide + React Hook Form
* **Backend:** FastAPI + SQLAlchemy 2 + Pydantic 2 + JWT (PyJWT) + bcrypt + PyMuPDF + python-docx + scikit-learn
* **Database:** SQLite (zero setup); PostgreSQL-ready through `DATABASE_URL`
* **No paid service or API key is needed.** Skill extraction is dictionary and pattern matching (see *Honest scope*).

| What | URL |
|---|---|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger / OpenAPI docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

## Quick start

Prerequisites: **Python 3.10+** and **Node.js 18+** (the scripts check and tell you what is missing).

### Windows 10/11 (PowerShell)
```powershell
cd ai-career-intelligence
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1     # once: venv, deps, .env, DB + seed
powershell -ExecutionPolicy Bypass -File scripts\start.ps1     # opens backend + frontend windows
```
Then open http://localhost:5173 and register an account.

### macOS / Linux
```bash
cd ai-career-intelligence
./scripts/setup.sh
./scripts/start.sh
```

### Manual steps (any OS)
```bash
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows   |   source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env   (then set SECRET_KEY)
python -m app.db.seed           # creates tables + seeds roles/resources (safe to repeat)
python -m uvicorn app.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
cp .env.example .env            # VITE_API_URL=http://localhost:8000/api/v1
npm install
npm run dev
```
The backend also initializes and seeds the database automatically on startup (idempotent).

## Using the app
1. Register → log in. 2. **Resume Analysis**: upload a text-based PDF/DOCX; review detected skills, add/remove skills. 3. **Job Roles**: browse, search, compare, set a target. 4. **Skill-Gap Analysis**: run it and read the score explanation. 5. **Learning Roadmap**: pick 30/60/90 days, generate; regenerate any time (completed items are preserved). 6. **Progress**: update status, percentage, notes, dates. The **Dashboard** reads everything live from the database.

## Configuration (`backend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | dev placeholder | JWT signing key. **Must be changed in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Token lifetime |
| `DATABASE_URL` | `sqlite:///./data/app.db` | e.g. `postgresql+psycopg://user:pass@host/db` (install `psycopg[binary]`) |
| `CORS_ORIGINS` | localhost:5173 | Comma-separated allow-list |
| `MAX_UPLOAD_MB` | 5 | Resume size limit |
| `UPLOAD_DIR` | `./data/uploads` | Private upload directory (not served statically) |
| `RATE_LIMIT_AUTH_PER_MIN` / `RATE_LIMIT_UPLOAD_PER_MIN` | 10 | Per-IP limits (`0` disables) |

Generate a secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"` (the setup scripts do this for you).
Frontend: `frontend/.env` → `VITE_API_URL`.

## Testing
```bash
./scripts/test.sh                      # macOS/Linux: pytest + eslint + vitest + build
powershell -File scripts\test.ps1      # Windows
# or individually
cd backend && python -m pytest -q
cd frontend && npm run lint && npm test && npm run build
```
Tests use temporary SQLite databases and upload folders; real data is never touched. See `docs/TESTING_REPORT.md`.

## Production build & deployment
```bash
cd frontend && VITE_API_URL=https://api.example.com/api/v1 npm run build     # static files in frontend/dist
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```
Checklist: strong `SECRET_KEY`; `CORS_ORIGINS` = your real frontend origin; HTTPS terminated by a reverse proxy (nginx/Caddy); persistent volume for `data/`; consider PostgreSQL and a shared rate-limiter (Redis) when running several workers; add Alembic migrations before changing the schema in production (currently `create_all` initialization, documented in `docs/ARCHITECTURE.md`).

**Optional Docker:** `echo SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))") > .env && docker compose up --build` → frontend http://localhost:8080, backend http://localhost:8000. (Docker files are provided but were **not** executed in the build environment.)

## Troubleshooting
| Symptom | Fix |
|---|---|
| `python`/`node` not found | Install Python 3.10+ / Node 18+ and reopen the terminal (Windows: tick *Add to PATH*) |
| PowerShell blocks scripts | Use `-ExecutionPolicy Bypass` as shown, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `pip install` fails building PyMuPDF/scikit-learn | Upgrade pip (`python -m pip install -U pip`); use Python 3.10–3.12 (wheels exist) |
| Browser shows "Cannot reach the server" | Backend not running, or `VITE_API_URL`/`CORS_ORIGINS` mismatch (restart Vite after editing `.env`) |
| Port in use | Change `--port` and `VITE_API_URL`, or stop the other process |
| "Session expired" | Tokens last `ACCESS_TOKEN_EXPIRE_MINUTES`; log in again |
| Upload rejected "No readable text" | The PDF is scanned/image-only; OCR is not included. Use a text-based PDF/DOCX |
| Reset all data | Stop the backend, delete `backend/data/app.db` and `backend/data/uploads/` |

## Honest scope
* Skill detection is a **configurable dictionary + regex pipeline** (`backend/app/ai/taxonomy.py`), not a trained deep-learning model. Confidence values are a documented heuristic.
* Role profiles are **illustrative and editable** (`backend/app/db/seed_data.py`), not real hiring requirements. Scores are educational estimates, never hiring probabilities.
* Resource URLs are curated official/free pages but **could not be link-checked** in the build sandbox. Run `python scripts/check_links.py` with internet access. See `docs/KNOWN_LIMITATIONS.md`.

## Repository layout
```
backend/app/{api,core,db,models,schemas,services,ai}   backend/tests
frontend/src/{api,components,context,hooks,layouts,pages,routes,utils,test}
scripts/  docs/  docker-compose.yml  README.md
```
