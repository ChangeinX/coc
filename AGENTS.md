# Codex Guidelines

This monorepo hosts several projects that make up a Clash of Clans dashboard. The key directories are:

- `back-end/` – Flask API service
- `sync/` – background worker used to synchronize data
- `front-end/` – React dashboard built with Vite
- `coclib/` – shared Python modules for both services
- `db/` – minimal Flask app used solely for running migrations
- `migrations/` – Alembic migration scripts

Each directory contains its own `AGENTS.md` with project specific notes. Check those files when working in a subfolder.

## Crawling the codebase

- Application code lives under `back-end/app` and `sync/services`.
- Shared models and utilities reside in `coclib`.
- Database migrations are stored in the `migrations` directory at the repo root.

## Testing and checks

Validate changes using:

```bash
# Lint and run tests with Nox
nox -s lint tests

# Lint Python sources manually if needed
ruff back-end sync coclib db

# Install deps and run front-end tests and build
cd front-end
npm install
npm test
npm run build
```

Any lint errors or build failures should fail the PR.

## Development notes

- Keep shared logic in `coclib` rather than duplicating it in other projects.
- Dockerfiles expect Python 3.11 and Node 18+.
- Follow Ruff's default style rules for Python code.
