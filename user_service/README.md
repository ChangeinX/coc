User Service (Spring Boot)

Local development quickstart for the Clan Boards user service (OIDC + friends).

Prerequisites
- JDK 21 in PATH (`java -version` shows 21.x)
- Docker (optional, for local Postgres)
- Python 3.11 (only if you plan to run DB migrations via the helper)

Overview
- Defaults use H2 in‑memory when `DATABASE_URL` is not set, but schema is managed via Alembic migrations. For realistic local runs, use the provided local Postgres + migrations helper.
- JWT session cookies use HS256. Provide a strong `JWT_SIGNING_KEY` (>= 32 bytes) or startup will fail.
- OIDC signing uses RS256. If `OIDC_PRIVATE_KEY_PEM` is not provided, a temporary keypair is generated per startup (good for local only). JWKS is published to the DB at key `oidc.jwks`.

Environment configuration
1) Copy the example env and adjust values:

   cp user_service/.env.example user_service/.env

   Important notes:
   - `JWT_SIGNING_KEY` must be a strong secret (32+ characters).
   - For non‑HTTPS localhost testing, set `COOKIE_SECURE=false` so the browser accepts the cookie.
   - To provide a real RS256 private key, either set `OIDC_PRIVATE_KEY_PEM` directly or point `OIDC_PRIVATE_KEY_PEM_FILE` at a PEM file; the launcher script will read it.

2) Optional: Local Postgres + migrations
   - Start a local Postgres and migrate schema:

     tools/local-db.sh up
     tools/local-db.sh migrate

   - Export `DATABASE_URL` for the app or put it in `user_service/.env`. You can print the URL with:

     tools/local-db.sh url

Run the service
- Fast path (recommended):

  make local-up

  This will:
  - Start local Postgres and apply migrations
  - Generate a stable RS256 dev key at `user_service/dev-keys/oidc-private-key.pem` if missing
  - Ensure a strong `JWT_SIGNING_KEY` and create `user_service/.env` if missing
  - Launch the service in the background and run smoke tests
  - Seed the `system_config.oidc.jwks` row if missing

  Stop or destroy:

  - `make local-down`      Stop service and DB (data preserved)
  - `make local-destroy`   Stop, remove dev key, and destroy DB volume

- Manual commands (from repo root):

  export GRADLE_USER_HOME="$(pwd)/.gradle"
  SERVER_PORT=8020 ./gradlew :user_service:bootRun

Key environment variables
- `JWT_SIGNING_KEY` (required): HS256 secret for session cookie tokens (32+ bytes)
- `COOKIE_SECURE` (recommended for local): set `false` for HTTP localhost
- `COOKIE_DOMAIN` (optional): domain for the `sid` cookie
- `SESSION_MAX_AGE` (optional): seconds, defaults to 604800
- `DATABASE_URL` (optional): Postgres URL; if unset, H2 in‑memory is used (requires schema to exist, so prefer Postgres + migrations)
- `DATABASE_USERNAME`, `DATABASE_PASSWORD` (optional): override credentials if not embedded in `DATABASE_URL`
- `OIDC_ISSUER` (optional): defaults to `http://api.local.clanboards.test/api/v1/users`
- `OIDC_AUDIENCE` (optional): defaults to `clanboards-mobile`
- `OIDC_KID` (optional): key id, defaults to `dev-1`
- `OIDC_PRIVATE_KEY_PEM` (optional): PEM (PKCS#8) for RS256 signing
- `OIDC_PRIVATE_KEY_PEM_FILE` (optional): path to PEM; launcher sets `OIDC_PRIVATE_KEY_PEM` from it. A stable dev PEM is auto-created at `user_service/dev-keys/oidc-private-key.pem`.
- `AWS_REGION` (optional): defaults to `us-east-1` (only needed if integrating with AWS Secrets Manager)

Common endpoints (default port 8020)
- `GET http://localhost:8020/api/v1/users/.well-known/openid-configuration` – OIDC discovery
- `GET http://localhost:8020/api/v1/users/oauth2/jwks.json` – JWKS (public keys)
- `POST http://localhost:8020/api/v1/auth/session` – Issue a local session cookie from an external `idToken` (dev flow)

Troubleshooting
- WeakKeyException during startup: set a longer `JWT_SIGNING_KEY` (>= 32 chars)
- Cookie not set on localhost: set `COOKIE_SECURE=false`
- Table not found errors: ensure Postgres is running and migrations were applied (`tools/local-db.sh migrate`) and `DATABASE_URL` is exported/sourced
- Gradle cannot download dependencies: ensure network access and JDK 21 are available

Make targets
- `make local-up` starts DB, migrates, generates stable keys, seeds JWKS, runs smoke tests, and starts service.
- `make local-down` stops service and DB (keeps data).
- `make local-destroy` stops service, removes dev keys, and destroys DB volume.

Get a token locally
- Apple-style local token helper (dev only, no Apple network calls):

  tools/get-apple-token.sh --json

  On first run, it prompts for a username and password and stores them in `user_service/.dev/token.env` (gitignored) to derive a stable subject. It signs RS256 tokens with the local dev private key, matching the service’s OIDC issuer and audience.

  Print a specific token field:

  tools/get-apple-token.sh --field access

  Options: `--host`, `--port` (default 8020), `--issuer`, `--aud`, `--kid`, `--ttl`, `--json`, `--field <access|id|expires>`.
