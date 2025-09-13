#!/usr/bin/env bash
set -euo pipefail

# Service manager for rapid local development testing
# Supports restart, rebuild, and reload operations on individual or all services

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# All available Java services
ALL_SERVICES=(user_service messages-java notifications recruiting clash-data)

# Services that have runner scripts (actively used in local dev)
ACTIVE_SERVICES=(user_service messages-java)

usage() {
  cat <<EOF
Usage: tools/service-manager.sh <action> [options]

Actions:
  restart     Stop and start services without rebuilding
  rebuild     Rebuild services without restarting
  reload      Rebuild and restart services (most common)
  status      Show status of all services

Options:
  --service <name>    Target specific service (default: all active services)
  --all              Target all services including inactive ones
  --help             Show this help

Available services:
  Active (with runners): ${ACTIVE_SERVICES[*]}
  All: ${ALL_SERVICES[*]}

Examples:
  tools/service-manager.sh restart --service user_service
  tools/service-manager.sh reload --service messages-java
  tools/service-manager.sh restart
  tools/service-manager.sh status
EOF
}

log() { printf "[service-manager] %s\n" "$*" >&2; }

# Check if a service is currently running
is_service_running() {
  local service="$1"
  local pid_file="$ROOT_DIR/$service/.dev/app.pid"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file" 2>/dev/null || echo "")
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Get the runner script for a service
get_runner_script() {
  local service="$1"
  case "$service" in
    user_service) echo "$ROOT_DIR/tools/run-user-service.sh" ;;
    messages-java) echo "$ROOT_DIR/tools/run-messages-service.sh" ;;
    *) return 1 ;;
  esac
}

# Check if service has a runner script
has_runner_script() {
  local service="$1"
  get_runner_script "$service" >/dev/null 2>&1
}

# Rebuild a Java service
rebuild_service() {
  local service="$1"
  local service_dir="$ROOT_DIR/$service"

  if [[ ! -d "$service_dir" ]]; then
    log "Error: Service directory not found: $service_dir"
    return 1
  fi

  if [[ ! -f "$service_dir/build.gradle" ]]; then
    log "Error: Not a Java service (no build.gradle): $service"
    return 1
  fi

  log "Rebuilding $service..."
  (
    cd "$service_dir"
    export GRADLE_USER_HOME="$ROOT_DIR/.gradle"
    ./gradlew --no-daemon -q build -x test
  )
}

# Restart a service
restart_service() {
  local service="$1"

  if ! has_runner_script "$service"; then
    log "Warning: No runner script for $service, skipping restart"
    return 0
  fi

  local runner_script
  runner_script=$(get_runner_script "$service")

  log "Restarting $service..."

  # Stop the service
  "$runner_script" stop || true

  # Wait a moment for cleanup
  sleep 1

  # Start the service based on its type
  case "$service" in
    user_service)
      # Export DATABASE_URL for user_service
      export DATABASE_URL=$("$ROOT_DIR/tools/local-db.sh" url 2>/dev/null || echo "")
      "$runner_script" --skip-db --background
      ;;
    messages-java)
      # Export DATABASE_URL for messages-java
      export DATABASE_URL=$("$ROOT_DIR/tools/local-db.sh" url 2>/dev/null || echo "")
      "$runner_script" --skip-db --background
      ;;
    *)
      log "Warning: Unknown service startup pattern for $service"
      return 1
      ;;
  esac

  # Wait for service to be healthy
  wait_for_service_health "$service"
}

# Wait for a service to become healthy
wait_for_service_health() {
  local service="$1"
  local timeout=30

  case "$service" in
    user_service)
      local url="http://localhost:8020/api/v1/users/.well-known/openid-configuration"
      ;;
    messages-java)
      local url="http://localhost:8010/api/v1/health"
      ;;
    *)
      log "No health check configured for $service"
      return 0
      ;;
  esac

  log "Waiting for $service to be healthy..."
  for ((i=0;i<timeout;i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$service is healthy"
      return 0
    fi
    sleep 1
  done

  log "Warning: $service did not become healthy within ${timeout}s"
  return 1
}

# Show status of all services
show_status() {
  echo "Service Status:"
  echo "==============="

  for service in "${ALL_SERVICES[@]}"; do
    printf "%-15s " "$service:"
    if is_service_running "$service"; then
      local pid_file="$ROOT_DIR/$service/.dev/app.pid"
      local pid
      pid=$(cat "$pid_file" 2>/dev/null || echo "unknown")
      echo "RUNNING (PID: $pid)"
    else
      echo "STOPPED"
    fi
  done

  echo
  echo "Active services (with runners): ${ACTIVE_SERVICES[*]}"
  echo "All services: ${ALL_SERVICES[*]}"
}

# Main action handlers
cmd_restart() {
  local services=("$@")
  for service in "${services[@]}"; do
    if is_service_running "$service"; then
      restart_service "$service"
    else
      log "Service $service is not running, skipping restart"
    fi
  done
}

cmd_rebuild() {
  local services=("$@")
  for service in "${services[@]}"; do
    rebuild_service "$service"
  done
}

cmd_reload() {
  local services=("$@")
  # First rebuild all requested services
  for service in "${services[@]}"; do
    rebuild_service "$service"
  done
  # Then restart only running services
  for service in "${services[@]}"; do
    if is_service_running "$service"; then
      restart_service "$service"
    else
      log "Service $service is not running, skipping restart after rebuild"
    fi
  done
}

# Parse command line arguments
ACTION=""
TARGET_SERVICES=()
USE_ALL_SERVICES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    restart|rebuild|reload|status)
      ACTION="$1"
      shift
      ;;
    --service)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --service requires a service name" >&2
        exit 1
      fi
      TARGET_SERVICES+=("$2")
      shift 2
      ;;
    --all)
      USE_ALL_SERVICES=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

# Validate action
if [[ -z "$ACTION" ]]; then
  echo "Error: No action specified" >&2
  usage
  exit 1
fi

# Determine target services
if [[ ${#TARGET_SERVICES[@]} -eq 0 ]]; then
  if [[ "$USE_ALL_SERVICES" == "true" ]]; then
    TARGET_SERVICES=("${ALL_SERVICES[@]}")
  else
    TARGET_SERVICES=("${ACTIVE_SERVICES[@]}")
  fi
fi

# Validate target services
for service in "${TARGET_SERVICES[@]}"; do
  found=false
  for valid_service in "${ALL_SERVICES[@]}"; do
    if [[ "$service" == "$valid_service" ]]; then
      found=true
      break
    fi
  done
  if [[ "$found" != "true" ]]; then
    echo "Error: Unknown service: $service" >&2
    echo "Available services: ${ALL_SERVICES[*]}" >&2
    exit 1
  fi
done

# Execute action
case "$ACTION" in
  restart)
    log "Restarting services: ${TARGET_SERVICES[*]}"
    cmd_restart "${TARGET_SERVICES[@]}"
    ;;
  rebuild)
    log "Rebuilding services: ${TARGET_SERVICES[*]}"
    cmd_rebuild "${TARGET_SERVICES[@]}"
    ;;
  reload)
    log "Reloading (rebuild + restart) services: ${TARGET_SERVICES[*]}"
    cmd_reload "${TARGET_SERVICES[@]}"
    ;;
  status)
    show_status
    ;;
esac

log "Operation completed"