# Codex Guidelines

This repository is a monorepo containing multiple services and a React front end. It consists of:

- `sync/` – a Python service responsible for synchronizing data
- `back-end/` – the Flask based API service
- `front-end/` – a React dashboard built with Vite
- `coclib/` – common Python modules used by both services
- `migrations/` – Alembic database migrations

## Testing and checks

The project currently has no unit tests. To validate changes, run the following checks:

```bash
# Lint Python sources
ruff back-end sync coclib

# Build the React front end
cd front-end
npm install
npm run build
```

Any lint errors or build failures should fail the PR.

## Development notes

- Keep shared logic in `coclib` rather than duplicating it in `sync` or `back-end`.
- When modifying database models, also run flask db migrate so that `migrations/` reflects the changes.
- Dockerfiles in each subproject expect Python 3.11 and Node 18+.
- Follow Ruff's default style rules for Python code.
