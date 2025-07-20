# Codex Guidelines

This monorepo hosts several microservices and a front-end that make up a Clash of Clans dashboard. The key directories are:
- `clan-service/` – Flask API for clan and player data
- `user-service/` – Flask API for user accounts and profiles
- `asset-service/` – Flask API proxy for static assets
- `sync/` – service used to synchronize data from Clash of Clans
- `front-end/` – React dashboard built with Vite
- `coclib/` – shared Python modules for both services
- `db/` – minimal Flask app used solely for running migrations
- `migrations/` – Alembic migration scripts
- `messages-java/` - Chat service implemented in Spring Boot

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
ruff clan-service user-service asset-service sync coclib db

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
- This is a living document. Update it if anything is incorrect or needs updating.

### Issue-creation helper

Only use this helper when an issue # or issue(s) creation request is provided in your prompt.
`create_issues.py` is pre-configured for you. Reference issues in commit message and **not** the PR title for tracking. 
At runtime the container already has:

| Variable | Purpose | Set by |
|----------|---------|--------|
| `CODEX_ISSUES_COC` | Fine-grained PAT with **contents:read** + **issues:write** | start-up script (see below) |
| `DEFAULT_REPO` | Default `<owner>/<repo>` slug for all commands | start-up script |

**Typical calls**

```bash
# Bug report 
python create_issues.py create bug \
  --title "Spinner covers page" \
  --summary "Full-page spinner" \
  --steps "1. Open page" \
  --expected "Only modals should spin"

# Feature request
python create_issues.py create feature \
  --title "Dark mode" \
  --problem "Hard to read" \
  --solution "Provide toggle"

# List / show issues
python create_issues.py list --limit 5
python create_issues.py show 12
