# Sync Service Guidelines

This directory holds the background worker responsible for synchronizing data with the Clash of Clans API.

- The entry point is `run.py` and most logic lives in `services/`.
- Shared database models and utilities come from the top-level `coclib` package.
- API blueprints are defined under `sync/api` if needed.
- Database migrations are stored in the root `migrations/` directory.

Run `ruff sync` before submitting a pull request.
