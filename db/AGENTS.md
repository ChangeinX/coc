# DB Helper Guidelines

This small Flask app exists only to run Alembic migrations. Do not place application code here.

- The app factory lives in `app.py` and loads configuration from `coclib.config`.
- All migrations reside in the repository level `migrations/` directory.
- Messages GraphQL schema is defined in `messages.graphql`.

Use `ruff db` to lint this folder before submitting a pull request.
