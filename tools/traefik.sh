#!/usr/bin/env bash
set -euo pipefail

# Manage a local Traefik reverse proxy in Docker to mirror ALB routing

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME=${CONTAINER_NAME:-coc-traefik-local}
IMAGE=${IMAGE:-traefik:v3.0}

usage() {
  cat <<EOF
Usage: tools/traefik.sh <command>

Commands:
  up        Start Traefik on :80 with config from traefik/
  down      Stop and remove the Traefik container
  logs      Tail logs (set FOLLOW=1 to follow)
  status    Show container status

Notes:
  - Routes mirror the ALB: API at Host(api.local.clanboards.test) by path, app at Host(local.clanboards.test).
  - Add to /etc/hosts for browser testing:
      127.0.0.1 local.clanboards.test
      127.0.0.1 api.local.clanboards.test
  - For CLI smoke tests, use: curl -H "Host: api.local.clanboards.test" http://localhost/...
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
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER_NAME" \
    -p 80:80 \
    -v "$ROOT_DIR/traefik/traefik.yml:/etc/traefik/traefik.yml:ro" \
    -v "$ROOT_DIR/traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro" \
    "$IMAGE"
  echo "Started $CONTAINER_NAME (Traefik on :80)"
}

cmd_down() {
  require_docker
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  echo "Stopped $CONTAINER_NAME"
}

cmd_logs() {
  require_docker
  if [ -n "${FOLLOW:-}" ]; then
    docker logs -f "$CONTAINER_NAME"
  else
    docker logs --tail 200 "$CONTAINER_NAME"
  fi
}

cmd_status() {
  require_docker
  docker ps -a --filter "name=${CONTAINER_NAME}"
}

main() {
  case "${1:-}" in
    up) cmd_up ;;
    down) cmd_down ;;
    logs) cmd_logs ;;
    status) cmd_status ;;
    -h|--help|help|"") usage ;;
    *) echo "Unknown command: $1" >&2; usage; exit 1 ;;
  esac
}

main "$@"

