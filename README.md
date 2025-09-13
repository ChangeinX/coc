# Clash of Clans Dashboard

[![Build and Deploy](https://github.com/ChangeinX/coc/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/ChangeinX/coc/actions/workflows/deploy.yml)

Modernized monorepo for the Clan Boards project. The stack has shifted to Java microservices and a mobile‑first client. The legacy Flask API has been archived.

## Repository Layout
- `front-end/mobile/` – React Native app (Expo). Primary client going forward.
- `front-end/app/` – Vite React web dashboard. Maintained but PWA behavior is deprecated.
- `front-end/public-home/` – Minimal Next.js public site (legal/policy pages).
- `messages-java/` – Chat service (Spring Boot, REST + WebSocket + GraphQL).
- `user_service/` – User/friends + auth issuer (Spring Boot, OIDC provider).
- `notifications/` – Push notifications (Spring Boot).
- `recruiting/` – Recruiting feed/service (Spring Boot).
- `clash-data/` – Clash data APIs (Spring Boot; players, wars, assets, etc.).
- `lambdas/` – Serverless functions: `refresh-worker` (Python) and `dynamodb-to-sqs.js`.
- `coclib/` – Shared Python library (models, utils) used by migrations and tooling.
- `db/` – Minimal Flask app used solely to run Alembic migrations; also holds `messages.graphql` schema.
- `migrations/` – Alembic migration scripts.
- `archived/back-end/` – Legacy Flask API (no longer active). Kept for reference only.

See AGENTS.md files within each folder for project‑specific notes.

## Authentication (Current)
- OIDC issuer: `user_service` (Spring Boot) issues RS256 JWTs for mobile/web.
- Zero‑HTTP JWKS: Services validate tokens using JWKS stored in the database (`system_config`) instead of HTTP calls.
- Mobile (iOS first): native Sign in with Apple; Android planned via hosted UI + PKCE. Token storage uses SecureStore/Keychain.
- Web: migrates toward OIDC with the same issuer; PWA‑specific auth is removed.

Details and integration guidance:
- `AUTHENTICATION_INTEGRATION.md` – service‑to‑service validation (DB‑backed JWKS) and Spring setup.
- `front-end/MOBILE_AUTH_MIGRATION.md` – mobile auth flows and endpoints.
- `front-end/MOBILE_MIGRATION_PLAN.md` – broader mobile migration checklist.

## What’s Deprecated / Archived
- Flask API has been archived to `archived/back-end/` and is no longer developed.
- PWA features in the web app are deprecated; web remains for dashboard use but mobile is the primary target.

## Development
- Requirements: **Java 17 + Java 21** (managed by jenv), Node 20+, Python 3.11.
- Preferred local workflow uses fast pre‑commit checks and targeted stacks.

### Java Version Management
This project uses **jenv** for automatic Java version switching:
- **Mobile Development** (React Native/Android): Java 17 (automatically activated in `front-end/mobile/`)
- **Backend Services** (Spring Boot): Java 21 (automatically activated in root and service directories)

Setup jenv (if not already configured):
```bash
brew install jenv
# Add to ~/.zshrc: export PATH="$HOME/.jenv/bin:$PATH" && eval "$(jenv init -)"
jenv add $(/usr/libexec/java_home -v 17)
jenv add $(/usr/libexec/java_home -v 21)
```

### Quick Start
- Bootstrap everything: `make setup`
  - Installs pre‑commit hook (supports git worktrees)
  - Ensures Python 3.11 is available (via uv/brew/pyenv)
  - Installs `nox` and `ruff` via pipx when available
  - Runs `npm ci` for mobile and web (if present)
  - Exposes a local shim at `.tools/bin/python3.11` used by Make targets

### Prerequisites
- Install nox: `pipx install nox` (or `pip install nox` in a 3.11 venv)
- Optionally install ruff: `pipx install ruff` (or use `nox -s lint`)
- Java versions are managed automatically by jenv (Java 17 for mobile, Java 21 for backend)

### Makefile shortcuts
- List commands: `make help`
- Lint everything: `make lint`
- Quick check (lint + wrapper alignment): `make check`
- Run tests (Java + mobile + lambdas via nox): `make test`
- Full verify (check + tests): `make verify`
- CI-like suite: `make ci` (java, mobile, web, lambdas)
- Lambda tests only: `make lambda-test` (nox) or `make lambda-test-standalone`

### Local Development
Start the complete local development stack including Traefik reverse proxy:
- `make local-up` - Start Traefik, PostgreSQL, migrate DB, launch user_service, seed OIDC config, run smoke tests
- `make local-down` - Stop all services cleanly (preserves data)
- `make local-destroy` - Stop all services and remove data volumes

Services are available at:
- API endpoints: `http://api.local.clanboards.test` (via Traefik proxy)
- Direct service access: `http://localhost:8020` (user_service)
- Traefik dashboard: `http://localhost:8080` (when enabled in config)

The local stack includes:
- Traefik reverse proxy (Docker container on port 80)
- PostgreSQL database (Docker container on port 5433)
- user_service (Spring Boot on port 8020)
- Automatic OIDC configuration seeding for local development

Individual component control is still available via `traefik-up/down`, `local-db-up/down`, etc.

### Troubleshooting

**Android Build Issues:**
- If `npm run android` fails with `ClassNotFoundException: org.gradle.wrapper.GradleWrapperMain`, the Gradle wrapper JAR is missing
- Restore missing wrapper: Download from `https://github.com/gradle/gradle/raw/v8.14.3/gradle/wrapper/gradle-wrapper.jar` to `front-end/mobile/android/gradle/wrapper/`
- Verify Java 17 is active: `cd front-end/mobile && java -version`

**Java Version Issues:**
- If builds fail with wrong Java version, verify jenv is working: `jenv versions`
- Reset Java for directory: `jenv local 17` (mobile) or `jenv local 21` (backend)
- Check jenv is in PATH: `echo $PATH | grep jenv`

Common tasks:
- Install pre‑commit hook: `bash tools/setup-git-hooks.sh` (see toggles in `tools/hooks/pre-commit`).
- Lint and run tests (nox convenience): `nox -s lint tests`.
- Python lint (focused): `ruff coclib db lambdas/refresh-worker`.
- Mobile app: `cd front-end/mobile && npm ci && npm run lint && npm run typecheck && npm test`.
- Web app (optional): `cd front-end/app && npm ci && npm test && npm run build`.

Notes:
- The `db/` app exists only to run Alembic migrations; do not add application logic there.
- `messages.graphql` (GraphQL schema for chat) lives in `db/messages.graphql`.

### Lambdas
- `lambdas/refresh-worker/` (Python 3.11): processes background refresh queue; includes `package-lambda.sh` and `DEPLOYMENT.md` for OpenTofu/AWS deployment.
  - With nox (runs lambda tests): `nox -s tests`
  - Without nox (manual):
    - `cd lambdas/refresh-worker`
    - `python -m venv .venv && source .venv/bin/activate`
    - `pip install -r requirements-test.txt`
    - `PYTHONPATH=../../ pytest -v test_lambda_function.py`
- `lambdas/dynamodb-to-sqs.js` (Node): streams DynamoDB changes to SQS.

## CI Overview
- Parallel jobs per stack: Python lint, Lambdas tests, front‑end (web/mobile), and a Java matrix (including `java-auth-common`).
- Java modules run `spotlessCheck` and `test` with Gradle caching; `coc-py/:coc-java` is published to `mavenLocal` as needed.
- The `nox` driver is retained for local convenience; CI orchestrates jobs directly with path filters to skip unaffected stacks.
 - Tip (local Gradle): if you hit home-directory restrictions, set `export GRADLE_USER_HOME=$(pwd)/.gradle` before running wrapper commands.

### Gradle consistency
- All Java modules use the Gradle Wrapper and are pinned to the same distribution (8.14.3). Avoid the global `gradle` CLI to prevent wrapper changes or version drift. Dockerfiles have been updated to use the wrapper.

Note on web tests: The web app uses Vitest and does not support Jest’s `--ci` flag. The Makefile sets `CI=1` but does not pass `--ci` to web tests.

## Auth Migration Status
- Mobile auth migration plan (`front-end/MOBILE_AUTH_MIGRATION.md`) is essentially complete. Remaining work is for services to adopt the DB‑backed JWKS validation as specified in `AUTHENTICATION_INTEGRATION.md`.

## Clash of Clans Assets
Clan and player records are stored exactly as returned by the official API. Icon URLs (e.g., clan badges, league emblems) are read directly from stored JSON. Refer to Supercell’s documentation for object schemas and image sizes.

## Legal
This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.
