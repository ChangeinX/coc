#!/usr/bin/env bash
set -euo pipefail

# Quick launcher for messages-java with optional local Postgres + migrations and OIDC seeding.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE_SERVICE="$ROOT_DIR/messages-java/.env"
ENV_FILE_ROOT="$ROOT_DIR/.env.messages-java"
SERVICE_DIR="$ROOT_DIR/messages-java"
GRADLEW_MODULE="$SERVICE_DIR/gradlew"
DEV_DIR="$SERVICE_DIR/.dev"
PID_FILE="$DEV_DIR/app.pid"
LOG_FILE="$DEV_DIR/app.log"

WITH_DB=0
SKIP_DB=0
BACKGROUND=0

# Optional args for one-time secret setup and URL overrides
OPENAI_KEY_ARG=""
PERSPECTIVE_KEY_ARG=""
CHAT_TABLE_ARG=""
BASE_URL_ARG=""
ISSUER_ARG=""

usage() {
  cat <<EOF
Usage: tools/run-messages-service.sh [--with-db] [--skip-db] [--background] [stop|destroy] [--] [extra-gradle-args...]

Options:
  --with-db     Ensure local Postgres is up and run migrations (tools/local-db.sh), start Traefik + user_service, seed OIDC config
  --skip-db     Do not attempt DB startup/migrations
  --background  Run the service in background (PID at messages-java/.dev/app.pid)
  --openai-key <k>        Bootstrap and persist OpenAI key (one-time)
  --perspective-key <k>   Bootstrap and persist Perspective key (one-time)
  --chat-table <name>     Bootstrap DynamoDB chat table name (default webapp-chat)
  --base-url <url>        Override base URL for health and websocket checks (e.g. http://api.local.clanboards.test)
  --issuer <url>          Override issuer for DB seed and token minting
  -h, --help    Show this help

Commands:
  stop        Stop a background instance if running
  destroy     Stop background instance and optionally destroy DB (with --with-db)
  status      Show service status (PID/port)
  logs        Tail service logs (messages-java/.dev/app.log)

Behavior:
  - Exports env from messages-java/.env (preferred) or .env.messages-java if present
  - Defaults REDIS_URL to redis://localhost:6379 unless set
  - Sets SERVER_PORT to Dockerfile port (8010) unless set
  - Sets GRADLE_USER_HOME to module-local .gradle
  - Runs module task: "bootRun"
  - With --with-db: starts local Postgres, runs Alembic migrations, and seeds required OIDC config
EOF
}

ACTION="run"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-db) WITH_DB=1; shift ;;
    --skip-db) SKIP_DB=1; shift ;;
    --background) BACKGROUND=1; shift ;;
    stop|destroy|status|logs) ACTION="$1"; shift ;;
    --openai-key) OPENAI_KEY_ARG="$2"; shift 2 ;;
    --perspective-key) PERSPECTIVE_KEY_ARG="$2"; shift 2 ;;
    --chat-table) CHAT_TABLE_ARG="$2"; shift 2 ;;
    --base-url) BASE_URL_ARG="$2"; shift 2 ;;
    --issuer) ISSUER_ARG="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    *) break ;;
  esac
done

log() { printf "[messages-java] %s\n" "$*" >&2; }

require_gradlew() {
  if [[ ! -x "$GRADLEW_MODULE" ]]; then
    log "gradlew not found at $GRADLEW_MODULE"
    exit 1
  fi
}

check_java() {
  if ! command -v java >/dev/null 2>&1; then
    log "Java not found in PATH (need JDK 21)"
    exit 1
  fi
  local ver
  ver=$(java -version 2>&1 | head -n1)
  if [[ "$ver" != *"21"* ]]; then
    log "Warning: expected JDK 21, detected: $ver"
  fi
}

load_env() {
  set -a
  if [[ -f "$ENV_FILE_SERVICE" ]]; then
    log "Loading env: messages-java/.env"
    # shellcheck disable=SC1090
    source "$ENV_FILE_SERVICE"
  elif [[ -f "$ENV_FILE_ROOT" ]]; then
    log "Loading env: .env.messages-java"
    # shellcheck disable=SC1090
    source "$ENV_FILE_ROOT"
  else
    log "No env file found (messages-java/.env or .env.messages-java). Proceeding with process env."
  fi

  # Defaults for local dev if not provided
  : "${AWS_REGION:=us-east-1}"
  export AWS_REGION

  # Default local port to match Dockerfile unless overridden
  if [[ -z "${SERVER_PORT:-}" ]]; then
    export SERVER_PORT=8010
  fi
  set +a
}

ensure_dirs() {
  mkdir -p "$DEV_DIR"
}

ensure_db() {
  if (( SKIP_DB == 1 )); then
    return 0
  fi
  if (( WITH_DB == 1 )); then
    log "Ensuring local Postgres is up and migrated..."
    "$ROOT_DIR/tools/local-db.sh" up
    "$ROOT_DIR/tools/local-db.sh" migrate
    if [[ -z "${DATABASE_URL:-}" ]]; then
      DATABASE_URL=$("$ROOT_DIR/tools/local-db.sh" url)
      export DATABASE_URL
      log "Using DATABASE_URL: $DATABASE_URL"
    fi
  else
    if [[ -z "${DATABASE_URL:-}" ]]; then
      log "Warning: DATABASE_URL not set. H2 in-memory will be used, but OIDC config is loaded from DB and service may fail to start. Use --with-db for local Postgres."
    fi
  fi
}

# Ensure Traefik reverse proxy is up (port 80)
ensure_traefik() {
  log "Ensuring Traefik is up on :80..."
  "$ROOT_DIR/tools/traefik.sh" up >/dev/null 2>&1 || true
  # Wait for container to report Up state
  for i in {1..20}; do
    if docker ps --filter "name=coc-traefik-local" --filter "status=running" --format '{{.Names}}' | grep -q '^coc-traefik-local$'; then
      log "Traefik container is running"
      # Also test that Traefik is responding on port 80
      for j in {1..10}; do
        if curl -fsS -H "Host: api.local.clanboards.test" http://localhost/ >/dev/null 2>&1 || curl -fsS http://localhost/ >/dev/null 2>&1; then
          log "Traefik is responding on port 80"
          return 0
        fi
        sleep 1
      done
      log "Warning: Traefik container running but not responding on port 80"
      return 0
    fi
    sleep 1
  done
  log "Warning: Traefik container did not start in time"
}

# Bring up local Redis if REDIS_URL points to localhost or is unset
ensure_redis() {
  local url_default
  url_default=$("$ROOT_DIR/tools/local-redis.sh" url)
  if [[ -z "${REDIS_URL:-}" || "$REDIS_URL" == "redis://localhost:"* ]]; then
    log "Ensuring local Redis is up..."
    "$ROOT_DIR/tools/local-redis.sh" up
    if [[ -z "${REDIS_URL:-}" ]]; then
      export REDIS_URL="$url_default"
      log "Using REDIS_URL: $REDIS_URL"
    fi
  fi
}

# One-time secrets setup (prompt once, store under messages-java/.dev/secrets.env)
ensure_secrets() {
  local secrets_file="$DEV_DIR/secrets.env"
  mkdir -p "$DEV_DIR"
  if [[ -f "$secrets_file" ]]; then
    # shellcheck disable=SC1090
    source "$secrets_file"
  fi

  local changed=0
  # Prefer explicit flags if provided
  if [[ -n "$OPENAI_KEY_ARG" ]]; then OPENAI_API_KEY="$OPENAI_KEY_ARG"; changed=1; fi
  if [[ -n "$PERSPECTIVE_KEY_ARG" ]]; then PERSPECTIVE_API_KEY="$PERSPECTIVE_KEY_ARG"; changed=1; fi
  if [[ -n "$CHAT_TABLE_ARG" ]]; then CHAT_TABLE="$CHAT_TABLE_ARG"; changed=1; fi

  if [[ -z "${PERSPECTIVE_API_KEY:-}" ]]; then
    if [[ -t 0 ]]; then
      read -rp "Perspective API key: " PERSPECTIVE_API_KEY
      changed=1
    else
      log "PERSPECTIVE_API_KEY not set; skipping prompt (non-interactive shell)"
    fi
  fi
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    if [[ -t 0 ]]; then
      read -rp "OpenAI API key: " OPENAI_API_KEY
      changed=1
    else
      log "OPENAI_API_KEY not set; skipping prompt (non-interactive shell)"
    fi
  fi
  # Map to Spring property chat.table via env var translation
  if [[ -z "${CHAT_TABLE:-}" && -z "${DYNAMODB_CHAT_TABLE:-}" ]]; then
    if [[ -t 0 ]]; then
      read -rp "DynamoDB chat table name [webapp-chat]: " CHAT_TABLE
      CHAT_TABLE=${CHAT_TABLE:-webapp-chat}
      changed=1
    else
      CHAT_TABLE=${CHAT_TABLE:-webapp-chat}
    fi
  fi
  # If DYNAMODB_CHAT_TABLE provided, prefer that as CHAT_TABLE
  if [[ -n "${DYNAMODB_CHAT_TABLE:-}" && -z "${CHAT_TABLE:-}" ]]; then
    CHAT_TABLE="$DYNAMODB_CHAT_TABLE"
  fi

  export PERSPECTIVE_API_KEY OPENAI_API_KEY CHAT_TABLE

  if (( changed == 1 )); then
    {
      echo "PERSPECTIVE_API_KEY=${PERSPECTIVE_API_KEY:-}"
      echo "OPENAI_API_KEY=${OPENAI_API_KEY:-}"
      echo "CHAT_TABLE=${CHAT_TABLE:-}"
    } > "$secrets_file"
    chmod 600 "$secrets_file"
    log "Saved secrets to $secrets_file (gitignored)"
  fi
}

# Kill any process bound to SERVER_PORT (force cleanup)
kill_hanging_port() {
  local port="$1"
  log "Checking for any processes on port $port..."
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    log "Found processes on port $port: $pids"
    for pid in $pids; do
      if ps -p "$pid" >/dev/null 2>&1; then
        log "Force killing process: $pid"
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
    done
    sleep 1
  else
    log "No processes using port $port"
  fi
}

wait_for_http() {
  local url="$1" timeout="${2:-60}" i
  for ((i=0;i<timeout;i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

db_get_config() {
  local key="$1"
  "$ROOT_DIR/tools/local-db.sh" psql "SELECT value FROM system_config WHERE key='${key}' LIMIT 1;" 2>/dev/null | tr -d '\r' | awk 'NF{print $0}' | tail -n1 | tr -d '\n' || true
}

verify_service() {
  # Only run verification for background mode where service is detached
  local direct_base="http://localhost:${SERVER_PORT}"
  log "Waiting for health at: ${direct_base}/api/v1/health"
  if ! wait_for_http "${direct_base}/api/v1/health" 90; then
    log "Service did not become healthy in time; logs: $LOG_FILE"
    tail -n 200 "$LOG_FILE" || true
    return 1
  fi
  log "Health OK"

  log "Checking SockJS info endpoint..."
  if curl -fsS -H "Host: api.local.clanboards.test" "http://localhost/api/v1/chat/socket/info" >/dev/null 2>&1; then
    log "SockJS info OK"
  else
    log "Warning: SockJS info endpoint not reachable"
  fi

  # Acquire issuer from discovery via Traefik (ensures host match)
  local issuer
  issuer=$(curl -fsS -H "Host: api.local.clanboards.test" http://localhost/api/v1/users/.well-known/openid-configuration 2>/dev/null | python3 -c 'import sys, json; data = sys.stdin.read().strip(); print(json.loads(data).get("issuer","") if data else "")' 2>/dev/null || true)
  if [[ -z "$issuer" && -n "$ISSUER_ARG" ]]; then issuer="$ISSUER_ARG"; fi
  if [[ -z "$issuer" ]]; then
    log "Warning: could not determine issuer; skipping authenticated GraphQL/WebSocket checks"
    return 0
  fi
  log "Issuer from discovery: $issuer"

  local access
  if access=$("$ROOT_DIR/tools/get-apple-token.sh" --issuer "$issuer" --field access 2>/dev/null); then
    :
  else
    log "Warning: Could not mint test token (get-apple-token.sh). Ensure dev key exists or run user_service. Skipping auth check."
    return 0
  fi

  log "Running authenticated GraphQL check (listChats)..."
  local gql
  gql='{"query":"query { listChats { id } }"}'
  if curl -fsS -H "Host: api.local.clanboards.test" -H "Authorization: Bearer $access" -H 'Content-Type: application/json' \
      -d "$gql" "http://localhost/api/v1/chat/graphql" >/dev/null; then
    log "GraphQL auth OK"
  else
    log "Warning: Authenticated GraphQL request failed"
  fi

  # Attempt minimal STOMP over WebSocket handshake against SockJS websocket transport path
  # This is best-effort and will be skipped if Node is unavailable.
  if command -v node >/dev/null 2>&1; then
    # Derive ws URL from base_url (http->ws, https->wss)
    local ws_url="ws://localhost/api/v1/chat/socket/000/000/websocket"
    log "Attempting STOMP CONNECT over WebSocket: $ws_url"
    node - <<'NODE' "$ws_url" "$access" 2>/dev/null || true
const wsUrl = process.argv[1];
const token = process.argv[2];
let WebSocketImpl;
try { WebSocketImpl = require('ws'); } catch (e) { WebSocketImpl = global.WebSocket; }
if (!WebSocketImpl) process.exit(0);
const ws = new WebSocketImpl(wsUrl, { headers: { Host: 'api.local.clanboards.test' } });
let done = false;
const timer = setTimeout(() => { if (!done) { try { ws.close(); } catch {} process.exit(0); } }, 3000);
ws.on('open', () => {
  const frame = [
    'CONNECT',
    'accept-version:1.2',
    'host:localhost',
    `Authorization: Bearer ${token}`,
    '',
    '\u0000',
  ].join('\n');
  ws.send(frame);
});
ws.on('message', (data) => {
  done = true; clearTimeout(timer);
  try { if (ws && ws.readyState === 1) ws.close(); } catch {}
  process.exit(0);
});
ws.on('error', () => { done = true; clearTimeout(timer); process.exit(0); });
NODE
  else
    log "Node not available; skipping WebSocket STOMP check"
  fi
}

# Seed OIDC config via helper (Traefik host) and ensure user_service picks it up
seed_oidc_config() {
  if (( WITH_DB != 1 )); then
    return 0
  fi
  ensure_traefik
  log "Seeding OIDC config in DB for Traefik host..."
  "$ROOT_DIR/tools/seed-oidc.sh"
}

# After seeding, refresh user_service OIDC configuration to pick up DB values
refresh_user_service_oidc() {
  if (( WITH_DB != 1 )); then
    return 0
  fi
  log "Refreshing user_service OIDC configuration via Traefik..."
  local ok=0
  for i in {1..30}; do
    if curl -fsS -X POST -H "Host: api.local.clanboards.test" http://localhost/api/v1/health/oidc/refresh >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 1
  done
  if [[ $ok -eq 1 ]]; then
    log "user_service OIDC refresh OK"
  else
    log "Warning: failed to refresh user_service OIDC configuration after retries"
  fi
}

# Start user_service (dependency for JWKS publication and token minting)
ensure_user_service() {
  if (( WITH_DB == 1 )); then
    ensure_traefik
    log "Starting user_service in background for JWKS and token minting..."
    # Ensure port free
    kill_hanging_port 8020
    # Reuse DB already up; start user_service without DB orchestration
    local us_args=(--skip-db --background)
    "$ROOT_DIR/tools/run-user-service.sh" "${us_args[@]}" || true

    # First wait for direct health/discovery on 8020
    local direct_disc="http://localhost:8020/api/v1/users/.well-known/openid-configuration"
    log "Waiting for user_service discovery (direct): $direct_disc"
    if ! wait_for_http "$direct_disc" 90; then
      log "Warning: user_service did not become healthy in time (direct)"
    fi
    # Then wait for routed discovery via Traefik
    local disc_url="http://localhost/api/v1/users/.well-known/openid-configuration"
    log "Waiting for user_service discovery at (Traefik): $disc_url"
    for i in {1..90}; do
      if curl -fsS -H "Host: api.local.clanboards.test" "$disc_url" >/dev/null 2>&1; then
        log "user_service discovery OK via Traefik"
        break
      fi
      sleep 1
      if [[ $i -eq 90 ]]; then
        log "Warning: user_service did not become healthy in time via Traefik; continuing"
      fi
    done
  fi
}

main() {
  require_gradlew
  check_java
  ensure_dirs

  if [[ "$ACTION" == "stop" ]]; then
    if [[ -f "$PID_FILE" ]]; then
      PID=$(cat "$PID_FILE" || true)
      if [[ -n "${PID:-}" ]] && kill -0 "$PID" >/dev/null 2>&1; then
        log "Stopping messages-java (PID $PID)"
        kill "$PID" || true
      fi
      rm -f "$PID_FILE"
    else
      log "No PID file found; is the service running in background?"
    fi
    # Also free the port (8010)
    kill_hanging_port 8010
    exit 0
  fi

  if [[ "$ACTION" == "destroy" ]]; then
    # Stop if running
    "$0" stop || true
    # Stop user_service as well
    "$ROOT_DIR/tools/run-user-service.sh" stop || true
    # Optionally destroy DB when --with-db is supplied
    if (( WITH_DB == 1 )); then
      log "Destroying local Postgres (and volume)"
      "$ROOT_DIR/tools/local-db.sh" destroy || true
    fi
    exit 0
  fi

  if [[ "$ACTION" == "status" ]]; then
    echo "PID file: $PID_FILE"
    if [[ -f "$PID_FILE" ]]; then
      echo "- PID: $(cat "$PID_FILE" || true)"
    else
      echo "- Not running (no PID file)"
    fi
    echo "Port usage (\$SERVER_PORT or default 8010):"
    local p=${SERVER_PORT:-8010}
    lsof -iTCP:"$p" -sTCP:LISTEN -nP 2>/dev/null || true
    exit 0
  fi

  if [[ "$ACTION" == "logs" ]]; then
    if [[ -f "$LOG_FILE" ]]; then
      tail -n 200 -f "$LOG_FILE"
    else
      echo "No log file at $LOG_FILE yet. Start with --background first."
    fi
    exit 0
  fi

  load_env
  ensure_db
  ensure_redis
  ensure_secrets
  ensure_user_service
  seed_oidc_config
  refresh_user_service_oidc

  export GRADLE_USER_HOME="$SERVICE_DIR/.gradle"
  # Proactively free the port before starting
  kill_hanging_port "$SERVER_PORT"
  if (( BACKGROUND == 1 )); then
    log "Starting messages-java in background... (logs: $LOG_FILE)"
    (cd "$SERVICE_DIR" && nohup ./gradlew bootRun --no-daemon >"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE")
    sleep 1
    if [[ -s "$PID_FILE" ]]; then
      log "Started with PID $(cat "$PID_FILE")"
      verify_service
    else
      log "Failed to start; check $LOG_FILE"
      exit 1
    fi
  else
    log "Starting messages-java via module Gradle wrapper..."
    (cd "$SERVICE_DIR" && ./gradlew bootRun --no-daemon "$@")
  fi
}

main "$@"
