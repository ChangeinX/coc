#!/usr/bin/env bash
set -euo pipefail

# Local Postgres + Alembic migration helper
# This script intentionally does NOT modify default Flask dev-db behavior.
# It runs migrations against a local Docker Postgres by overriding DATABASE_URL
# only for the migration command it executes.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/tools/local-postgres/docker-compose.yml"

# Defaults (can be overridden via env or flags)
: "${DB_USER:=coc}"
: "${DB_PASSWORD:=coc}"
: "${DB_NAME:=coc_local}"
: "${DB_PORT:=5433}"
: "${CONTAINER_NAME:=coc-postgres-local}"

DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"

# Detect docker compose (v2+ preferred)
compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo "error: docker compose not found. Install Docker Desktop or docker-compose." >&2
    exit 1
  fi
}

DC="$(compose_cmd)"

usage() {
  cat <<EOF
Usage: tools/local-db.sh <command>

Commands:
  up           Start local Postgres container (detached)
  down         Stop container (preserve data volume)
  destroy      Stop and remove container + volume
  status       Show container status
  logs         Tail Postgres logs
  psql         Open psql shell in the container
  url          Print the DATABASE_URL for local Postgres
  wait         Wait until Postgres is healthy
  migrate      Run Alembic migrations against local Postgres
  reset        Destroy + re-up + migrate (fresh DB)

Environment overrides:
  DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, CONTAINER_NAME

Examples:
  tools/local-db.sh up
  tools/local-db.sh migrate
  tools/local-db.sh psql

Note: This does not change your default dev database configuration.
      It only sets DATABASE_URL for the migration command it runs.
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker not found in PATH" >&2
    exit 1
  fi
}

export_compose_env() {
  export DB_USER DB_PASSWORD DB_NAME DB_PORT CONTAINER_NAME
}

cmd_up() {
  require_docker
  export_compose_env
  ${DC} -f "$COMPOSE_FILE" up -d
}

cmd_down() {
  require_docker
  export_compose_env
  ${DC} -f "$COMPOSE_FILE" down
}

cmd_destroy() {
  require_docker
  export_compose_env
  ${DC} -f "$COMPOSE_FILE" down -v
}

cmd_status() {
  require_docker
  docker ps -a --filter "name=${CONTAINER_NAME}"
}

cmd_logs() {
  require_docker
  local tail_n
  tail_n="${LOG_TAIL:-100}"
  if [ -n "${FOLLOW:-}" ]; then
    docker logs --tail "$tail_n" -f "$CONTAINER_NAME"
  else
    docker logs --tail "$tail_n" "$CONTAINER_NAME"
  fi
}

cmd_psql() {
  require_docker
  if [ $# -gt 0 ]; then
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "$*"
  else
    docker exec -it "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
  fi
}

cmd_url() {
  echo "$DATABASE_URL"
}

cmd_wait() {
  require_docker
  echo "Waiting for Postgres (${CONTAINER_NAME}) to become healthy..." >&2
  for i in {1..60}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      echo "Postgres is ready." >&2
      return 0
    fi
    sleep 1
  done
  echo "error: Postgres did not become ready in time" >&2
  exit 1
}

cmd_migrate() {
  # Ensure container is running and healthy, then run Alembic migrations
  cmd_up
  cmd_wait

  # Ensure a Python 3.11 venv with required deps is available
  (
    cd "$ROOT_DIR"
    if [ -d .venv-db ]; then
      : # reuse existing venv
    else
      if command -v uv >/dev/null 2>&1 && command -v python3.11 >/dev/null 2>&1; then
        echo "[uv] creating 3.11 venv and installing migration deps" >&2
        uv venv -p 3.11 .venv-db >/dev/null
        # shellcheck disable=SC1091
        source .venv-db/bin/activate
        uv pip install flask flask_sqlalchemy flask_migrate flask_caching flask_apscheduler python-dotenv psycopg2-binary >/dev/null
      elif command -v python3.11 >/dev/null 2>&1; then
        echo "[venv] creating 3.11 venv and installing migration deps" >&2
        python3.11 -m venv .venv-db || true
        # shellcheck disable=SC1091
        source .venv-db/bin/activate || true
        pip install --upgrade pip >/dev/null 2>&1 || true
        pip install flask flask_sqlalchemy flask_migrate flask_caching flask_apscheduler python-dotenv psycopg2-binary >/dev/null 2>&1 || true
      else
        echo "warning: python3.11 not found; attempting to use system python3 for migrations" >&2
      fi
    fi

    echo "Running Alembic migrations against: $DATABASE_URL" >&2
    # shellcheck disable=SC1091
    [ -f .venv-db/bin/activate ] && source .venv-db/bin/activate
    APP_ENV=dev \
    FLASK_APP=db.app \
    DATABASE_URL="$DATABASE_URL" \
    PYTHONPATH="$ROOT_DIR" \
    python3 -m flask db upgrade
  )
}

cmd_reset() {
  cmd_destroy
  cmd_migrate
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    up)       cmd_up ;;
    down)     cmd_down ;;
    destroy)  cmd_destroy ;;
    status)   cmd_status ;;
    logs)     cmd_logs ;;
    psql)     shift; cmd_psql "$@" ;;
    url)      cmd_url ;;
    wait)     cmd_wait ;;
    migrate)  cmd_migrate ;;
    reset)    cmd_reset ;;
    -h|--help|help|"") usage ;;
    *) echo "Unknown command: $cmd" >&2; usage; exit 1 ;;
  esac
}

main "$@"
