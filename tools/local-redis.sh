#!/usr/bin/env bash
set -euo pipefail

# Local Redis helper using Docker (no auth, dev only)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${REDIS_PORT:=6379}"
: "${CONTAINER_NAME:=coc-redis-local}"
: "${IMAGE:=redis:7-alpine}"

usage() {
  cat <<EOF
Usage: tools/local-redis.sh <command>

Commands:
  up        Start local Redis container (detached)
  down      Stop container (preserve data)
  destroy   Stop and remove container
  status    Show container status
  logs      Tail Redis logs (env LOG_TAIL, FOLLOW=1 to follow)
  cli       Open redis-cli in the container
  url       Print the REDIS_URL for local Redis

Environment overrides: REDIS_PORT, CONTAINER_NAME, IMAGE
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker not found in PATH" >&2
    exit 1
  fi
}

cmd_up() {
  require_docker
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker start "$CONTAINER_NAME" >/dev/null
  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p "${REDIS_PORT}:6379" \
      "$IMAGE" >/dev/null
  fi
}

cmd_down() {
  require_docker
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

cmd_destroy() {
  require_docker
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
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

cmd_cli() {
  require_docker
  docker exec -it "$CONTAINER_NAME" redis-cli "$@"
}

cmd_url() {
  echo "redis://localhost:${REDIS_PORT}"
}

main() {
  case "${1:-}" in
    up) cmd_up ;;
    down) cmd_down ;;
    destroy) cmd_destroy ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    cli) shift; cmd_cli "$@" ;;
    url) cmd_url ;;
    -h|--help|help|"") usage ;;
    *) echo "Unknown command: $1" >&2; usage; exit 1 ;;
  esac
}

main "$@"

