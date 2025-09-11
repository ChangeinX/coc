# Codex Guidelines

This monorepo hosts several microservices and a front-end that make up a Clash of Clans dashboard. The key directories are:

- `back-end/` – Flask API service, generic routes
- `front-end/app/` – React dashboard built with Vite
- `coclib/` – shared Python modules for the project
- `db/` – minimal Flask app used solely for running migrations. Also holds graphql schema for messages.
- `migrations/` – Alembic migration scripts
- `messages-java/` - Chat service implemented in Spring Boot
- `user_service/` - Friend service implemented in Spring Boot
- `notifications/` - Notifications service implemented in Spring Boot
- `recruiting/` - Recruiting service implemented in Spring Boot
- `lambdas/` - Lambdas for notifications from DynamoDB

Each directory contains its own `AGENTS.md` with project specific notes. Check those files when working in a subfolder.

## Crawling the codebase
- Shared models and utilities reside in `coclib`.
- Database migrations are stored in the `migrations` directory at the repo root.

## Testing and checks

Validate changes using:

```bash
# Lint and run tests with Nox
nox -s lint tests

# Lint Python sources manually if needed
ruff back-end coclib db

# Install deps and run front-end tests and build
cd front-end/app
npm install
npm test
npm run build
```

Any lint errors or build failures should fail the PR.

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

## Development notes

- Keep shared logic in `coclib` rather than duplicating it in other projects.
- Dockerfiles expect Python 3.11 and Node 18+.
- Follow Ruff's default style rules for Python code.
- This is a living document. Update it if anything is incorrect or needs updating.
