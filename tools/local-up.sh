#!/usr/bin/env bash
set -euo pipefail

# Orchestrates a local dev stack (user_service + messages-java + local DB).
# Extensible: add more services in future phases.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME=${CONTAINER_NAME:-coc-postgres-local}
DB_USER=${DB_USER:-coc}
DB_PASSWORD=${DB_PASSWORD:-coc}
DB_NAME=${DB_NAME:-coc_local}
DB_PORT=${DB_PORT:-5433}

usage() {
  cat <<EOF
Usage: tools/local-up.sh <command>

Commands:
  up        Start DB, run migrations, start user_service + messages-java (background), seed OIDC (Traefik), restart, smoke via Traefik
  down      Stop all services and stop DB (preserve data)
  destroy   Stop all services, remove dev keys, destroy DB + volume
  smoke     Run smoke tests against running services
  status    Show DB container status and service PIDs

Environment overrides (DB): CONTAINER_NAME, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
EOF
}

log() { printf "[local-up] %s\n" "$*" >&2; }

user_service_pidfile="$ROOT_DIR/user_service/.dev/app.pid"
messages_service_pidfile="$ROOT_DIR/messages-java/.dev/app.pid"

wait_for_http() {
  local url="$1"; local timeout="${2:-30}"; local i
  for ((i=0;i<timeout;i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

psql_exec() {
  docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$CONTAINER_NAME" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -t -A -c "$1"
}

cmd_up() {
  log "Starting local Postgres and applying migrations..."
  "$ROOT_DIR/tools/local-db.sh" up
  # Initialize migrations if the repo doesn't have them yet (safety)
  if [[ ! -d "$ROOT_DIR/migrations" || ! -d "$ROOT_DIR/migrations/versions" ]]; then
    log "Initializing Alembic migrations from scratch..."
    (cd "$ROOT_DIR" && APP_ENV=dev FLASK_APP=db.app DATABASE_URL=$("$ROOT_DIR/tools/local-db.sh" url) PYTHONPATH="$ROOT_DIR" python3 -m flask db init || true)
  fi
  "$ROOT_DIR/tools/local-db.sh" migrate

  log "Starting user_service in background..."
  "$ROOT_DIR/tools/run-user-service.sh" --with-db --background

  log "Waiting for user_service to be healthy..."
  if ! wait_for_http "http://localhost:8020/api/v1/users/.well-known/openid-configuration" 60; then
    echo "Service did not become healthy in time; logs:" >&2
    tail -n 200 "$ROOT_DIR/user_service/.dev/app.log" || true
    exit 1
  fi

  log "Seeding OIDC config in DB for Traefik host..."
  "$ROOT_DIR/tools/seed-oidc.sh"

  log "Clearing OIDC env overrides from user_service/.env (if present)"
  if [[ -f "$ROOT_DIR/user_service/.env" ]]; then
    sed -i.bak "/^OIDC_ISSUER=/d;/^OIDC_AUDIENCE=/d" "$ROOT_DIR/user_service/.env" || true
  fi

  log "Restarting user_service to pick up DB OIDC config..."
  "$ROOT_DIR/tools/run-user-service.sh" stop || true
  "$ROOT_DIR/tools/run-user-service.sh" --with-db --background
  if ! wait_for_http "http://localhost:8020/api/v1/users/.well-known/openid-configuration" 60; then
    echo "Service did not become healthy in time after restart; logs:" >&2
    tail -n 200 "$ROOT_DIR/user_service/.dev/app.log" || true
    exit 1
  fi
  
  log "Verifying OIDC configuration loaded from DB..."
  # Wait for OIDC health endpoint to be available (service should be rebuilt with new code)
  if ! wait_for_http "http://localhost:8020/api/v1/health/oidc" 30; then
    echo "OIDC health endpoint not available after service restart; logs:" >&2
    tail -n 200 "$ROOT_DIR/user_service/.dev/app.log" || true
    exit 1
  fi
  
  log "Refreshing OIDC configuration to ensure DB values are loaded..."
  if ! curl -fsS -X POST "http://localhost:8020/api/v1/health/oidc/refresh"; then
    echo "Failed to trigger OIDC refresh - this indicates the service is not running with the latest code" >&2
    tail -n 200 "$ROOT_DIR/user_service/.dev/app.log" || true
    exit 1
  fi

  log "Starting messages-java service in background..."
  # Export DATABASE_URL for messages-java since it uses --skip-db
  export DATABASE_URL=$("$ROOT_DIR/tools/local-db.sh" url)
  "$ROOT_DIR/tools/run-messages-service.sh" --skip-db --background

  log "Waiting for messages-java to be healthy..."
  if ! wait_for_http "http://localhost:8010/api/v1/health" 90; then
    echo "messages-java did not become healthy in time; logs:" >&2
    tail -n 200 "$ROOT_DIR/messages-java/.dev/app.log" || true
    exit 1
  fi

  cmd_smoke
}

cmd_down() {
  log "Stopping services (messages-java, user_service) and DB (preserve data)"
  "$ROOT_DIR/tools/run-messages-service.sh" stop || true
  "$ROOT_DIR/tools/run-user-service.sh" stop || true
  "$ROOT_DIR/tools/local-db.sh" down || true
}

cmd_destroy() {
  log "Destroying local stack (services, keys, DB volume)"
  "$ROOT_DIR/tools/run-messages-service.sh" destroy --with-db || true
}

cmd_smoke() {
  log "Running smoke tests..."
  # 0) Check current OIDC configuration
  log "Current OIDC configuration:"
  if ! curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/health/oidc; then
    echo "Failed to get OIDC configuration via Traefik" >&2
    return 1
  fi
  # 1) OIDC discovery via Traefik
  curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/users/.well-known/openid-configuration >/dev/null
  # 2) JWKS via Traefik
  curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/users/oauth2/jwks.json | grep -q '"keys"' >/dev/null
  # 3) Userinfo with a locally minted access token (issuer set to Traefik host)
  local issuer access
  issuer=$(curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/users/.well-known/openid-configuration | python3 -c 'import sys, json; print(json.load(sys.stdin).get("issuer",""))')
  log "Using issuer from discovery: $issuer"
  access=$("$ROOT_DIR/tools/get-apple-token.sh" --issuer "$issuer" --field access)
  curl -fsS -H "Authorization: Bearer $access" -H "Host: api.local.clanboards.test" http://localhost/api/v1/users/userinfo | grep -q '"sub"'
  # 4) Test messages-java SockJS endpoint via Traefik
  curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/chat/socket/info >/dev/null
  log "✅ Smoke tests passed"
}

cmd_status() {
  echo "User service PID file: $user_service_pidfile"
  if [[ -f "$user_service_pidfile" ]]; then
    pid=$(cat "$user_service_pidfile" || true)
    echo "- PID: $pid"
  else
    echo "- Not running (no PID file)"
  fi

  echo "Messages service PID file: $messages_service_pidfile"
  if [[ -f "$messages_service_pidfile" ]]; then
    pid=$(cat "$messages_service_pidfile" || true)
    echo "- PID: $pid"
  else
    echo "- Not running (no PID file)"
  fi

  echo "DB container status:"
  docker ps -a --filter "name=${CONTAINER_NAME}"
}

main() {
  case "${1:-}" in
    up) cmd_up ;;
    down) cmd_down ;;
    destroy) cmd_destroy ;;
    smoke) cmd_smoke ;;
    status) cmd_status ;;
    -h|--help|help|"") usage ;;
    *) echo "Unknown command: $1" >&2; usage; exit 1 ;;
  esac
}

main "$@"
