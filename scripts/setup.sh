#!/usr/bin/env bash
# One-time setup for macOS / Linux: venv, dependencies, .env files, DB init + seed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' is not installed. $2" >&2; exit 1; }; }
PY=python3; command -v python3 >/dev/null 2>&1 || PY=python
need "$PY" "Install Python 3.10+ from https://www.python.org/downloads/"
need node "Install Node.js 18+ (LTS) from https://nodejs.org/"
need npm "npm ships with Node.js: https://nodejs.org/"
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' || { echo "ERROR: Python 3.10+ required." >&2; exit 1; }
node -e 'process.exit(parseInt(process.versions.node)>=18?0:1)' || { echo "ERROR: Node.js 18+ required." >&2; exit 1; }

echo "==> Backend setup"
cd "$ROOT/backend"
[ -d .venv ] || "$PY" -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
  KEY="$("$PY" -c 'import secrets; print(secrets.token_urlsafe(48))')"
  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$KEY|" .env && rm -f .env.bak
  echo "Created backend/.env with a freshly generated SECRET_KEY"
fi
mkdir -p data/uploads
python -m app.db.seed

echo "==> Frontend setup"
cd "$ROOT/frontend"
[ -f .env ] || cp .env.example .env
npm install --no-audit --no-fund

echo
echo "Setup complete. Start the app with:  ./scripts/start.sh"
