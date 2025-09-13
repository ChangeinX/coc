# Codex Guidelines

This monorepo hosts several Java microservices and front-end clients for the Clan Boards dashboard. The current, actively developed stack is mobile‑first. The legacy Flask API has been archived.

Key directories:

- `front-end/mobile/` – React Native app (Expo). Primary client going forward.
- `front-end/app/` – Vite React web dashboard. PWA features are obsolete; kept to reference during migration.
- `front-end/public-home/` – Minimal Next.js public site (legal/policy pages).
- `messages-java/` – Chat service (Spring Boot, REST/WebSocket/GraphQL).
- `user_service/` – User/friends + auth issuer (Spring Boot, OIDC provider).
- `notifications/` – Notifications service (Spring Boot).
- `recruiting/` – Recruiting service (Spring Boot).
- `clash-data/` – Clash data APIs (Spring Boot; players, wars, assets).
- `java-auth-common/` – Shared Java authentication library published to `mavenLocal` in CI.
- `coclib/` – Shared Python modules for migrations and tooling.
- `db/` – Minimal Flask app used only to run Alembic migrations; holds `messages.graphql` schema.
- `migrations/` – Alembic migration scripts.
- `lambdas/` – Serverless functions, including `refresh-worker` (Python 3.11) and `dynamodb-to-sqs.js`.
- `archived/back-end/` – Archived Flask API; do not modify.

Each directory may contain its own `AGENTS.md` with project‑specific notes. Check those files when working in a subfolder.

## Crawling the codebase
- Shared models and utilities reside in `coclib`.
- Database migrations are stored in the `migrations` directory at the repo root.

## Testing and checks

**TDD Workflow - Follow for ALL development:**
1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests passing

**Java Services (JUnit) - TDD Required:**
- Write JUnit tests BEFORE business logic implementation
- MockMvc for integration testing
- Gradle test runner with comprehensive coverage
- All controllers and services must have corresponding tests

Validate changes using:

```bash
# Lint and run tests with Nox (convenience wrapper; requires Python 3.11 and nox installed)
nox -s lint tests

# Lint Python sources manually if needed
ruff coclib db lambdas/refresh-worker

# Mobile app checks (Node 20+)
cd front-end/mobile
npm ci
npm run lint
npm run typecheck
npm test

# Web app (optional; PWA is obsolete)
cd ../app
npm ci
npm test
npm run build
```

Any lint errors or build failures should fail the PR.

### Makefile shortcuts
- `make help` lists available commands
- `make lint` runs Python, Java (spotless), and mobile lint/typecheck
- `make test` runs Java tests, mobile tests, and Lambda tests (via nox)
- `make lambda-test-standalone` runs Lambda tests without nox

### Lambda tests
- With nox: `nox -s tests` (executes refresh-worker tests as part of the suite)
- Without nox (manual):
  - `cd lambdas/refresh-worker`
  - `python -m venv .venv && source .venv/bin/activate` (Python 3.11)
  - `pip install -r requirements-test.txt`
  - `PYTHONPATH=../../ pytest -v test_lambda_function.py`

**Code Quality Gates:**
- **MANDATORY**: All new code must include corresponding tests
- **MANDATORY**: All PRs must pass `nox -s lint tests`
- Frontend must pass `npm test` and `npm run build`
- Mobile must pass `npm test` and `npm run typecheck` from `/front-end/mobile/`
- Java services must pass `./gradlew test spotlessCheck`
- Ruff formatting enforced for Python code
- **PRs without tests will be rejected** (except for documentation-only changes)

## CI notes

- PR CI runs jobs in parallel per stack (Python lint, Lambdas tests, front-end web/mobile, and a Java matrix including `java-auth-common`).
- Java modules run `spotlessCheck` and `test` with Gradle caching enabled. `coc-py/:coc-java` is published to `mavenLocal` in each Java job before builds.
- The old monolithic `nox` CI driver is retained for local dev convenience; CI no longer calls `nox` directly.
- Path filters skip unaffected jobs to reduce build time.

## Git hooks

- Install the fast pre-commit hook with:
  - `bash tools/setup-git-hooks.sh`
- Behavior:
  - Runs only relevant checks for staged files in parallel
  - Python: `ruff` on changed files under `coclib`, `db`, `lambdas/refresh-worker`
  - Java: `spotlessCheck` for changed modules (tests opt-in)
  - Mobile: `lint` and `typecheck` (tests opt-in)
- Opt-ins via env vars on commit:
  - `PRECOMMIT_FULL=1` use legacy `nox -s lint tests`
  - `PRECOMMIT_JAVA_TESTS=1` also run Gradle tests
  - `PRECOMMIT_MOBILE_TESTS=1` run mobile tests
  - `PRECOMMIT_APP_TESTS=1` run web app tests

## Local Development

For local development, use the integrated stack that includes Traefik reverse proxy:
- `make local-up` - Start complete local stack (Traefik + services)
- `make local-down` - Stop all services cleanly
- Services accessible via `http://api.local.clanboards.test` (Traefik routing)
- Direct access still available at `http://localhost:8020`

Troubleshooting:
- If `make local-up` fails, check Docker is running for Traefik
- Use `make traefik-logs` to debug routing issues
- Individual services can be controlled with `traefik-up/down`, `local-db-up/down`

**Android Build Issues**:
- If `npm run android` fails with `ClassNotFoundException: org.gradle.wrapper.GradleWrapperMain`, the Gradle wrapper JAR is missing
- Gradle wrapper JARs can be restored by downloading from: `https://github.com/gradle/gradle/raw/v8.14.3/gradle/wrapper/gradle-wrapper.jar`
- Ensure you're using Java 17 in the mobile directory: `cd front-end/mobile && java -version`

## Development notes

- Keep shared logic in `coclib` rather than duplicating it in other projects.
- Dockerfiles expect Python 3.11 and Node 20+.
- Follow Ruff's default style rules for Python code.
- This is a living document. Update it if anything is incorrect or needs updating.

### Java Version Management
This project uses **jenv** for automatic Java version switching:

- **Mobile Development** (React Native/Android): Java 17 (automatically activated in `front-end/mobile/`)
- **Backend Services** (Spring Boot): Java 21 (automatically activated in root and service directories)

**Setup**: jenv is configured in `~/.zshrc` and manages Java versions per directory via `.java-version` files.

**Manual Java switching** (if needed):
- `jenv local 17` - Set Java 17 for current directory
- `jenv local 21` - Set Java 21 for current directory
- `jenv versions` - List available Java versions

### Local Gradle notes
- Java versions are managed automatically by jenv. Backend services use JDK 21, mobile uses JDK 17.
- If your environment restricts `~/.gradle`, set `export GRADLE_USER_HOME=$(pwd)/.gradle` before running wrapper commands.
- Avoid the global `gradle` CLI to prevent wrapper/version drift; use the module `./gradlew` consistently.
- All modules are aligned to Gradle 8.14.3 via their wrapper properties; use `make gradle-align` to re-pin distribution URLs if needed.

## Lambdas
- `lambdas/refresh-worker/` (Python 3.11) handles background refresh queue; see `DEPLOYMENT.md` and `package-lambda.sh` for packaging and Infra‑as‑Code hooks. Tests are exercised by `nox -s tests` and can be run with `pytest` locally.
- `lambdas/dynamodb-to-sqs.js` forwards DynamoDB stream events to SQS.
