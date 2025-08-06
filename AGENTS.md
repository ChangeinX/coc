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

## Development notes

- Keep shared logic in `coclib` rather than duplicating it in other projects.
- Dockerfiles expect Python 3.11 and Node 18+.
- Follow Ruff's default style rules for Python code.
- This is a living document. Update it if anything is incorrect or needs updating.
