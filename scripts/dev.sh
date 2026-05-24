#!/usr/bin/env bash
# Start local dev stack: Postgres (Docker), API, background worker, web frontend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDS=()
NO_DOCKER=false
STOP_DOCKER=false
WITH_ADMIN=false

usage() {
  cat <<'EOF'
Usage: scripts/dev.sh [options]

Starts docker compose (Postgres), then uvicorn, the Postgres worker, and the web frontend.

Options:
  --no-docker       Skip docker compose (infra already running)
  --down-on-exit    Run "docker compose down" when the script exits
  --admin           Also start the admin dashboard (frontend_admin) on port 3001
  -h, --help        Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-docker) NO_DOCKER=true; shift ;;
    --down-on-exit) STOP_DOCKER=true; shift ;;
    --admin) WITH_ADMIN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

VENV="$ROOT/backend/.venv/bin/activate"
if [[ ! -f "$VENV" ]]; then
  echo "Error: backend/.venv not found." >&2
  echo "  cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
  exit 1
fi

if [[ ! -f "$ROOT/backend/.env" ]]; then
  echo "Warning: backend/.env missing — copy backend/.env.example to backend/.env" >&2
fi

if [[ ! -d "$ROOT/frontend_web/node_modules" ]]; then
  echo "Warning: frontend_web/node_modules missing — run: cd frontend_web && npm install" >&2
fi

if $WITH_ADMIN && [[ ! -d "$ROOT/frontend_admin/node_modules" ]]; then
  echo "Warning: frontend_admin/node_modules missing — run: cd frontend_admin && npm install" >&2
fi

cleanup() {
  echo
  echo "Stopping dev processes..."
  for pid in "${PIDS[@]}"; do
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  if $STOP_DOCKER; then
    echo "Stopping Docker services..."
    docker compose down
  fi
}
trap cleanup EXIT INT TERM

start_service() {
  local tag=$1 dir=$2
  shift 2
  setsid bash -c '
    tag=$1; dir=$2; venv=$3
    shift 3
    cd "$dir" || exit 1
    # shellcheck source=/dev/null
    source "$venv"
    exec > >(sed -u "s/^/[$tag] /") 2>&1
    exec "$@"
  ' _ "$tag" "$dir" "$VENV" "$@" &
  PIDS+=("$!")
}

start_frontend() {
  local tag=$1 dir=$2
  setsid bash -c '
    cd "$1" || exit 1
    exec > >(sed -u "s/^/['"$tag"'] /") 2>&1
    exec npm run dev
  ' _ "$dir" &
  PIDS+=("$!")
}

if ! $NO_DOCKER; then
  echo "Starting Postgres (docker compose)..."
  if docker compose up -d --wait 2>/dev/null; then
    :
  else
    echo "  (--wait not supported; starting without health wait)"
    docker compose up -d
    echo "  Waiting for Postgres..."
    until docker compose exec -T postgres pg_isready -U aethespeech -d aethespeech >/dev/null 2>&1; do
      sleep 1
    done
  fi
fi

echo "Starting API (uvicorn) on http://0.0.0.0:8000 ..."
start_service api "$ROOT/backend" uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo "Starting background worker (python -m worker)..."
start_service worker "$ROOT/backend" python -m worker

echo "Starting web frontend (Vite) on http://localhost:3000 ..."
start_frontend web "$ROOT/frontend_web"

if $WITH_ADMIN; then
  echo "Starting admin dashboard (Vite) on http://localhost:3001 ..."
  start_frontend admin "$ROOT/frontend_admin"
fi

echo
echo "Dev stack running. Press Ctrl+C to stop app processes."
echo "  API:      http://localhost:8000"
echo "  Web UI:   http://localhost:3000"
if $WITH_ADMIN; then
  echo "  Admin UI: http://localhost:3001"
fi
if $STOP_DOCKER; then
  echo "  Docker will be stopped on exit (--down-on-exit)."
else
  echo "  Docker keeps running; use --down-on-exit to stop containers too."
fi
echo

wait
