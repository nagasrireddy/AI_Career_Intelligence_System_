#!/usr/bin/env bash
# Runs backend (pytest), frontend (vitest), lint, and a production build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend" && source .venv/bin/activate && python -m pytest -q
cd "$ROOT/frontend" && npm run lint && npm test && npm run build
echo "All checks passed."
