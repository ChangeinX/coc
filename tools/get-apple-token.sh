#!/usr/bin/env bash
set -euo pipefail

# Local Apple-style OIDC token helper (dev only).
# - Prompts once for a username/password and stores them at user_service/.dev/token.env
# - Signs RS256 JWTs with the dev private key at user_service/dev-keys/oidc-private-key.pem
# - Produces access_token and id_token compatible with BearerTokenFilter (iss/aud/kid)
# - Does NOT talk to Apple; this is a local dev convenience only.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/user_service/.dev"
DEV_ENV="$DEV_DIR/token.env"
DEV_KEY_DEFAULT="$ROOT_DIR/user_service/dev-keys/oidc-private-key.pem"

# Defaults to Traefik entrypoint mirroring ALB locally
SCHEME=${SCHEME:-http}
HOST=${HOST:-api.local.clanboards.test}
PORT=${PORT:-80}

default_issuer() {
  local scheme="$1" host="$2" port="$3"
  if [[ "$scheme" == "http" && "$port" == "80" ]]; then
    printf '%s://%s/api/v1/users' "$scheme" "$host"
  elif [[ "$scheme" == "https" && "$port" == "443" ]]; then
    printf '%s://%s/api/v1/users' "$scheme" "$host"
  else
    printf '%s://%s:%s/api/v1/users' "$scheme" "$host" "$port"
  fi
}

ISSUER_DEFAULT="$(default_issuer "$SCHEME" "$HOST" "$PORT")"
ISSUER=${OIDC_ISSUER:-$ISSUER_DEFAULT}
AUDIENCE=${OIDC_AUDIENCE:-clanboards-mobile}
KID=${OIDC_KID:-dev-1}
KEY_FILE=${OIDC_PRIVATE_KEY_PEM_FILE:-$DEV_KEY_DEFAULT}
TTL_SECONDS=${TTL_SECONDS:-3600}
FIELD=""
AS_JSON=0

usage() {
  cat <<EOF
Usage: tools/get-apple-token.sh [options]

Options:
  --scheme <http|https> Default: http
  --host <host>         Default: api.local.clanboards.test
  --port <port>         Default: 80
  --issuer <url>        Default: derived from scheme/host/port (or OIDC_ISSUER)
  --aud <audience>    Default: clanboards-mobile (or OIDC_AUDIENCE)
  --kid <kid>         Default: dev-1 (or OIDC_KID)
  --ttl <seconds>     Default: 3600
  --field <f>         Print only: access | id | expires | user_id
  --json              Print full JSON response
  -h, --help          Show this help

This is a local dev helper that mints RS256 tokens using the dev private key.
It includes a userId claim derived from your credentials for proper authentication.
It stores DEV_APPLE_USERNAME/DEV_APPLE_PASSWORD in user_service/.dev/token.env on first run.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scheme) SCHEME="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --issuer) ISSUER="$2"; shift 2 ;;
    --aud) AUDIENCE="$2"; shift 2 ;;
    --kid) KID="$2"; shift 2 ;;
    --ttl) TTL_SECONDS="$2"; shift 2 ;;
    --field) FIELD="$2"; shift 2 ;;
    --json) AS_JSON=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

mkdir -p "$DEV_DIR"

if [[ ! -f "$DEV_ENV" ]]; then
  echo "First-time setup: collecting local dev identity for Apple-style token" >&2
  read -rp "Apple dev username (email): " u
  read -rsp "Apple dev password (stored locally): " p; echo
  {
    echo "DEV_APPLE_USERNAME=${u}"
    echo "DEV_APPLE_PASSWORD=${p}"
  } > "$DEV_ENV"
  chmod 600 "$DEV_ENV"
  echo "Saved to $DEV_ENV (gitignored)" >&2
fi

# shellcheck disable=SC1090
source "$DEV_ENV"

hash_sha256_hex() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | awk '{print $1}'
  else
    printf '%s' "$1" | openssl dgst -sha256 -hex | awk '{print $2}'
  fi
}

base64url() {
  # stdin -> base64url (no padding, single line)
  base64 | tr -d '\n' | tr '+/' '-_' | tr -d '='
}

sign_rs256() {
  local input="$1" key="$2"
  printf '%s' "$input" | openssl dgst -sha256 -sign "$key" -binary | base64url
}

ensure_key() {
  if [[ -n "${OIDC_PRIVATE_KEY_PEM:-}" ]]; then
    # Materialize to a temp file if provided via env
    KEY_FILE=$(mktemp)
    printf '%s' "$OIDC_PRIVATE_KEY_PEM" > "$KEY_FILE"
    trap 'rm -f "$KEY_FILE"' EXIT
  fi
  if [[ ! -f "$KEY_FILE" ]]; then
    echo "error: private key not found at $KEY_FILE" >&2
    echo "hint: run make local-up to generate dev keys, or set OIDC_PRIVATE_KEY_PEM_FILE" >&2
    exit 1
  fi
}

# Derive stable identity
ensure_key
SUB_PREFIX="apple"
SUB_HASH=$(hash_sha256_hex "${DEV_APPLE_USERNAME}:${DEV_APPLE_PASSWORD}")
SUB="${SUB_PREFIX}:${SUB_HASH}"
NOW=$(date +%s)
EXP=$((NOW + TTL_SECONDS))

# Create a stable user ID from the credentials (for dev purposes)
USER_ID=$(hash_sha256_hex "${DEV_APPLE_USERNAME}:${DEV_APPLE_PASSWORD}" | head -c 8)
USER_ID=$((16#$USER_ID))  # Convert hex to decimal

echo "Using dev user ID: $USER_ID (derived from credentials)" >&2

header=$(printf '{"alg":"RS256","kid":"%s","typ":"JWT"}' "$KID")
payload_access=$(printf '{"iss":"%s","aud":"%s","sub":"%s","userId":%d,"iat":%d,"exp":%d}' "$ISSUER" "$AUDIENCE" "$SUB" "$USER_ID" "$NOW" "$EXP")
payload_id=$(printf '{"iss":"%s","aud":"%s","sub":"%s","userId":%d,"iat":%d,"exp":%d}' "$ISSUER" "$AUDIENCE" "$SUB" "$USER_ID" "$NOW" "$EXP")

h64=$(printf '%s' "$header" | base64url)
p64a=$(printf '%s' "$payload_access" | base64url)
p64i=$(printf '%s' "$payload_id" | base64url)

sig_a=$(sign_rs256 "$h64.$p64a" "$KEY_FILE")
sig_i=$(sign_rs256 "$h64.$p64i" "$KEY_FILE")

ACCESS_TOKEN="$h64.$p64a.$sig_a"
ID_TOKEN="$h64.$p64i.$sig_i"

if [[ $AS_JSON -eq 1 ]]; then
  printf '{"access_token":"%s","id_token":"%s","token_type":"Bearer","expires_in":%d,"user_id":%d}\n' "$ACCESS_TOKEN" "$ID_TOKEN" "$TTL_SECONDS" "$USER_ID"
  exit 0
fi

if [[ -n "$FIELD" ]]; then
  case "$FIELD" in
    access) printf '%s\n' "$ACCESS_TOKEN" ;;
    id)     printf '%s\n' "$ID_TOKEN" ;;
    expires) printf '%s\n' "$TTL_SECONDS" ;;
    user_id) printf '%s\n' "$USER_ID" ;;
    *) echo "unknown field: $FIELD" >&2; exit 1 ;;
  esac
  exit 0
fi

echo "access_token:  $ACCESS_TOKEN"
echo "id_token:      $ID_TOKEN"
echo "expires_in:    $TTL_SECONDS"
echo "user_id:       $USER_ID"
