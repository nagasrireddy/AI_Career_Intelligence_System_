#!/usr/bin/env bash
# Starts backend (http://localhost:8000) and frontend (http://localhost:5173) dev servers. Ctrl+C stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$ROOT/backend/.venv" ] && [ -d "$ROOT/frontend/node_modules" ] || { echo "Run ./scripts/setup.sh first." >&2; exit 1; }

cd "$ROOT/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000 &
BACK=$!
cd "$ROOT/frontend"
npm run dev &
FRONT=$!
trap 'kill $BACK $FRONT 2>/dev/null || true' EXIT INT TERM
echo
echo "Frontend : http://localhost:5173"
echo "Backend  : http://localhost:8000"
echo "API docs : http://localhost:8000/docs"
wait
