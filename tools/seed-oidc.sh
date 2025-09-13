#!/usr/bin/env bash
set -euo pipefail

# Seed or update OIDC issuer/audience in system_config for local dev.
# Defaults mirror Traefik local routing so tokens validated through Traefik pass.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCHEME=${SCHEME:-http}
HOST=${HOST:-api.local.clanboards.test}
PORT=${PORT:-80}
AUDIENCE=${AUDIENCE:-clanboards-mobile}

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

ISSUER=${ISSUER:-"$(default_issuer "$SCHEME" "$HOST" "$PORT")"}

echo "[seed-oidc] Using issuer=$ISSUER audience=$AUDIENCE" >&2

# Ensure DB is up
"$ROOT_DIR/tools/local-db.sh" up >/dev/null
"$ROOT_DIR/tools/local-db.sh" wait >/dev/null

sql=$(cat <<SQL
DELETE FROM system_config WHERE key IN ('oidc.issuer','oidc.audience');
INSERT INTO system_config(key,value,description) VALUES ('oidc.issuer','${ISSUER}','OIDC Issuer base URL');
INSERT INTO system_config(key,value,description) VALUES ('oidc.audience','${AUDIENCE}','OIDC Audience');
SQL
)

"$ROOT_DIR/tools/local-db.sh" psql "$sql"
echo "[seed-oidc] Upsert complete." >&2
